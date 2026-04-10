import {vi} from 'vitest'
import * as helmUtil from './helm-util.js'
import os from 'os'
import fs from 'fs'
import path from 'path'
import * as toolCache from '@actions/tool-cache'
import * as core from '@actions/core'
import * as io from '@actions/io'
import * as utils from './utilities.js'

describe('Testing all functions in helm-util file.', () => {
   test('walkSync() - return path to the all files matching fileToFind in dir', () => {
      vi.spyOn(fs, 'readdirSync').mockImplementation((file, _) => {
         if (file == 'mainFolder')
            return [
               'file1',
               'file2',
               'folder1',
               'folder2'
            ] as unknown as fs.Dirent<NonSharedBuffer>[]
         if (file == path.join('mainFolder', 'folder1'))
            return [
               'file11',
               'file12'
            ] as unknown as fs.Dirent<NonSharedBuffer>[]
         if (file == path.join('mainFolder', 'folder2'))
            return [
               'file21',
               'file22'
            ] as unknown as fs.Dirent<NonSharedBuffer>[]
         return []
      })
      vi.spyOn(core, 'debug').mockImplementation(() => {})
      vi.spyOn(fs, 'statSync').mockImplementation((file) => {
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
      vi.spyOn(fs, 'readdirSync').mockImplementation((file, _) => {
         if (file == 'mainFolder')
            return [
               'file1',
               'file2',
               'folder2'
            ] as unknown as fs.Dirent<NonSharedBuffer>[]
         if (file == path.join('mainFolder', 'folder1'))
            return [
               'file11',
               'file12'
            ] as unknown as fs.Dirent<NonSharedBuffer>[]
         if (file == path.join('mainFolder', 'folder2'))
            return [
               'file21',
               'file22'
            ] as unknown as fs.Dirent<NonSharedBuffer>[]
         return []
      })
      vi.spyOn(core, 'debug').mockImplementation(() => {})
      vi.spyOn(fs, 'statSync').mockImplementation((file) => {
         const isDirectory =
            (file as string).toLowerCase().indexOf('file') == -1 ? true : false
         return {isDirectory: () => isDirectory} as fs.Stats
      })

      expect(helmUtil.walkSync('mainFolder', undefined, 'helm.exe')).toEqual([])
      expect(fs.readdirSync).toHaveBeenCalledTimes(2)
      expect(fs.statSync).toHaveBeenCalledTimes(5)
   })

   test('downloadHelm() - throw error when unable to download', async () => {
      vi.spyOn(toolCache, 'find').mockReturnValue('')
      vi.spyOn(toolCache, 'downloadTool').mockImplementation(async () => {
         throw 'Unable to download.'
      })
      vi.spyOn(os, 'type').mockReturnValue('Windows_NT')
      vi.spyOn(core, 'debug').mockImplementation(() => {})

      await expect(helmUtil.downloadHelm('v2.14.1')).rejects.toThrow(
         'Failed to download the helm from https://get.helm.sh/helm-v2.14.1-windows-amd64.zip.  Error: Unable to download.'
      )
      expect(toolCache.find).toHaveBeenCalledWith('helm', 'v2.14.1')
      expect(toolCache.downloadTool).toHaveBeenCalledWith(
         'https://get.helm.sh/helm-v2.14.1-windows-amd64.zip'
      )
   })

   test('downloadHelm() - find helm executable in toolCache and return path', async () => {
      vi.spyOn(toolCache, 'find').mockReturnValue('pathToCachedDir' as string)
      vi.spyOn(os, 'type').mockReturnValue('Windows_NT')
      vi.spyOn(fs, 'readdirSync').mockImplementation((_file, _options) => [
         'helm.exe' as unknown as fs.Dirent<NonSharedBuffer>
      ])
      vi.spyOn(fs, 'statSync').mockImplementation((file) => {
         const isDirectory =
            (file as string).indexOf('folder') == -1 ? false : true
         return {isDirectory: () => isDirectory} as fs.Stats
      })
      vi.spyOn(fs, 'chmodSync').mockImplementation(() => {})
      vi.spyOn(core, 'debug').mockImplementation(() => {})

      const helmPath = await helmUtil.downloadHelm('v2.14.1')
      expect(helmPath).toBe(path.join('pathToCachedDir', 'helm.exe'))
      expect(toolCache.find).toHaveBeenCalledWith('helm', 'v2.14.1')
      expect(fs.chmodSync).toHaveBeenCalledWith(
         path.join('pathToCachedDir', 'helm.exe'),
         '777'
      )
   })

   test('downloadHelm() - throw error if helm executable not found in cache', async () => {
      vi.spyOn(toolCache, 'find').mockReturnValue('')
      vi.spyOn(toolCache, 'downloadTool').mockResolvedValue('pathToTool')
      vi.spyOn(os, 'type').mockReturnValue('Windows_NT')
      vi.spyOn(fs, 'chmodSync').mockImplementation(() => {})
      vi.spyOn(toolCache, 'extractZip').mockResolvedValue('pathToUnzippedHelm')
      vi.spyOn(toolCache, 'cacheDir').mockResolvedValue('pathToCachedDir')
      vi.spyOn(fs, 'readdirSync').mockImplementation((file, _) => [])
      vi.spyOn(fs, 'statSync').mockImplementation((file) => {
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
      vi.spyOn(toolCache, 'find').mockReturnValue('')
      vi.spyOn(toolCache, 'downloadTool').mockResolvedValue('pathToTool')
      const response = JSON.stringify({
         tag_name: 'v4.0.0'
      })
      vi.spyOn(fs, 'readFileSync').mockReturnValue(response)
      vi.spyOn(os, 'type').mockReturnValue('Windows_NT')
      vi.spyOn(fs, 'chmodSync').mockImplementation(() => {})
      vi.spyOn(toolCache, 'extractZip').mockResolvedValue('pathToUnzippedHelm')
      vi.spyOn(toolCache, 'cacheDir').mockResolvedValue('pathToCachedDir')
      vi.spyOn(fs, 'readdirSync').mockImplementation((file, _) => [
         'helm.exe' as unknown as fs.Dirent<NonSharedBuffer>
      ])
      vi.spyOn(fs, 'statSync').mockImplementation((file) => {
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
      vi.spyOn(toolCache, 'find').mockReturnValue('pathToCachedDir')
      vi.spyOn(toolCache, 'downloadTool').mockImplementation(async () => {
         throw 'Unable to download'
      })
      vi.spyOn(os, 'type').mockReturnValue('Windows_NT')
      vi.spyOn(fs, 'readdirSync').mockImplementation((file, _) => [
         'helm.exe' as unknown as fs.Dirent<NonSharedBuffer>
      ])
      vi.spyOn(fs, 'statSync').mockImplementation((file) => {
         const isDirectory =
            (file as string).indexOf('folder') == -1 ? false : true
         return {isDirectory: () => isDirectory} as fs.Stats
      })
      vi.spyOn(fs, 'chmodSync').mockImplementation(() => {})
      vi.spyOn(core, 'debug').mockImplementation(() => {})

      expect(await helmUtil.installHelm('v2.14.1')).toBe(
         path.join('pathToCachedDir', 'helm.exe')
      )
   })

   test('installHelm() - get latest version of helm and return its path', async () => {
      vi.spyOn(toolCache, 'find').mockReturnValue('')
      vi.spyOn(toolCache, 'downloadTool').mockResolvedValue('pathToTool')
      const response = JSON.stringify({
         tag_name: 'v4.0.0'
      })
      vi.spyOn(fs, 'readFileSync').mockReturnValue(response)
      vi.spyOn(os, 'type').mockReturnValue('Windows_NT')
      vi.spyOn(fs, 'chmodSync').mockImplementation(() => {})
      vi.spyOn(toolCache, 'extractZip').mockResolvedValue('pathToUnzippedHelm')
      vi.spyOn(toolCache, 'cacheDir').mockResolvedValue('pathToCachedDir')
      vi.spyOn(fs, 'readdirSync').mockImplementation((file, _) => [
         'helm.exe' as unknown as fs.Dirent<NonSharedBuffer>
      ])
      vi.spyOn(fs, 'statSync').mockImplementation((file) => {
         const isDirectory =
            (file as string).indexOf('folder') == -1 ? false : true
         return {isDirectory: () => isDirectory} as fs.Stats
      })
      vi.spyOn(core, 'debug').mockImplementation(() => {})

      expect(await helmUtil.installHelm('latest')).toBe(
         path.join('pathToCachedDir', 'helm.exe')
      )
   })

   test('getHelmPath() - download helm and return its path', async () => {
      vi.spyOn(core, 'getInput').mockReturnValue('v2.14.1')
      vi.spyOn(toolCache, 'find')
         .mockReturnValueOnce('')
         .mockReturnValueOnce('pathToCachedDir')
      vi.spyOn(os, 'type').mockReturnValue('Windows_NT')
      vi.spyOn(fs, 'readdirSync').mockImplementation((file, _) => [
         'helm.exe' as unknown as fs.Dirent<NonSharedBuffer>
      ])
      vi.spyOn(fs, 'statSync').mockImplementation((file) => {
         const isDirectory =
            (file as string).indexOf('folder') == -1 ? false : true
         return {isDirectory: () => isDirectory} as fs.Stats
      })
      vi.spyOn(fs, 'chmodSync').mockImplementation(() => {})

      expect(await helmUtil.getHelmPath()).toBe(
         path.join('pathToCachedDir', 'helm.exe')
      )
      expect(toolCache.find).toHaveBeenCalledWith('helm', 'v2.14.1')
   })

   test('getHelmPath() - return helm From toolCache', async () => {
      vi.spyOn(core, 'getInput').mockReturnValue('v2.14.1')
      vi.spyOn(toolCache, 'find').mockReturnValue('pathToCachedDir')
      vi.spyOn(os, 'type').mockReturnValue('Windows_NT')

      expect(await helmUtil.getHelmPath()).toBe(
         path.join('pathToCachedDir', 'helm.exe')
      )
      expect(toolCache.find).toHaveBeenCalledWith('helm', 'v2.14.1')
   })

   test('getHelmPath() - return path any version helm executable if version input not specified', async () => {
      vi.spyOn(core, 'getInput').mockReturnValue('')
      vi.spyOn(io, 'which').mockResolvedValue('pathToHelm')

      expect(await helmUtil.getHelmPath()).toBe('pathToHelm')
      expect(core.getInput).toHaveBeenCalledWith('helm-version', {
         required: false
      })
      expect(io.which).toHaveBeenCalledWith('helm', false)
   })

   test('getHelmPath() - return path to any version helm from tool cache', async () => {
      vi.spyOn(core, 'getInput').mockReturnValue('')
      vi.spyOn(io, 'which').mockResolvedValue('')
      vi.spyOn(toolCache, 'find').mockReturnValue('pathToCachedDir')
      vi.spyOn(toolCache, 'findAllVersions').mockReturnValue(['pathToHelm'])

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
      vi.spyOn(core, 'getInput').mockReturnValue('')
      vi.spyOn(io, 'which').mockResolvedValue('')
      vi.spyOn(toolCache, 'findAllVersions').mockReturnValue([])

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
      vi.spyOn(fs, 'readdirSync').mockImplementation((file, _) => [
         'helm.exe' as unknown as fs.Dirent<NonSharedBuffer>
      ])
      vi.spyOn(fs, 'chmodSync').mockImplementation(() => {})
      vi.spyOn(fs, 'statSync').mockImplementation((file) => {
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

   test('getHelmPath() - resolve semver range and download helm', async () => {
      const mockReleases = JSON.stringify([
         {tag_name: 'v3.12.0', prerelease: false, draft: false},
         {tag_name: 'v3.11.0', prerelease: false, draft: false}
      ])
      vi.spyOn(core, 'getInput').mockReturnValue('^3.0.0')
      vi.spyOn(toolCache, 'downloadTool').mockResolvedValue('pathToTool')
      vi.spyOn(fs, 'readFileSync').mockReturnValue(mockReleases)
      vi.spyOn(toolCache, 'find').mockReturnValue('pathToCachedDir')
      vi.spyOn(os, 'type').mockReturnValue('Windows_NT')
      vi.spyOn(core, 'debug').mockImplementation(() => {})
      vi.spyOn(core, 'info').mockImplementation(() => {})

      expect(await helmUtil.getHelmPath()).toBe(
         path.join('pathToCachedDir', 'helm.exe')
      )
      expect(toolCache.find).toHaveBeenCalledWith('helm', 'v3.12.0')
   })

   test('getHelmPath() - resolve tilde semver range', async () => {
      const mockReleases = JSON.stringify([
         {tag_name: 'v3.12.5', prerelease: false, draft: false},
         {tag_name: 'v3.12.0', prerelease: false, draft: false},
         {tag_name: 'v3.11.0', prerelease: false, draft: false}
      ])
      vi.spyOn(core, 'getInput').mockReturnValue('~3.12.0')
      vi.spyOn(toolCache, 'downloadTool').mockResolvedValue('pathToTool')
      vi.spyOn(fs, 'readFileSync').mockReturnValue(mockReleases)
      vi.spyOn(toolCache, 'find').mockReturnValue('pathToCachedDir')
      vi.spyOn(os, 'type').mockReturnValue('Windows_NT')
      vi.spyOn(core, 'debug').mockImplementation(() => {})
      vi.spyOn(core, 'info').mockImplementation(() => {})

      expect(await helmUtil.getHelmPath()).toBe(
         path.join('pathToCachedDir', 'helm.exe')
      )
      expect(toolCache.find).toHaveBeenCalledWith('helm', 'v3.12.5')
   })
})
