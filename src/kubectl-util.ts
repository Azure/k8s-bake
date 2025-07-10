// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as path from 'path'
import * as fs from 'fs'
import * as util from 'util'
import * as toolCache from '@actions/tool-cache'
import * as core from '@actions/core'
import * as io from '@actions/io'
import {
   getExecutableExtension,
   isEqual,
   LATEST,
   setCachedToolPath,
   getStableVerison
} from './utilities'

const kubectlToolName = 'kubectl'

export async function downloadKubectl(version: string): Promise<string> {
   if (!version) {
      version = await getStableVerison(kubectlToolName)
   }
   let cachedToolpath = toolCache.find(kubectlToolName, version)

   if (!cachedToolpath) {
      cachedToolpath = await setCachedToolPath(kubectlToolName, version)
   }

   const kubectlPath = path.join(
      cachedToolpath,
      kubectlToolName + getExecutableExtension()
   )
   fs.chmodSync(kubectlPath, '777')
   return kubectlPath
}

export async function getKubectlPath() {
   let kubectlPath = ''
   const version = core.getInput('kubectl-version', {required: false})
   if (version) {
      if (!!version && version != LATEST) {
         const cachedToolPath = toolCache.find(kubectlToolName, version)
         if (!cachedToolPath) {
            kubectlPath = path.join(
               cachedToolPath,
               kubectlToolName + getExecutableExtension()
            )
         }
      }

      if (!kubectlPath) {
         kubectlPath = await installKubectl(version)
      }
   } else {
      kubectlPath = await io.which(kubectlToolName, false)
      if (!kubectlPath) {
         const allVersions = toolCache.findAllVersions(kubectlToolName)
         kubectlPath =
            allVersions.length > 0
               ? toolCache.find(kubectlToolName, allVersions[0])
               : ''
         if (!kubectlPath) {
            throw new Error(
               'Kubectl is not installed, either add install-kubectl action or provide "kubectl-version" input to download kubectl'
            )
         }
         kubectlPath = path.join(
            kubectlPath,
            `kubectl${getExecutableExtension()}`
         )
      }
   }

   return kubectlPath
}

export async function installKubectl(version: string) {
   if (isEqual(version, LATEST)) {
      version = await getStableVerison(kubectlToolName)
   }
   core.debug(util.format('Downloading kubectl version %s', version))
   return await downloadKubectl(version)
}
