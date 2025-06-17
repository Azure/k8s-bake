import * as os from 'os'
import * as fs from 'fs'
import * as toolCache from '@actions/tool-cache'
import {ExecOptions} from '@actions/exec'
import * as core from '@actions/core'
import * as utils from './utilities'

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

describe('Test all functions in utilities file', () => {
   test('isEqual() - ', () => {
      expect(utils.isEqual('', null)).toBeTruthy()
      expect(utils.isEqual('a', 'A')).toBeTruthy()
      expect(utils.isEqual(null, 'a')).toBeFalsy()
   })

   test('getExecutableExtension() - return .exe when os is Windows', () => {
      jest.spyOn(os, 'type').mockReturnValue('Windows_NT')

      expect(utils.getExecutableExtension()).toBe('.exe')
      expect(os.type).toHaveBeenCalled()
   })

   test('getExecutableExtension() - return empty string for non-windows OS', () => {
      jest.spyOn(os, 'type').mockReturnValue('Darwin')

      expect(utils.getExecutableExtension()).toBe('')
      expect(os.type).toHaveBeenCalled()
   })

   test('execCommand() - generate and throw error if non-zero code is returned with empty stderr', async () => {
      mockStatusCode = 1
      stdOutMessage = ''
      stdErrMessage = ''

      await expect(
         utils.execCommand('cd', ['nonEsistingDirectory'])
      ).rejects.toThrow('cd exited with result code 1')
   })

   test('execCommand() - throw stderr if non zero code is returned', async () => {
      mockStatusCode = 1
      stdOutMessage = ''
      stdErrMessage = "Directory doesn't exist"
      await expect(
         utils.execCommand('cd', ['nonEsistingDirectory'], {} as ExecOptions)
      ).rejects.toThrow("Directory doesn't exist")
   })

   test('execCommand() - return ExecOptions type object with stdout if exit code is 0', async () => {
      mockStatusCode = 0
      stdOutMessage = 'list of files'
      stdErrMessage = ''
      expect(
         await utils.execCommand('ls', [], {} as ExecOptions)
      ).toMatchObject({stderr: '', stdout: 'list of files'})
   })

   test('getDownloadUrl() - return the URL to download helm for Linux_x64', () => {
      jest.spyOn(os, 'type').mockReturnValue('Linux')
      jest.spyOn(os, 'arch').mockReturnValue('x64')
      const helmLinuxUrl = 'https://get.helm.sh/helm-v3.2.1-linux-amd64.zip'

      expect(utils.getDownloadUrl('helm', 'v3.2.1')).toBe(helmLinuxUrl)
      expect(os.type).toHaveBeenCalled()
      expect(os.arch).toHaveBeenCalled()
   })

   test('getDownloadUrl() - return the URL to download helm for Linux_arm64', () => {
      jest.spyOn(os, 'type').mockReturnValue('Linux')
      jest.spyOn(os, 'arch').mockReturnValue('arm64')
      const helmLinuxUrl = 'https://get.helm.sh/helm-v3.2.1-linux-arm64.zip'

      expect(utils.getDownloadUrl('helm', 'v3.2.1')).toBe(helmLinuxUrl)
      expect(os.type).toHaveBeenCalled()
      expect(os.arch).toHaveBeenCalled()
   })

   test('getDownloadUrl() - return the URL to download helm for Darwin', () => {
      jest.spyOn(os, 'type').mockReturnValue('Darwin')
      const helmDarwinUrl = 'https://get.helm.sh/helm-v3.2.1-darwin-amd64.zip'

      expect(utils.getDownloadUrl('helm', 'v3.2.1')).toBe(helmDarwinUrl)
      expect(os.type).toHaveBeenCalled()
   })

   test('getDownloadUrl() - return the URL to download helm for Windows', () => {
      jest.spyOn(os, 'type').mockReturnValue('Windows_NT')

      const helmWindowsUrl = 'https://get.helm.sh/helm-v3.2.1-windows-amd64.zip'
      expect(utils.getDownloadUrl('helm', 'v3.2.1')).toBe(helmWindowsUrl)
      expect(os.type).toHaveBeenCalled()
   })

   test('getDownloadUrl() - return the URL to download kompose for Linux_x64', () => {
      jest.spyOn(os, 'type').mockReturnValue('Linux')
      jest.spyOn(os, 'arch').mockReturnValue('x64')
      const komposelLinuxUrl =
         'https://github.com/kubernetes/kompose/releases/download/v1.18.0/kompose-linux-amd64'

      expect(utils.getDownloadUrl('kompose', 'v1.18.0')).toBe(komposelLinuxUrl)
      expect(os.type).toHaveBeenCalled()
      expect(os.arch).toHaveBeenCalled()
   })

   test('getDownloadUrl() - return the URL to download kompose for Linux_arm64', () => {
      jest.spyOn(os, 'type').mockReturnValue('Linux')
      jest.spyOn(os, 'arch').mockReturnValue('arm64')
      const komposelLinuxUrl =
         'https://github.com/kubernetes/kompose/releases/download/v1.18.0/kompose-linux-arm64'

      expect(utils.getDownloadUrl('kompose', 'v1.18.0')).toBe(komposelLinuxUrl)
      expect(os.type).toHaveBeenCalled()
      expect(os.arch).toHaveBeenCalled()
   })

   test('getDownloadUrl() - return the URL to download kompose for Darwin', () => {
      jest.spyOn(os, 'type').mockReturnValue('Darwin')
      const komposelDarwinUrl =
         'https://github.com/kubernetes/kompose/releases/download/v1.18.0/kompose-darwin-amd64'

      expect(utils.getDownloadUrl('kompose', 'v1.18.0')).toBe(komposelDarwinUrl)
      expect(os.type).toHaveBeenCalled()
   })

   test('getDownloadUrl() - return the URL to download kompose for Windows', () => {
      jest.spyOn(os, 'type').mockReturnValue('Windows_NT')

      const komposeWindowsUrl =
         'https://github.com/kubernetes/kompose/releases/download/v1.18.0/kompose-windows-amd64.exe'
      expect(utils.getDownloadUrl('kompose', 'v1.18.0')).toBe(komposeWindowsUrl)
      expect(os.type).toHaveBeenCalled()
   })

   test('getDownloadUrl() - return the URL to download kubectl for Linux_x64', () => {
      jest.spyOn(os, 'type').mockReturnValue('Linux')
      jest.spyOn(os, 'arch').mockReturnValue('x64')
      const kubectlLinuxUrl =
         'https://storage.googleapis.com/kubernetes-release/release/v1.15.0/bin/linux/amd64/kubectl'

      expect(utils.getDownloadUrl('kubectl', 'v1.15.0')).toBe(kubectlLinuxUrl)
      expect(os.type).toHaveBeenCalled()
      expect(os.arch).toHaveBeenCalled()
   })

   test('getDownloadUrl() - return the URL to download kubectl for Linux_arm64', () => {
      jest.spyOn(os, 'type').mockReturnValue('Linux')
      jest.spyOn(os, 'arch').mockReturnValue('arm64')
      const kubectlLinuxUrl =
         'https://storage.googleapis.com/kubernetes-release/release/v1.15.0/bin/linux/arm64/kubectl'

      expect(utils.getDownloadUrl('kubectl', 'v1.15.0')).toBe(kubectlLinuxUrl)
      expect(os.type).toHaveBeenCalled()
      expect(os.arch).toHaveBeenCalled()
   })

   test('getDownloadUrl() - return the URL to download kubectl for Darwin', () => {
      jest.spyOn(os, 'type').mockReturnValue('Darwin')
      const kubectlDarwinUrl =
         'https://storage.googleapis.com/kubernetes-release/release/v1.15.0/bin/darwin/amd64/kubectl'

      expect(utils.getDownloadUrl('kubectl', 'v1.15.0')).toBe(kubectlDarwinUrl)
      expect(os.type).toHaveBeenCalled()
   })

   test('getDownloadUrl() - return the URL to download kubectl for Windows', () => {
      jest.spyOn(os, 'type').mockReturnValue('Windows_NT')

      const kubectlWindowsUrl =
         'https://storage.googleapis.com/kubernetes-release/release/v1.15.0/bin/windows/amd64/kubectl.exe'
      expect(utils.getDownloadUrl('kubectl', 'v1.15.0')).toBe(kubectlWindowsUrl)
      expect(os.type).toHaveBeenCalled()
   })

   test('getDownloadUrl() - should throw an error if called with incorrect OS type', () => {
      jest.spyOn(os, 'type').mockReturnValue('wrong_os')
      expect(() => {
         utils.getDownloadUrl('kubectl', 'v1.15.0')
      }).toThrow('Unknown OS or render engine type')
      expect(os.type).toHaveBeenCalled()
   })

   test('getDownloadUrl() - should throw an error if called with incorrect render engine', () => {
      jest.spyOn(os, 'type').mockReturnValue('test_os')

      expect(() => {
         utils.getDownloadUrl('test_render_engine', 'v1.15.0')
      }).toThrow('Unknown OS or render engine type')
      expect(os.type).toHaveBeenCalled()
   })

   test('getStableVerison() - download stable version file for helm, read version and return it', async () => {
      jest.spyOn(toolCache, 'downloadTool').mockResolvedValue('pathToTool')
      const response = JSON.stringify({
         tag_name: 'v4.0.0'
      })
      jest.spyOn(fs, 'readFileSync').mockReturnValue(response)

      expect(await utils.getStableVerison('helm')).toBe('v4.0.0')
      expect(toolCache.downloadTool).toHaveBeenCalled()
      expect(fs.readFileSync).toHaveBeenCalledWith('pathToTool', 'utf8')
   })

   test('getStableVerison() - return default helm version if stable version file is empty', async () => {
      jest.spyOn(toolCache, 'downloadTool').mockResolvedValue('pathToTool')
      const response = JSON.stringify({})
      jest.spyOn(fs, 'readFileSync').mockReturnValue(response)

      expect(await utils.getStableVerison('helm')).toBe('v2.14.1')
      expect(toolCache.downloadTool).toHaveBeenCalled()
      expect(fs.readFileSync).toHaveBeenCalledWith('pathToTool', 'utf8')
   })

   test('getStableVerison() - return default helm version if stable version file download fails', async () => {
      jest.spyOn(toolCache, 'downloadTool').mockImplementation(async () => {
         throw 'Error!!'
      })
      jest.spyOn(core, 'setFailed').mockImplementation(() => {})
      jest.spyOn(core, 'debug').mockImplementation(() => {})
      jest.spyOn(core, 'warning').mockImplementation(() => {})

      expect(await utils.getStableVerison('helm')).toBe('v2.14.1')
      expect(toolCache.downloadTool).toHaveBeenCalled()
      expect(core.debug).toHaveBeenCalledWith('Error!!')
      expect(core.warning).toHaveBeenCalledWith(
         expect.stringContaining(
            'Failed to read latest helm version from URL https://api.github.com/repos/helm/helm/releases/latest.'
         )
      )
   })

   test('getStableVerison() - return default kubectl v1.15.0 if unable to download file', async () => {
      jest
         .spyOn(toolCache, 'downloadTool')
         .mockRejectedValue('Unable to download.')
      jest.spyOn(core, 'debug').mockImplementation()
      jest.spyOn(core, 'warning').mockImplementation()

      expect(await utils.getStableVerison('kubectl')).toBe('v1.15.0')
      expect(toolCache.downloadTool).toHaveBeenCalled()
   })

   test('getStableVerison() - return default kubectl v1.15.0 if version read is empty', async () => {
      jest.spyOn(toolCache, 'downloadTool').mockResolvedValue('pathToTool')
      jest.spyOn(fs, 'readFileSync').mockReturnValue('')
      jest.spyOn(core, 'warning').mockImplementation()

      expect(await utils.getStableVerison('kubectl')).toBe('v1.15.0')
      expect(toolCache.downloadTool).toHaveBeenCalled()
      expect(fs.readFileSync).toHaveBeenCalledWith('pathToTool', 'utf8')
   })

   test('getStableVerison() - download stable kubectl version file, read version and return it', async () => {
      jest.spyOn(toolCache, 'downloadTool').mockResolvedValue('pathToTool')
      jest.spyOn(fs, 'readFileSync').mockReturnValue('v2.14.1')

      expect(await utils.getStableVerison('kubectl')).toBe('v2.14.1')
      expect(toolCache.downloadTool).toHaveBeenCalled()
      expect(fs.readFileSync).toHaveBeenCalledWith('pathToTool', 'utf8')
   })
})
