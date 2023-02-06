import * as helmUtil from './helm-util'
import * as kubectlUtil from './kubectl-util'
import * as komposeUtil from './kompose-util'
import * as utils from './utilities'
import {
   KustomizeRenderEngine,
   KomposeRenderEngine,
   HelmRenderEngine,
   run
} from './bake'
import * as ioUtil from '@actions/io/lib/io-util'
import * as fs from 'fs'
import * as path from 'path'
import * as core from '@actions/core'
import {ExecOptions} from '@actions/exec/lib/interfaces'

var mockStatusCode, stdOutMessage, stdErrMessage
const mockExecFn = jest.fn().mockImplementation((toolPath, args, options) => {
   options.listeners.stdout(!stdOutMessage ? '' : stdOutMessage)
   options.listeners.stderr(!stdErrMessage ? '' : stdErrMessage)
   return mockStatusCode
})
jest.mock('@actions/exec/lib/toolrunner', () => {
   return {
      ToolRunner: jest.fn().mockImplementation((toolPath, args, options) => {
         return {
            exec: () => mockExecFn(toolPath, args, options)
         }
      })
   }
})

describe('Test all functions in run file', () => {
   test("KustomizeRenderEngine() - throw error if kubectl doesn't meet required version", async () => {
      jest
         .spyOn(kubectlUtil, 'getKubectlPath')
         .mockResolvedValue('pathToKubectl')
      const kubectlVersionResponse = {
         stdout: JSON.stringify({
            clientVersion: {
               major: '0',
               minor: '18'
            }
         })
      }
      jest
         .spyOn(utils, 'execCommand')
         .mockResolvedValue(kubectlVersionResponse as utils.ExecResult)

      await expect(new KustomizeRenderEngine().bake(false)).rejects.toThrow(
         'kubectl client version equal to v1.14 or higher is required to use kustomize features'
      )
      expect(kubectlUtil.getKubectlPath).toBeCalled()
      expect(utils.execCommand).toBeCalledWith('pathToKubectl', [
         'version',
         '--client=true',
         '-o',
         'json'
      ])
   })

   test('KustomizeRenderEngine() - validate kubetl and bake using kustomize', async () => {
      jest
         .spyOn(kubectlUtil, 'getKubectlPath')
         .mockResolvedValue('pathToKubectl')
      const responseStdout = JSON.stringify({
         clientVersion: {
            major: '1',
            minor: '18'
         }
      })
      const kubectlVersionResponse = {
         stdout: responseStdout
      }
      const kustomizeResponse = {
         stdout: 'kustomizeOutput'
      }
      jest
         .spyOn(utils, 'execCommand')
         .mockResolvedValueOnce(kubectlVersionResponse as utils.ExecResult)
         .mockResolvedValueOnce(kustomizeResponse as utils.ExecResult)
      jest.spyOn(core, 'getInput').mockImplementation((inputName) => {
         if (inputName == 'kustomizationPath') return 'pathToKustomization'
         if (inputName == 'renderEngine') return 'kustomize'
         if (inputName == 'arguments') return 'additionalArguments'
      })
      jest.spyOn(ioUtil, 'exists').mockResolvedValue(true)
      jest.spyOn(fs, 'writeFileSync').mockImplementation()
      process.env['RUNNER_TEMP'] = 'tempDir'
      jest.spyOn(utils, 'getCurrentTime').mockReturnValue(12345678)
      jest.spyOn(core, 'debug').mockImplementation()
      jest.spyOn(core, 'setOutput').mockImplementation()
      jest.spyOn(console, 'log').mockImplementation()

      expect(await new KustomizeRenderEngine().bake(true)).toBeUndefined()
      expect(kubectlUtil.getKubectlPath).toBeCalled()

      expect(utils.execCommand).toBeCalledWith('pathToKubectl', [
         'version',
         '--client=true',
         '-o',
         'json'
      ])
      expect(utils.execCommand).toBeCalledWith(
         'pathToKubectl',
         ['kustomize', 'pathToKustomization', 'additionalArguments'],
         {silent: true} as ExecOptions
      )

      expect(core.getInput).toBeCalledWith('kustomizationPath', {
         required: true
      })
      expect(fs.writeFileSync).toBeCalledWith(
         path.join('tempDir', 'baked-template-12345678.yaml'),
         'kustomizeOutput'
      )
      expect(core.setOutput).toBeCalledWith(
         'manifestsBundle',
         path.join('tempDir', 'baked-template-12345678.yaml')
      )
   })

   test('KustomizeRenderEngine() - multiple additional arguments with leading/trailing spaces', async () => {
      jest
         .spyOn(kubectlUtil, 'getKubectlPath')
         .mockResolvedValue('pathToKubectl')
      const kubectlVersionResponse = {
         stdout: JSON.stringify({
            clientVersion: {
               major: '1',
               minor: '18'
            }
         })
      }
      const kustomizeResponse = {
         stdout: 'kustomizeOutput'
      }
      jest
         .spyOn(utils, 'execCommand')
         .mockResolvedValue(kubectlVersionResponse as utils.ExecResult)
      jest.spyOn(core, 'getInput').mockImplementation((inputName, options) => {
         if (inputName == 'kustomizationPath') return 'pathToKustomization'
         if (inputName == 'renderEngine') return 'kustomize'
         if (inputName == 'arguments') return ' additional \n  Arguments  '
      })
      jest.spyOn(ioUtil, 'exists').mockResolvedValue(true)
      jest.spyOn(fs, 'writeFileSync').mockImplementation()
      process.env['RUNNER_TEMP'] = 'tempDir'
      jest.spyOn(utils, 'getCurrentTime').mockReturnValue(12345678)
      jest.spyOn(core, 'debug').mockImplementation()
      jest.spyOn(core, 'setOutput').mockImplementation()
      jest.spyOn(console, 'log').mockImplementation()

      expect(await new KustomizeRenderEngine().bake(true)).toBeUndefined()
      expect(kubectlUtil.getKubectlPath).toBeCalled()
      expect(utils.execCommand).toBeCalledWith('pathToKubectl', [
         'version',
         '--client=true',
         '-o',
         'json'
      ])
      expect(utils.execCommand).toBeCalledWith(
         'pathToKubectl',
         ['kustomize', 'pathToKustomization', 'additional', 'Arguments'],
         {silent: true} as ExecOptions
      )
   })

   test('KustomizeRenderEngine() - multiple additional argument', async () => {
      jest
         .spyOn(kubectlUtil, 'getKubectlPath')
         .mockResolvedValue('pathToKubectl')
      const kubectlVersionResponse = {
         stdout: JSON.stringify({
            clientVersion: {
               major: '1',
               minor: '18'
            }
         })
      }
      const kustomizeResponse = {
         stdout: 'kustomizeOutput'
      }
      jest
         .spyOn(utils, 'execCommand')
         .mockResolvedValueOnce(kubectlVersionResponse as utils.ExecResult)
         .mockResolvedValueOnce(kustomizeResponse as utils.ExecResult)
      jest.spyOn(core, 'getInput').mockImplementation((inputName, options) => {
         if (inputName == 'kustomizationPath') return 'pathToKustomization'
         if (inputName == 'renderEngine') return 'kustomize'
         if (inputName == 'arguments')
            return 'add1 tional,\nArguments\nnore\nargu ments'
      })
      jest.spyOn(ioUtil, 'exists').mockResolvedValue(true)
      jest.spyOn(fs, 'writeFileSync').mockImplementation()
      process.env['RUNNER_TEMP'] = 'tempDir'
      jest.spyOn(utils, 'getCurrentTime').mockReturnValue(12345678)
      jest.spyOn(core, 'debug').mockImplementation()
      jest.spyOn(core, 'setOutput').mockImplementation()
      jest.spyOn(console, 'log').mockImplementation()

      expect(await new KustomizeRenderEngine().bake(true)).toBeUndefined()
      expect(kubectlUtil.getKubectlPath).toBeCalled()
      expect(utils.execCommand).toBeCalledWith('pathToKubectl', [
         'version',
         '--client=true',
         '-o',
         'json'
      ])
      expect(utils.execCommand).toBeCalledWith(
         'pathToKubectl',
         [
            'kustomize',
            'pathToKustomization',
            'add1 tional',
            'Arguments',
            'nore',
            'argu ments'
         ],
         {silent: true} as ExecOptions
      )
   })

   test('KomposeRenderEngine() - throw error if unable to find temp directory', async () => {
      jest.spyOn(core, 'getInput').mockReturnValue('pathToKompose')
      jest.spyOn(ioUtil, 'exists').mockResolvedValue(true)
      jest
         .spyOn(komposeUtil, 'getKomposePath')
         .mockResolvedValue('pathToKompose')
      process.env['RUNNER_TEMP'] = ''
      jest.spyOn(utils, 'getCurrentTime').mockReturnValue(12345678)
      jest.spyOn(core, 'debug').mockImplementation()
      jest.spyOn(console, 'log').mockImplementation()

      await expect(new KomposeRenderEngine().bake(false)).rejects.toThrow(
         'Unable to create temp directory.'
      )
      expect(komposeUtil.getKomposePath).toBeCalled()
   })

   test('KomposeRenderEngine() - bake using kompose', async () => {
      jest.spyOn(core, 'getInput').mockReturnValue('pathToDockerCompose')
      jest.spyOn(ioUtil, 'exists').mockResolvedValue(true)
      jest
         .spyOn(komposeUtil, 'getKomposePath')
         .mockResolvedValue('pathToKompose')
      process.env['RUNNER_TEMP'] = 'tempDir'
      jest.spyOn(utils, 'getCurrentTime').mockReturnValue(12345678)
      jest.spyOn(core, 'setOutput').mockImplementation()

      expect(await new KomposeRenderEngine().bake(true)).toBeUndefined()
      expect(komposeUtil.getKomposePath).toBeCalled()
      expect(utils.execCommand).toBeCalledWith(
         'pathToKompose',
         [
            'convert',
            '-f',
            'pathToDockerCompose',
            '-o',
            path.join('tempDir', 'baked-template-12345678.yaml')
         ],
         {silent: true}
      )
      expect(core.setOutput).toBeCalledWith(
         'manifestsBundle',
         path.join('tempDir', 'baked-template-12345678.yaml')
      )
   })

   test('run() - throw error on wrong input from render-engine', async () => {
      jest.spyOn(core, 'getInput').mockReturnValue('someRenderEngine')
      jest.spyOn(core, 'setFailed').mockImplementation(() => {})

      await expect(run()).rejects.toThrow('Unknown render engine')
      expect(core.setFailed).toBeCalledWith('Unknown render engine')
   })

   test('run() - throw error if bake fails', async () => {
      jest.spyOn(core, 'getInput').mockImplementation((inputName, options) => {
         if (inputName == 'renderEngine') return 'kompose'
         if (inputName == 'dockerComposeFile') return 'pathToDockerComposeFile'
      })
      jest.spyOn(ioUtil, 'exists').mockResolvedValue(true)
      jest
         .spyOn(komposeUtil, 'getKomposePath')
         .mockResolvedValue('pathToKompose')
      process.env['RUNNER_TEMP'] = ''
      jest.spyOn(utils, 'getCurrentTime').mockReturnValue(12345678)
      jest.spyOn(core, 'setFailed').mockImplementation(() => {})

      await expect(run()).rejects.toThrow(
         'Failed to run bake action. Error: Error: Unable to create temp directory.'
      )
      expect(core.setFailed).toBeCalledWith(
         expect.stringContaining(
            'Failed to run bake action. Error: Error: Unable to create temp directory.'
         )
      )
   })

   test('HelmRenderEngine() - bake manifest using helm', async () => {
      jest.spyOn(helmUtil, 'getHelmPath').mockResolvedValue('pathToHelm')
      jest.spyOn(core, 'getInput').mockImplementation((inputName, options) => {
         if (inputName == 'helmChart') return 'pathToHelmChart'
         if (inputName == 'releaseName') return 'releaseName'
         if (inputName == 'renderEngine') return 'helm'
      })
      jest.spyOn(console, 'log').mockImplementation()
      mockStatusCode = 0
      stdOutMessage = 'v2.9.1'
      process.env['RUNNER_TEMP'] = 'tempDirPath'
      jest.spyOn(fs, 'writeFileSync').mockImplementation()
      jest.spyOn(utils, 'getCurrentTime').mockReturnValue(12345678)
      jest.spyOn(core, 'setOutput').mockImplementation()

      const execResult = {
         stdout: 'test output'
      }
      jest
         .spyOn(utils, 'execCommand')
         .mockResolvedValue(execResult as utils.ExecResult)

      expect(await new HelmRenderEngine().bake(true)).toBeUndefined()
      expect(utils.execCommand).toBeCalledWith(
         'pathToHelm',
         ['dependency', 'update', 'pathToHelmChart'],
         {silent: true}
      )
      expect(utils.execCommand).toBeCalledWith(
         'pathToHelm',
         ['version', '--template', '{{.Version}}'],
         {silent: true}
      )
      expect(utils.execCommand).toBeCalledWith(
         'pathToHelm',
         [
            'init',
            '--client-only',
            '--stable-repo-url',
            'https://charts.helm.sh/stable'
         ],
         {silent: true}
      )
      expect(core.setOutput).toBeCalledWith(
         'manifestsBundle',
         path.join('tempDirPath', 'baked-template-12345678.yaml')
      )
   })

   test('HelmRenderEngine() - single additional argument', async () => {
      process.env['INPUT_RENDERENGINE'] = 'helm'
      jest.spyOn(helmUtil, 'getHelmPath').mockResolvedValue('pathToHelm')
      jest.spyOn(core, 'getInput').mockImplementation((inputName, options) => {
         if (inputName == 'helmChart') return 'pathToHelmChart'
         if (inputName == 'arguments') return 'additionalArguments'
         if (inputName == 'releaseName') return 'releaseName'
         if (inputName == 'renderEngine') return 'helm'
      })
      jest.spyOn(console, 'log').mockImplementation()
      mockStatusCode = 0
      stdOutMessage = 'v2.9.1'
      process.env['RUNNER_TEMP'] = 'tempDirPath'
      jest.spyOn(fs, 'writeFileSync').mockImplementation()
      jest.spyOn(utils, 'getCurrentTime').mockReturnValue(12345678)
      jest.spyOn(core, 'setOutput').mockImplementation()

      const execResult = {
         stdout: 'test output'
      }
      jest
         .spyOn(utils, 'execCommand')
         .mockResolvedValue(execResult as utils.ExecResult)

      expect(await new HelmRenderEngine().bake(true)).toBeUndefined()
      expect(utils.execCommand).toBeCalledWith(
         'pathToHelm',
         ['dependency', 'update', 'pathToHelmChart'],
         {silent: true}
      )
      expect(utils.execCommand).toBeCalledWith(
         'pathToHelm',
         ['version', '--template', '{{.Version}}'],
         {silent: true}
      )
      expect(utils.execCommand).toBeCalledWith(
         'pathToHelm',
         [
            'template',
            'additionalArguments',
            '--name',
            'releaseName',
            'pathToHelmChart'
         ],
         {silent: true}
      )
   })

   test('HelmRenderEngine() - multiple additional arguments', async () => {
      process.env['INPUT_RENDERENGINE'] = 'helm'
      jest.spyOn(helmUtil, 'getHelmPath').mockResolvedValue('pathToHelm')
      jest.spyOn(core, 'getInput').mockImplementation((inputName, options) => {
         if (inputName == 'helmChart') return 'pathToHelmChart'
         if (inputName == 'arguments') return 'additional\nArguments'
         if (inputName == 'releaseName') return 'releaseName'
         if (inputName == 'renderEngine') return 'helm'
      })
      jest.spyOn(console, 'log').mockImplementation()
      mockStatusCode = 0
      stdOutMessage = 'v2.9.1'
      process.env['RUNNER_TEMP'] = 'tempDirPath'
      jest.spyOn(fs, 'writeFileSync').mockImplementation()
      jest.spyOn(utils, 'getCurrentTime').mockReturnValue(12345678)
      jest.spyOn(core, 'setOutput').mockImplementation()

      const execResult = {
         stdout: 'test output'
      }
      jest
         .spyOn(utils, 'execCommand')
         .mockResolvedValue(execResult as utils.ExecResult)

      expect(await new HelmRenderEngine().bake(true)).toBeUndefined()
      expect(utils.execCommand).toBeCalledWith(
         'pathToHelm',
         ['version', '--template', '{{.Version}}'],
         {silent: true}
      )
      expect(utils.execCommand).toBeCalledWith(
         'pathToHelm',
         [
            'init',
            '--client-only',
            '--stable-repo-url',
            'https://charts.helm.sh/stable'
         ],
         {silent: true}
      )
      expect(utils.execCommand).toBeCalledWith(
         'pathToHelm',
         [
            'template',
            'additional',
            'Arguments',
            '--name',
            'releaseName',
            'pathToHelmChart'
         ],
         {silent: true}
      )
   })

   test('HelmRenderEngine() - no additional arguments', async () => {
      process.env['INPUT_RENDERENGINE'] = 'helm'
      jest.spyOn(helmUtil, 'getHelmPath').mockResolvedValue('pathToHelm')
      jest.spyOn(core, 'getInput').mockImplementation((inputName, options) => {
         if (inputName == 'helmChart') return 'pathToHelmChart'
         if (inputName == 'arguments') return ''
         if (inputName == 'releaseName') return 'releaseName'
         if (inputName == 'renderEngine') return 'helm'
      })
      jest.spyOn(console, 'log').mockImplementation()
      mockStatusCode = 0
      stdOutMessage = 'v2.9.1'
      process.env['RUNNER_TEMP'] = 'tempDirPath'
      jest.spyOn(fs, 'writeFileSync').mockImplementation()
      jest.spyOn(utils, 'getCurrentTime').mockReturnValue(12345678)
      jest.spyOn(core, 'setOutput').mockImplementation()

      const execResult = {
         stdout: 'test output'
      }
      jest
         .spyOn(utils, 'execCommand')
         .mockResolvedValue(execResult as utils.ExecResult)

      expect(await new HelmRenderEngine().bake(true)).toBeUndefined()
      expect(utils.execCommand).toBeCalledWith(
         'pathToHelm',
         ['version', '--template', '{{.Version}}'],
         {silent: true}
      )
      expect(utils.execCommand).toBeCalledWith(
         'pathToHelm',
         [
            'init',
            '--client-only',
            '--stable-repo-url',
            'https://charts.helm.sh/stable'
         ],
         {silent: true}
      )
      expect(utils.execCommand).toBeCalledWith(
         'pathToHelm',
         ['template', '--name', 'releaseName', 'pathToHelmChart'],
         {silent: true}
      )
   })
})
