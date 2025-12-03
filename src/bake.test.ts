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
import {ExecOptions} from '@actions/exec'

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
   afterEach(() => jest.restoreAllMocks())

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
      expect(kubectlUtil.getKubectlPath).toHaveBeenCalled()
      expect(utils.execCommand).toHaveBeenCalledWith('pathToKubectl', [
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
      expect(kubectlUtil.getKubectlPath).toHaveBeenCalled()

      expect(utils.execCommand).toHaveBeenCalledWith('pathToKubectl', [
         'version',
         '--client=true',
         '-o',
         'json'
      ])
      expect(utils.execCommand).toHaveBeenCalledWith(
         'pathToKubectl',
         ['kustomize', 'pathToKustomization', 'additionalArguments'],
         {silent: true} as ExecOptions
      )

      expect(core.getInput).toHaveBeenCalledWith('kustomizationPath', {
         required: true
      })
      expect(fs.writeFileSync).toHaveBeenCalledWith(
         path.join('tempDir', 'baked-template-12345678.yaml'),
         'kustomizeOutput'
      )
      expect(core.setOutput).toHaveBeenCalledWith(
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
      expect(kubectlUtil.getKubectlPath).toHaveBeenCalled()
      expect(utils.execCommand).toHaveBeenCalledWith('pathToKubectl', [
         'version',
         '--client=true',
         '-o',
         'json'
      ])
      expect(utils.execCommand).toHaveBeenCalledWith(
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
      expect(kubectlUtil.getKubectlPath).toHaveBeenCalled()
      expect(utils.execCommand).toHaveBeenCalledWith('pathToKubectl', [
         'version',
         '--client=true',
         '-o',
         'json'
      ])
      expect(utils.execCommand).toHaveBeenCalledWith(
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
      expect(komposeUtil.getKomposePath).toHaveBeenCalled()
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
      jest.spyOn(utils, 'execCommand').mockResolvedValue({
         code: 0,
         stdout: 'kompose output',
         stderr: ''
      } as any)

      expect(await new KomposeRenderEngine().bake(true)).toBeUndefined()
      expect(komposeUtil.getKomposePath).toHaveBeenCalled()
      expect(utils.execCommand).toHaveBeenCalledWith(
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
      expect(core.setOutput).toHaveBeenCalledWith(
         'manifestsBundle',
         path.join('tempDir', 'baked-template-12345678.yaml')
      )
   })

   test('run() - throw error on wrong input from render-engine', async () => {
      jest.spyOn(core, 'getInput').mockReturnValue('someRenderEngine')
      jest.spyOn(core, 'setFailed').mockImplementation(() => {})

      await expect(run()).rejects.toThrow('Unknown render engine')
      expect(core.setFailed).toHaveBeenCalledWith('Unknown render engine')
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
      expect(core.setFailed).toHaveBeenCalledWith(
         expect.stringContaining(
            'Failed to run bake action. Error: Error: Unable to create temp directory.'
         )
      )
   })

   test('HelmRenderEngine() - bake manifest using helm', async () => {
      jest.spyOn(helmUtil, 'getHelmPath').mockResolvedValue('pathToHelm')
      jest.spyOn(core, 'getInput').mockImplementation((inputName, options) => {
         if (inputName == 'helmChart') return 'pathToHelmChart'
         if (inputName == 'overrides') return 'replicas=2'
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
      const warnSpy = jest.spyOn(core, 'warning').mockImplementation()

      const execResult = {
         stdout: 'test output'
      }
      jest
         .spyOn(utils, 'execCommand')
         .mockResolvedValue(execResult as utils.ExecResult)

      expect(await new HelmRenderEngine().bake(true)).toBeUndefined()
      expect(utils.execCommand).toHaveBeenCalledWith(
         'pathToHelm',
         ['dependency', 'update', 'pathToHelmChart'],
         {silent: true}
      )
      expect(utils.execCommand).toHaveBeenCalledWith(
         'pathToHelm',
         ['version', '--template', '{{.Version}}'],
         {silent: true}
      )
      expect(utils.execCommand).toHaveBeenCalledWith(
         'pathToHelm',
         [
            'init',
            '--client-only',
            '--stable-repo-url',
            'https://charts.helm.sh/stable'
         ],
         {silent: true}
      )
      expect(core.setOutput).toHaveBeenCalledWith(
         'manifestsBundle',
         path.join('tempDirPath', 'baked-template-12345678.yaml')
      )
      expect(warnSpy).toHaveBeenCalledWith(
         expect.stringContaining(
            "is missing a ':' separator. Please use the format key:value."
         )
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
      expect(utils.execCommand).toHaveBeenCalledWith(
         'pathToHelm',
         ['dependency', 'update', 'pathToHelmChart'],
         {silent: true}
      )
      expect(utils.execCommand).toHaveBeenCalledWith(
         'pathToHelm',
         ['version', '--template', '{{.Version}}'],
         {silent: true}
      )
      expect(utils.execCommand).toHaveBeenCalledWith(
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
      expect(utils.execCommand).toHaveBeenCalledWith(
         'pathToHelm',
         ['version', '--template', '{{.Version}}'],
         {silent: true}
      )
      expect(utils.execCommand).toHaveBeenCalledWith(
         'pathToHelm',
         [
            'init',
            '--client-only',
            '--stable-repo-url',
            'https://charts.helm.sh/stable'
         ],
         {silent: true}
      )
      expect(utils.execCommand).toHaveBeenCalledWith(
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
      expect(utils.execCommand).toHaveBeenCalledWith(
         'pathToHelm',
         ['version', '--template', '{{.Version}}'],
         {silent: true}
      )
      expect(utils.execCommand).toHaveBeenCalledWith(
         'pathToHelm',
         [
            'init',
            '--client-only',
            '--stable-repo-url',
            'https://charts.helm.sh/stable'
         ],
         {silent: true}
      )
      expect(utils.execCommand).toHaveBeenCalledWith(
         'pathToHelm',
         ['template', '--name', 'releaseName', 'pathToHelmChart'],
         {silent: true}
      )
   })

   test.each<[string, string, boolean]>([
      // Valid versions
      ['v2.17.0', 'v2 legacy', false],
      ['v3.0.0', 'v3 minimum', true],
      ['v3.19.0', 'v3 latest', true],
      ['v4.0.1', 'v4 latest', true],
      ['v5.0.0', 'v5 future', true],

      // Invalid versions (fall back to legacy behavior)
      ['invalid-version', 'invalid string', false],
      ['', 'empty string', false],
      ['xyz.1.2', 'unparseable major', false]
   ])(
      'HelmRenderEngine() - helm %s (%s) uses correct init and template behavior',
      async (version, _description, isModernHelm) => {
         jest.spyOn(helmUtil, 'getHelmPath').mockResolvedValue('pathToHelm')
         jest.spyOn(core, 'getInput').mockImplementation((inputName) => {
            if (inputName === 'helmChart') return 'pathToHelmChart'
            if (inputName === 'releaseName') return 'releaseName'
            if (inputName === 'renderEngine') return 'helm'
            return ''
         })
         jest.spyOn(console, 'log').mockImplementation()
         jest.spyOn(core, 'warning').mockImplementation()
         process.env['RUNNER_TEMP'] = 'tempDirPath'
         jest.spyOn(fs, 'writeFileSync').mockImplementation()
         jest.spyOn(utils, 'getCurrentTime').mockReturnValue(12345678)
         jest.spyOn(core, 'setOutput').mockImplementation()

         jest
            .spyOn(utils, 'execCommand')
            .mockImplementation(async (path, args) => {
               if (args.includes('version')) {
                  return {stdout: version, stderr: '', code: 0}
               }
               return {stdout: 'template output', stderr: '', code: 0}
            })

         await new HelmRenderEngine().bake(true)

         if (isModernHelm) {
            // v3+: init should NOT be called
            expect(utils.execCommand).not.toHaveBeenCalledWith(
               'pathToHelm',
               expect.arrayContaining(['init']),
               expect.anything()
            )
            // v3+: template uses positional releaseName
            expect(utils.execCommand).toHaveBeenCalledWith(
               'pathToHelm',
               ['template', 'releaseName', 'pathToHelmChart'],
               {silent: true}
            )
         } else {
            // v2 or invalid: init SHOULD be called
            expect(utils.execCommand).toHaveBeenCalledWith(
               'pathToHelm',
               [
                  'init',
                  '--client-only',
                  '--stable-repo-url',
                  'https://charts.helm.sh/stable'
               ],
               {silent: true}
            )
            // v2 or invalid: template uses --name flag
            expect(utils.execCommand).toHaveBeenCalledWith(
               'pathToHelm',
               ['template', '--name', 'releaseName', 'pathToHelmChart'],
               {silent: true}
            )
         }
      }
   )
})
