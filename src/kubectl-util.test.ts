import * as kubectlUtil from './kubectl-util'
import * as os from 'os'
import * as fs from 'fs'
import * as path from 'path'
import * as toolCache from '@actions/tool-cache'
import * as core from '@actions/core'
import * as io from '@actions/io'
import * as utils from './utilities'

describe('Testing all functions in kubectl-util file.', () => {
   afterEach(() => jest.restoreAllMocks())
   test('downloadKubectl() - download kubectl, add it to toolCache and return path to it', async () => {
      jest.spyOn(toolCache, 'find').mockReturnValue('')
      jest.spyOn(toolCache, 'downloadTool').mockResolvedValue('pathToTool')
      jest.spyOn(toolCache, 'cacheFile').mockResolvedValue('pathToCachedTool')
      jest.spyOn(os, 'type').mockReturnValue('Windows_NT')
      jest.spyOn(fs, 'chmodSync').mockImplementation()

      expect(await kubectlUtil.downloadKubectl('v1.15.0')).toBe(
         path.join('pathToCachedTool', 'kubectl.exe')
      )
      expect(toolCache.find).toHaveBeenCalledWith('kubectl', 'v1.15.0')
      expect(toolCache.downloadTool).toHaveBeenCalled()
      expect(toolCache.cacheFile).toHaveBeenCalled()
      expect(os.type).toHaveBeenCalled()
      expect(fs.chmodSync).toHaveBeenCalledWith(
         path.join('pathToCachedTool', 'kubectl.exe'),
         '777'
      )
   })

   test('downloadKubectl() - throw DownloadKubectlFailed error when unable to download kubectl', async () => {
      jest.spyOn(toolCache, 'find').mockReturnValue('')
      jest.spyOn(os, 'type').mockReturnValue('Windows_NT')
      jest
         .spyOn(toolCache, 'downloadTool')
         .mockRejectedValue('Unable to download kubectl.')

      await expect(kubectlUtil.downloadKubectl('v1.15.0')).rejects.toThrow(
         'Failed to download the kubectl from https://storage.googleapis.com/kubernetes-release/release/v1.15.0/bin/windows/amd64/kubectl.exe.  Error: Unable to download kubectl.'
      )
      expect(toolCache.find).toHaveBeenCalledWith('kubectl', 'v1.15.0')
      expect(toolCache.downloadTool).toHaveBeenCalled()
   })

   test('downloadKubectl() - return path to existing cache of kubectl', async () => {
      jest.spyOn(toolCache, 'find').mockReturnValue('pathToCachedTool')
      jest.spyOn(os, 'type').mockReturnValue('Windows_NT')
      jest.spyOn(fs, 'chmodSync').mockImplementation(() => {})

      expect(await kubectlUtil.downloadKubectl('v1.15.0')).toBe(
         path.join('pathToCachedTool', 'kubectl.exe')
      )
      expect(toolCache.find).toHaveBeenCalledWith('kubectl', 'v1.15.0')
      expect(os.type).toHaveBeenCalled()
      expect(fs.chmodSync).toHaveBeenCalledWith(
         path.join('pathToCachedTool', 'kubectl.exe'),
         '777'
      )
   })

   test('installKubectl() - return its path to installed kubectl', async () => {
      jest.spyOn(toolCache, 'find').mockReturnValue('pathToCachedDir')
      jest.spyOn(toolCache, 'downloadTool').mockImplementation(async () => {
         throw 'Error!!'
      })
      jest.spyOn(os, 'type').mockReturnValue('Windows_NT')
      jest
         .spyOn(fs, 'readdirSync')
         .mockImplementation((file, _) => [
            'kubectl.exe' as unknown as fs.Dirent<NonSharedBuffer>
         ])
      jest.spyOn(fs, 'statSync').mockImplementation((file) => {
         const isDirectory =
            (file as string).indexOf('folder') == -1 ? false : true
         return {isDirectory: () => isDirectory} as fs.Stats
      })
      jest.spyOn(fs, 'chmodSync').mockImplementation()
      jest.spyOn(core, 'debug').mockImplementation()

      expect(await kubectlUtil.installKubectl('v1.15.0')).toBe(
         path.join('pathToCachedDir', 'kubectl.exe')
      )
      expect(toolCache.find).toHaveBeenCalledWith('kubectl', 'v1.15.0')
   })

   test('installKubectl() - download and return path to latest kubectl', async () => {
      jest.spyOn(toolCache, 'find').mockReturnValue('')
      jest.spyOn(toolCache, 'downloadTool').mockResolvedValue('pathToTool')
      jest.spyOn(toolCache, 'cacheFile').mockResolvedValue('pathToCachedTool')
      jest.spyOn(os, 'type').mockReturnValue('Windows_NT')
      jest.spyOn(fs, 'chmodSync').mockImplementation()
      jest.spyOn(fs, 'readFileSync').mockReturnValue('v1.15.0')
      jest.spyOn(core, 'debug').mockImplementation()

      expect(await kubectlUtil.installKubectl('latest')).toBe(
         path.join('pathToCachedTool', 'kubectl.exe')
      )
      expect(toolCache.find).toHaveBeenCalledWith('kubectl', 'v1.15.0')
      expect(toolCache.downloadTool).toHaveBeenCalled()
      expect(toolCache.cacheFile).toHaveBeenCalled()
      expect(os.type).toHaveBeenCalled()
      expect(fs.chmodSync).toHaveBeenCalledWith(
         path.join('pathToCachedTool', 'kubectl.exe'),
         '777'
      )
   })

   test('getKubectlPath() - throw if version is not provided and no kubectl is already present', async () => {
      jest.spyOn(core, 'getInput').mockReturnValue('')
      jest.spyOn(io, 'which').mockResolvedValue('')
      jest.spyOn(toolCache, 'findAllVersions').mockReturnValue([])

      await expect(kubectlUtil.getKubectlPath()).rejects.toThrow(
         'Kubectl is not installed, either add install-kubectl action or provide "kubectl-version" input to download kubectl'
      )
      expect(core.getInput).toHaveBeenCalledWith('kubectl-version', {
         required: false
      })
      expect(io.which).toHaveBeenCalledWith('kubectl', false)
      expect(toolCache.findAllVersions).toHaveBeenCalledWith('kubectl')
   })

   test('getKubectlPath() - return installed version of kubectl if input not provided', async () => {
      jest.spyOn(core, 'getInput').mockReturnValue('')
      jest.spyOn(io, 'which').mockResolvedValue('pathToKubectl')

      expect(await kubectlUtil.getKubectlPath()).toBe('pathToKubectl')
      expect(core.getInput).toHaveBeenCalledWith('kubectl-version', {
         required: false
      })
      expect(io.which).toHaveBeenCalledWith('kubectl', false)
   })

   test('getKubectlPath() - return any version of kubectl from toolCache if input not provided', async () => {
      jest.spyOn(core, 'getInput').mockReturnValue('')
      jest.spyOn(io, 'which').mockResolvedValue('')
      jest
         .spyOn(toolCache, 'findAllVersions')
         .mockReturnValue(['v2.0.0', 'v1.0.0'])
      jest.spyOn(toolCache, 'find').mockReturnValue('pathToCachedKubectl')
      jest.spyOn(os, 'type').mockReturnValue('Windows_NT')

      expect(await kubectlUtil.getKubectlPath()).toBe(
         path.join('pathToCachedKubectl', 'kubectl.exe')
      )
      expect(core.getInput).toHaveBeenCalledWith('kubectl-version', {
         required: false
      })
      expect(io.which).toHaveBeenCalledWith('kubectl', false)
      expect(toolCache.findAllVersions).toHaveBeenCalledWith('kubectl')
      expect(toolCache.find).toHaveBeenCalledWith('kubectl', 'v2.0.0')
   })

   test('getKubectlPath() - return path to specified version kubectl from toolCache', async () => {
      jest.spyOn(core, 'getInput').mockReturnValue('v2.0.0')
      jest.spyOn(toolCache, 'find').mockReturnValue('pathToKubectl')
      jest.spyOn(os, 'type').mockReturnValue('Windows_NT')

      expect(await kubectlUtil.getKubectlPath()).toBe(
         path.join('pathToKubectl', 'kubectl.exe')
      )
      expect(core.getInput).toHaveBeenCalledWith('kubectl-version', {
         required: false
      })
      expect(toolCache.find).toHaveBeenCalledWith('kubectl', 'v2.0.0')
   })

   test('getKubectlPath() - installs kubectl if version is provided but not cached', async () => {
      jest.spyOn(core, 'getInput').mockReturnValue('v1.15.0')
      jest.spyOn(toolCache, 'find').mockReturnValue(undefined)
      jest.spyOn(os, 'type').mockReturnValue('Windows_NT')
      jest
         .spyOn(toolCache, 'downloadTool')
         .mockResolvedValue('mockedDownloadPath')
      jest.spyOn(toolCache, 'cacheFile').mockResolvedValue('mockedCachePath')
      jest.spyOn(fs, 'chmodSync').mockImplementation()
      const expectedPath = path.join('mockedCachePath', 'kubectl.exe')

      const result = await kubectlUtil.getKubectlPath()

      expect(result).toBe(expectedPath)
   })
})
