// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as core from '@actions/core'
import * as ioUtil from '@actions/io/lib/io-util'
import {ExecOptions} from '@actions/exec/lib/interfaces'
import * as utilities from './utilities'
import * as path from 'path'
import * as fs from 'fs'
import * as util from 'util'
import {getHelmPath, NameValuePair} from './helm-util'
import {getKubectlPath} from './kubectl-util'
import {getKomposePath} from './kompose-util'

abstract class RenderEngine {
   public bake!: (isSilent: boolean) => Promise<any>
   protected getTemplatePath = () => {
      const tempDirectory = process.env['RUNNER_TEMP']
      if (!!tempDirectory) {
         return path.join(
            tempDirectory,
            'baked-template-' + utilities.getCurrentTime().toString() + '.yaml'
         )
      } else {
         throw Error('Unable to create temp directory.')
      }
   }
}

export class HelmRenderEngine extends RenderEngine {
   public bake = async (isSilent: boolean): Promise<any> => {
      const helmPath = await getHelmPath()
      const chartPath = core.getInput('helmChart', {required: true})

      const options = {
         silent: isSilent
      } as ExecOptions

      const dependencyArgs = this.getDependencyArgs(chartPath)

      console.log('Running helm dependency update command..')
      await utilities.execCommand(helmPath, dependencyArgs, options)

      console.log('Getting helm version..')
      let isV3 = true
      await this.isHelmV3(helmPath)
         .then((result) => {
            isV3 = result
         })
         .catch(() => {
            isV3 = false
         })

      try {
         if (!isV3) {
            await utilities.execCommand(
               helmPath,
               [
                  'init',
                  '--client-only',
                  '--stable-repo-url',
                  'https://charts.helm.sh/stable'
               ],
               options
            )
         }
      } catch (ex) {
         core.warning(util.format('Could not run helm init command: ', ex))
      }

      console.log('Creating the template argument string..')
      const args = await this.getHelmTemplateArgs(chartPath, isV3)

      console.log('Running helm template command..')
      const result = await utilities.execCommand(helmPath, args, options)

      const pathToBakedManifest = this.getTemplatePath()
      fs.writeFileSync(pathToBakedManifest, result.stdout)
      core.setOutput('manifestsBundle', pathToBakedManifest)
   }

   private getOverrideValues(overrides: string[]) {
      const overrideValues: NameValuePair[] = []
      overrides.forEach((arg) => {
         const overrideInput = arg.split(':')
         const overrideName = overrideInput[0]
         const overrideValue = overrideInput.slice(1).join(':')
         overrideValues.push({
            name: overrideName,
            value: overrideValue
         } as NameValuePair)
      })

      return overrideValues
   }

   private getDependencyArgs(chartPath: string): string[] {
      let args: string[] = []
      args.push('dependency')
      args.push('update')
      args.push(chartPath)

      return args
   }

   private async getHelmTemplateArgs(
      chartPath: string,
      isV3: boolean
   ): Promise<string[]> {
      const releaseName = core.getInput('releaseName', {required: false})
      let args: string[] = []
      args.push('template')
      const templateArgs = await getTemplateArguments()
      args = args.concat(templateArgs)

      const namespace = core.getInput('namespace', {required: false})
      if (namespace) {
         args.push('--namespace')
         args.push(namespace)
      }

      if (isV3) {
         if (releaseName) {
            args.push(releaseName)
         }
      } else {
         if (releaseName) {
            args.push('--name')
            args.push(releaseName)
         }
      }
      args.push(chartPath)

      const overrideFilesInput = core.getInput('overrideFiles', {
         required: false
      })
      if (!!overrideFilesInput) {
         core.debug('Adding overrides file inputs')
         const overrideFiles = overrideFilesInput.split('\n')
         if (overrideFiles.length > 0) {
            overrideFiles.forEach((file) => {
               args.push('-f')
               args.push(file)
            })
         }
      }

      const overridesInput = core.getInput('overrides', {required: false})
      if (!!overridesInput) {
         core.debug('Adding overrides inputs')
         const overrides = overridesInput.split('\n')
         if (overrides.length > 0) {
            const overrideValues = this.getOverrideValues(overrides)
            overrideValues.forEach((overrideValue) => {
               args.push('--set')
               args.push(`${overrideValue.name}=${overrideValue.value}`)
            })
         }
      }
      return args
   }

