import * as helmUtil from './helm-util'
import * as os from 'os'
import * as fs from 'fs'
import * as path from 'path'
import * as toolCache from '@actions/tool-cache'
import * as core from '@actions/core'
import * as io from '@actions/io'
import * as utils from './utilities'

describe('Testing all functions in helm-util file.', () => {
   test('walkSync() - return path to the all files matching fileToFind in dir', () => {
      jest.spyOn(fs, 'readdirSync').mockImplementation((file, _) => {
         if (file == 'mainFolder')
            return [
               'file1',
               'file2',
               'folder1',
               'folder2'
            ] as unknown as fs.Dirent<Buffer<ArrayBufferLike>>[]
         if (file == path.join('mainFolder', 'folder1'))
            return ['file11', 'file12'] as unknown as fs.Dirent<
               Buffer<ArrayBufferLike>
            >[]
         if (file == path.join('mainFolder', 'folder2'))
            return ['file21', 'file22'] as unknown as fs.Dirent<
               Buffer<ArrayBufferLike>
            >[]
         return []
      })
      jest.spyOn(core, 'debug').mockImplementation()
      jest.spyOn(fs, 'statSync').mockImplementation((file) => {
         const isDirectory =
            (file as string).toLowerCase().indexOf('file') == -1 ? true : false
         return {isDirectory: () => isDirectory} as fs.Stats
      })

      expect(helmUtil.walkSync('mainFolder', undefined, 'file21')).toEqual([
         path.join('mainFolder', 'folder2', 'file21')
      ])
      expect(fs.readdirSync).toHaveBeenCalledTimes(3)
      expect(fs.statSync).toHaveBeenCalledTimes(8)
   })

   test('walkSync() - return empty array if no file with name fileToFind exists', () => {
      jest.spyOn(fs, 'readdirSync').mockImplementation((file, _) => {
         if (file == 'mainFolder')
            return ['file1', 'file2', 'folder2'] as unknown as fs.Dirent<
               Buffer<ArrayBufferLike>
            >[]
         if (file == path.join('mainFolder', 'folder1'))
            return ['file11', 'file12'] as unknown as fs.Dirent<
               Buffer<ArrayBufferLike>
            >[]
         if (file == path.join('mainFolder', 'folder2'))
            return ['file21', 'file22'] as unknown as fs.Dirent<
               Buffer<ArrayBufferLike>
            >[]
         if (file == path.join('mainFolder', 'folder2'))
            return ['file21', 'file22'] as unknown as fs.Dirent<
               Buffer<ArrayBufferLike>
            >[]
         return []
      })
      jest.spyOn(core, 'debug').mockImplementation()
      jest.spyOn(fs, 'statSync').mockImplementation((file) => {
         const isDirectory =
            (file as string).toLowerCase().indexOf('file') == -1 ? true : false
         return {isDirectory: () => isDirectory} as fs.Stats
      })

      expect(helmUtil.walkSync('mainFolder', undefined, 'helm.exe')).toEqual([])
      expect(fs.readdirSync).toHaveBeenCalledTimes(2)
      expect(fs.statSync).toHaveBeenCalledTimes(5)
   })

   test('downloadHelm() - throw error when unable to download', async () => {
      jest.spyOn(toolCache, 'find').mockReturnValue('')
      jest.spyOn(toolCache, 'downloadTool').mockImplementation(async () => {
         throw 'Unable to download.'
      })
      jest.spyOn(os, 'type').mockReturnValue('Windows_NT')
      jest.spyOn(core, 'debug').mockImplementation()

      await expect(helmUtil.downloadHelm('v2.14.1')).rejects.toThrow(
         'Failed to download the helm from https://get.helm.sh/helm-v2.14.1-windows-amd64.zip.  Error: Unable to download.'
      )
      expect(toolCache.find).toHaveBeenCalledWith('helm', 'v2.14.1')
      expect(toolCache.downloadTool).toHaveBeenCalledWith(
         'https://get.helm.sh/helm-v2.14.1-windows-amd64.zip'
      )
   })

   test('downloadHelm() - find helm executable in toolCache and return path', async () => {
      jest.spyOn(toolCache, 'find').mockReturnValue('pathToCachedDir' as string)
      jest.spyOn(os, 'type').mockReturnValue('Windows_NT')
      jest
         .spyOn(fs, 'readdirSync')
         .mockImplementation((_file, _options) => [
            'helm.exe' as unknown as fs.Dirent<Buffer<ArrayBufferLike>>
         ])
      jest.spyOn(fs, 'statSync').mockImplementation((file) => {
         const isDirectory =
            (file as string).indexOf('folder') == -1 ? false : true
         return {isDirectory: () => isDirectory} as fs.Stats
      })
      jest.spyOn(fs, 'chmodSync').mockImplementation(() => {})
      jest.spyOn(core, 'debug').mockImplementation()

      const helmPath = await helmUtil.downloadHelm('v2.14.1')
      expect(helmPath).toBe(path.join('pathToCachedDir', 'helm.exe'))
      expect(toolCache.find).toHaveBeenCalledWith('helm', 'v2.14.1')
      expect(fs.chmodSync).toHaveBeenCalledWith(
         path.join('pathToCachedDir', 'helm.exe'),
         '777'
      )
   })

   test('downloadHelm() - throw error if helm executable not found in cache', async () => {
      jest.spyOn(toolCache, 'find').mockReturnValue('')
      jest.spyOn(toolCache, 'downloadTool').mockResolvedValue('pathToTool')
      jest.spyOn(os, 'type').mockReturnValue('Windows_NT')
      jest.spyOn(fs, 'chmodSync').mockImplementation(() => {})
      jest
         .spyOn(toolCache, 'extractZip')
         .mockResolvedValue('pathToUnzippedHelm')
      jest.spyOn(toolCache, 'cacheDir').mockResolvedValue('pathToCachedDir')
      jest.spyOn(fs, 'readdirSync').mockImplementation((file, _) => [])
      jest.spyOn(fs, 'statSync').mockImplementation((file) => {
         const isDirectory =
            (file as string).indexOf('folder') == -1 ? false : true
         return {isDirectory: () => isDirectory} as fs.Stats
      })

      await expect(helmUtil.downloadHelm('v2.14.1')).rejects.toThrow(
         'Helm executable not found in path  pathToCachedDir'
      )
      expect(toolCache.find).toHaveBeenCalledWith('helm', 'v2.14.1')
      expect(toolCache.downloadTool).toHaveBeenCalledWith(
         'https://get.helm.sh/helm-v2.14.1-windows-amd64.zip'
      )
      expect(fs.chmodSync).toHaveBeenCalledWith('pathToTool', '777')
      expect(toolCache.extractZip).toHaveBeenCalledWith('pathToTool')
   })

   test('downloadHelm() - get stable version of helm, download and return path', async () => {
      jest.spyOn(toolCache, 'find').mockReturnValue('')
      jest.spyOn(toolCache, 'downloadTool').mockResolvedValue('pathToTool')
      const response = JSON.stringify({
         tag_name: 'v4.0.0'
      })
      jest.spyOn(fs, 'readFileSync').mockReturnValue(response)
      jest.spyOn(os, 'type').mockReturnValue('Windows_NT')
      jest.spyOn(fs, 'chmodSync').mockImplementation(() => {})
      jest
         .spyOn(toolCache, 'extractZip')
         .mockResolvedValue('pathToUnzippedHelm')
      jest.spyOn(toolCache, 'cacheDir').mockResolvedValue('pathToCachedDir')
      jest
         .spyOn(fs, 'readdirSync')
         .mockImplementation((file, _) => [
            'helm.exe' as unknown as fs.Dirent<Buffer<ArrayBufferLike>>
         ])
      jest.spyOn(fs, 'statSync').mockImplementation((file) => {
         const isDirectory =
            (file as string).indexOf('folder') == -1 ? false : true
         return {isDirectory: () => isDirectory} as fs.Stats
      })

      expect(await helmUtil.downloadHelm('v4.0.0')).toBe(
         path.join('pathToCachedDir', 'helm.exe')
      )
      expect(toolCache.find).toHaveBeenCalledWith('helm', 'v4.0.0')
      expect(toolCache.downloadTool).toHaveBeenCalledWith(
         'https://get.helm.sh/helm-v4.0.0-windows-amd64.zip'
      )
      expect(fs.chmodSync).toHaveBeenCalledWith('pathToTool', '777')
      expect(toolCache.extractZip).toHaveBeenCalledWith('pathToTool')
      expect(fs.chmodSync).toHaveBeenCalledWith(
         path.join('pathToCachedDir', 'helm.exe'),
         '777'
      )
   })

   test('installHelm() - download specified version helm and return its path', async () => {
      jest.spyOn(toolCache, 'find').mockReturnValue('pathToCachedDir')
      jest.spyOn(toolCache, 'downloadTool').mockImplementation(async () => {
         throw 'Unable to download'
      })
      jest.spyOn(os, 'type').mockReturnValue('Windows_NT')
      jest
         .spyOn(fs, 'readdirSync')
         .mockImplementation((file, _) => [
            'helm.exe' as unknown as fs.Dirent<Buffer<ArrayBufferLike>>
         ])
      jest.spyOn(fs, 'statSync').mockImplementation((file) => {
         const isDirectory =
            (file as string).indexOf('folder') == -1 ? false : true
         return {isDirectory: () => isDirectory} as fs.Stats
      })
      jest.spyOn(fs, 'chmodSync').mockImplementation(() => {})
      jest.spyOn(core, 'debug').mockImplementation()

      expect(await helmUtil.installHelm('v2.14.1')).toBe(
         path.join('pathToCachedDir', 'helm.exe')
      )
   })

   test('installHelm() - get latest version of helm and return its path', async () => {
      jest.spyOn(toolCache, 'find').mockReturnValue('')
      jest.spyOn(toolCache, 'downloadTool').mockResolvedValue('pathToTool')
      const response = JSON.stringify({
         tag_name: 'v4.0.0'
      })
      jest.spyOn(fs, 'readFileSync').mockReturnValue(response)
      jest.spyOn(os, 'type').mockReturnValue('Windows_NT')
      jest.spyOn(fs, 'chmodSync').mockImplementation(() => {})
      jest
         .spyOn(toolCache, 'extractZip')
         .mockResolvedValue('pathToUnzippedHelm')
      jest.spyOn(toolCache, 'cacheDir').mockResolvedValue('pathToCachedDir')
      jest
         .spyOn(fs, 'readdirSync')
         .mockImplementation((file, _) => [
            'helm.exe' as unknown as fs.Dirent<Buffer<ArrayBufferLike>>
         ])
      jest.spyOn(fs, 'statSync').mockImplementation((file) => {
         const isDirectory =
            (file as string).indexOf('folder') == -1 ? false : true
         return {isDirectory: () => isDirectory} as fs.Stats
      })
      jest.spyOn(core, 'debug').mockImplementation()

      expect(await helmUtil.installHelm('latest')).toBe(
         path.join('pathToCachedDir', 'helm.exe')
      )
   })

   test('getHelmPath() - download helm and return its path', async () => {
      jest.spyOn(core, 'getInput').mockReturnValue('v2.14.1')
      jest
         .spyOn(toolCache, 'find')
         .mockReturnValueOnce('')
         .mockReturnValueOnce('pathToCachedDir')
      jest.spyOn(os, 'type').mockReturnValue('Windows_NT')
      jest
         .spyOn(fs, 'readdirSync')
         .mockImplementation((file, _) => [
            'helm.exe' as unknown as fs.Dirent<Buffer<ArrayBufferLike>>
         ])
      jest.spyOn(fs, 'statSync').mockImplementation((file) => {
         const isDirectory =
            (file as string).indexOf('folder') == -1 ? false : true
         return {isDirectory: () => isDirectory} as fs.Stats
      })
      jest.spyOn(fs, 'chmodSync').mockImplementation()

      expect(await helmUtil.getHelmPath()).toBe(
         path.join('pathToCachedDir', 'helm.exe')
      )
      expect(toolCache.find).toHaveBeenCalledWith('helm', 'v2.14.1')
   })

   test('getHelmPath() - return helm From toolCache', async () => {
      jest.spyOn(core, 'getInput').mockReturnValue('v2.14.1')
      jest.spyOn(toolCache, 'find').mockReturnValue('pathToCachedDir')
      jest.spyOn(os, 'type').mockReturnValue('Windows_NT')

      expect(await helmUtil.getHelmPath()).toBe(
         path.join('pathToCachedDir', 'helm.exe')
      )
      expect(toolCache.find).toHaveBeenCalledWith('helm', 'v2.14.1')
   })

   test('getHelmPath() - return path any version helm executable if version input not specified', async () => {
      jest.spyOn(core, 'getInput').mockReturnValue('')
      jest.spyOn(io, 'which').mockResolvedValue('pathToHelm')

      expect(await helmUtil.getHelmPath()).toBe('pathToHelm')
      expect(core.getInput).toHaveBeenCalledWith('helm-version', {
         required: false
      })
      expect(io.which).toHaveBeenCalledWith('helm', false)
   })

   test('getHelmPath() - return path to any version helm from tool cache', async () => {
      jest.spyOn(core, 'getInput').mockReturnValue('')
      jest.spyOn(io, 'which').mockResolvedValue('')
      jest.spyOn(toolCache, 'find').mockReturnValue('pathToCachedDir')
      jest.spyOn(toolCache, 'findAllVersions').mockReturnValue(['pathToHelm'])

      expect(await helmUtil.getHelmPath()).toBe(
         path.join('pathToCachedDir', 'helm.exe')
      )
      expect(toolCache.findAllVersions).toHaveBeenCalledWith('helm')
      expect(core.getInput).toHaveBeenCalledWith('helm-version', {
         required: false
      })
      expect(io.which).toHaveBeenCalledWith('helm', false)
   })

   test('installHelm() - throw error when version input not specified and no executable found', async () => {
      jest.spyOn(core, 'getInput').mockReturnValue('')
      jest.spyOn(io, 'which').mockResolvedValue('')
      jest.spyOn(toolCache, 'findAllVersions').mockReturnValue([])

      await expect(helmUtil.getHelmPath()).rejects.toThrow(
         'helm is not installed, either add setup-helm action or provide "helm-version" input to download helm'
      )
      expect(toolCache.findAllVersions).toHaveBeenCalledWith('helm')
      expect(core.getInput).toHaveBeenCalledWith('helm-version', {
         required: false
      })
      expect(io.which).toHaveBeenCalledWith('helm', false)
   })

   test('findHelm() - change access permissions and find the helm in given directory', () => {
      jest
         .spyOn(fs, 'readdirSync')
         .mockImplementation((file, _) => [
            'helm.exe' as unknown as fs.Dirent<Buffer<ArrayBufferLike>>
         ])
      jest.spyOn(fs, 'chmodSync').mockImplementation(() => {})
      jest.spyOn(fs, 'statSync').mockImplementation((file) => {
         const isDirectory =
            (file as string).indexOf('folder') == -1 ? false : true
         return {isDirectory: () => isDirectory} as fs.Stats
      })

      expect(helmUtil.findHelm('mainFolder')).toBe(
         path.join('mainFolder', 'helm.exe')
      )
      expect(fs.chmodSync).toHaveBeenCalledWith('mainFolder', '777')
      expect(fs.readdirSync).toHaveBeenCalledWith('mainFolder')
      expect(fs.statSync).toHaveBeenCalledWith(
         path.join('mainFolder', 'helm.exe')
      )
   })
})