   private async isHelmV3(path: string) {
      let result = await utilities.execCommand(
         path,
         ['version', '--template', '{{.Version}}'],
         {silent: true}
      )
      return result.stdout.split('.')[0] === 'v3'
   }
}

export class KomposeRenderEngine extends RenderEngine {
   public bake = async (isSilent: boolean): Promise<any> => {
      const dockerComposeFilePath = core.getInput('dockerComposeFile', {
         required: true
      })
      if (!ioUtil.exists(dockerComposeFilePath)) {
         throw Error(
            util.format(
               'Docker compose file path %s does not exist. Please check the path specified',
               dockerComposeFilePath
            )
         )
      }

      const options = {
         silent: isSilent
      } as ExecOptions

      const komposePath = await getKomposePath()
      const pathToBakedManifest = this.getTemplatePath()
      core.debug('Running kompose command..')
      await utilities.execCommand(
         komposePath,
         ['convert', '-f', dockerComposeFilePath, '-o', pathToBakedManifest],
         options
      )
      core.setOutput('manifestsBundle', pathToBakedManifest)
   }
}

export class KustomizeRenderEngine extends RenderEngine {
   public bake = async (isSilent: boolean) => {
      const kubectlPath = await getKubectlPath()
      await this.validateKustomize(kubectlPath)
      const kustomizationPath = core.getInput('kustomizationPath', {
         required: true
      })
      if (!ioUtil.exists(kustomizationPath)) {
         throw Error(
            util.format(
               'kustomizationPath %s does not exist. Please check whether file exists or not.',
               kustomizationPath
            )
         )
      }

      const options = {
         silent: isSilent
      } as ExecOptions

      core.info('Creating the template argument string..')
      let tempArgs = ['kustomize', kustomizationPath]
      const userargs = await getTemplateArguments()
      tempArgs = tempArgs.concat(userargs)

      core.debug('Running kubectl kustomize command..')
      console.log(
         `[command] ${kubectlPath} kustomize ${core.getInput(
            'kustomizationPath'
         )}`
      )
      const result = await utilities.execCommand(kubectlPath, tempArgs, options)
      const pathToBakedManifest = this.getTemplatePath()
      fs.writeFileSync(pathToBakedManifest, result.stdout)
      core.setOutput('manifestsBundle', pathToBakedManifest)
   }

   private async validateKustomize(kubectlPath: string) {
      const result = await utilities.execCommand(kubectlPath, [
         'version',
         '--client=true',
         '-o',
         'json'
      ])
      if (!!result.stdout) {
         const clientVersion = JSON.parse(result.stdout).clientVersion
         const versionNumber = `${clientVersion.major}.${clientVersion.minor}`
         if (
            !clientVersion ||
            parseFloat(versionNumber) <
               parseFloat(utilities.MIN_KUBECTL_CLIENT_VERSION)
         ) {
            throw new Error(
               'kubectl client version equal to v1.14 or higher is required to use kustomize features'
            )
         }
      }
   }
}

async function getTemplateArguments() {
   const args: string[] = []
   const additionalArgs = core.getInput('arguments', {required: false})
   if (!!additionalArgs) {
      const argumentArray = additionalArgs
         .split(/[\n,;]+/) // split into each line
         .map((manifest) => manifest.trim()) // remove surrounding whitespace
         .filter((manifest) => manifest.length > 0) // remove any blanks
      if (argumentArray.length > 0) {
         argumentArray.forEach((arg) => {
            args.push(arg)
         })
      }
   }
   return args
}

export async function run() {
   const renderType = core.getInput('renderEngine', {required: true})
   let renderEngine: RenderEngine
   switch (renderType) {
      case 'helm':
      case 'helm2':
         renderEngine = new HelmRenderEngine()
         break
      case 'kompose':
         renderEngine = new KomposeRenderEngine()
         break
      case 'kustomize':
         renderEngine = new KustomizeRenderEngine()
         break
      default:
         throw Error('Unknown render engine')
   }

   let isSilent = core.getInput('silent', {required: false}) === 'true'

   try {
      await renderEngine.bake(isSilent)
   } catch (err) {
      throw Error(util.format('Failed to run bake action. Error: %s', err))
   }
}

run().catch(core.setFailed)
