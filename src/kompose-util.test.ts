import {vi} from 'vitest'
import * as komposeUtil from './kompose-util.js'
import os from 'os'
import fs from 'fs'
import path from 'path'
import * as toolCache from '@actions/tool-cache'
import * as core from '@actions/core'
import * as io from '@actions/io'

describe('Testing all functions in kompose-util file.', () => {
   test('downloadKompose() - return path to kompose from toolCache', async () => {
      vi.spyOn(toolCache, 'find').mockReturnValue('pathToCachedTool')
      vi.spyOn(fs, 'chmodSync').mockImplementation(() => {})
      vi.spyOn(os, 'type').mockReturnValue('Windows_NT')

      expect(await komposeUtil.downloadKompose('v1.18.0')).toBe(
         path.join('pathToCachedTool', 'kompose.exe')
      )
      expect(fs.chmodSync).toHaveBeenCalledWith(
         path.join('pathToCachedTool', 'kompose.exe'),
         0o100
      )
      expect(toolCache.find).toHaveBeenCalledWith('kompose', 'v1.18.0')
   })

   test('downloadKompose() - download kompose, cache it and return path', async () => {
      vi.spyOn(toolCache, 'find').mockReturnValue('')
      vi.spyOn(toolCache, 'downloadTool').mockResolvedValue('pathToTool')
      vi.spyOn(toolCache, 'cacheFile').mockResolvedValue('pathToCachedTool')
      vi.spyOn(fs, 'chmodSync').mockImplementation(() => {})
      vi.spyOn(os, 'type').mockReturnValue('Windows_NT')

      expect(await komposeUtil.downloadKompose('v1.18.0')).toBe(
         path.join('pathToCachedTool', 'kompose.exe')
      )
      expect(toolCache.downloadTool).toHaveBeenCalledWith(
         'https://github.com/kubernetes/kompose/releases/download/v1.18.0/kompose-windows-amd64.exe'
      )
      expect(fs.chmodSync).toHaveBeenCalledWith(
         path.join('pathToCachedTool', 'kompose.exe'),
         0o100
      )
      expect(toolCache.find).toHaveBeenCalledWith('kompose', 'v1.18.0')
   })

   test('downloadKompose() - throw error when unable to download', async () => {
      vi.spyOn(toolCache, 'find').mockReturnValue('')
      vi.spyOn(toolCache, 'downloadTool').mockImplementation(async () => {
         throw 'Unable to download.'
      })

      await expect(komposeUtil.downloadKompose('v1.18.0')).rejects.toThrow(
         'Failed to download the kompose from https://github.com/kubernetes/kompose/releases/download/v1.18.0/kompose-windows-amd64.exe.  Error: Unable to download.'
      )
      expect(toolCache.find).toHaveBeenCalledWith('kompose', 'v1.18.0')
   })

   test('installKompose() - return path kompose from cache', async () => {
      vi.spyOn(toolCache, 'find').mockReturnValue('pathToCachedTool')
      vi.spyOn(fs, 'chmodSync').mockImplementation(() => {})
      vi.spyOn(os, 'type').mockReturnValue('Windows_NT')
      vi.spyOn(core, 'debug').mockImplementation(() => {})

      expect(await komposeUtil.installKompose('v1.20.0')).toBe(
         path.join('pathToCachedTool', 'kompose.exe')
      )
   })

   test('installKompose() - return path to kompose v1.18.0 when input is latest', async () => {
      vi.spyOn(toolCache, 'find').mockReturnValue('pathToCachedTool')
      vi.spyOn(fs, 'chmodSync').mockImplementation(() => {})
      vi.spyOn(os, 'type').mockReturnValue('Windows_NT')
      vi.spyOn(core, 'debug').mockImplementation(() => {})

      expect(await komposeUtil.installKompose('latest')).toBe(
         path.join('pathToCachedTool', 'kompose.exe')
      )
   })

   test('getKomposePath() - return path to latest version kompose from toolCache', async () => {
      vi.spyOn(core, 'getInput').mockReturnValue('latest')
      vi.spyOn(toolCache, 'find').mockReturnValue('pathToCachedTool')
      vi.spyOn(fs, 'chmodSync').mockImplementation(() => {})
      vi.spyOn(os, 'type').mockReturnValue('Windows_NT')

      expect(await komposeUtil.getKomposePath()).toBe(
         path.join('pathToCachedTool', 'kompose.exe')
      )
      expect(core.getInput).toHaveBeenCalledWith('kompose-version', {
         required: false
      })
      expect(toolCache.find).toHaveBeenCalledWith('kompose', 'v1.37.0')
   })

   test('getKomposePath() - return path to specified version kompose from toolCache', async () => {
      vi.spyOn(core, 'getInput').mockReturnValue('v2.0.0')
      vi.spyOn(toolCache, 'find').mockReturnValue('pathToCachedTool')
      vi.spyOn(fs, 'chmodSync').mockImplementation(() => {})
      vi.spyOn(os, 'type').mockReturnValue('Windows_NT')

      expect(await komposeUtil.getKomposePath()).toBe('pathToCachedTool')
      expect(core.getInput).toHaveBeenCalledWith('kompose-version', {
         required: false
      })
      expect(toolCache.find).toHaveBeenCalledWith('kompose', 'v2.0.0')
   })

   test('getKomposePath() - return path to any version executable when input is not given', async () => {
      vi.spyOn(core, 'getInput').mockReturnValue('')
      vi.spyOn(io, 'which').mockResolvedValue('pathToTool')

      expect(await komposeUtil.getKomposePath()).toBe('pathToTool')
      expect(core.getInput).toHaveBeenCalledWith('kompose-version', {
         required: false
      })
      expect(io.which).toHaveBeenCalledWith('kompose', false)
   })

   test('getKomposePath() - return path to any version kompose from toolCache when input is not given', async () => {
      vi.spyOn(core, 'getInput').mockReturnValue('')
      vi.spyOn(io, 'which').mockResolvedValue('')
      vi.spyOn(toolCache, 'findAllVersions').mockReturnValue([
         'v2.0.0',
         'v2.0.1'
      ])
      vi.spyOn(toolCache, 'find').mockReturnValue('pathToTool')
      vi.spyOn(os, 'type').mockReturnValue('Windows_NT')

      expect(await komposeUtil.getKomposePath()).toBe(
         path.join('pathToTool', 'kompose.exe')
      )
      expect(core.getInput).toHaveBeenCalledWith('kompose-version', {
         required: false
      })
      expect(io.which).toHaveBeenCalledWith('kompose', false)
      expect(toolCache.findAllVersions).toHaveBeenCalledWith('kompose')
      expect(toolCache.find).toHaveBeenCalledWith('kompose', 'v2.0.0')
   })

   test('getKomposePath() - throw error when version input is not given and not kompose already exists', async () => {
      vi.spyOn(core, 'getInput').mockReturnValue('')
      vi.spyOn(io, 'which').mockResolvedValue('')
      vi.spyOn(toolCache, 'findAllVersions').mockReturnValue([])

      await expect(komposeUtil.getKomposePath()).rejects.toThrow(
         'kompose is not installed, provide "kompose-version" input to download kompose'
      )
      expect(core.getInput).toHaveBeenCalledWith('kompose-version', {
         required: false
      })
      expect(io.which).toHaveBeenCalledWith('kompose', false)
      expect(toolCache.findAllVersions).toHaveBeenCalledWith('kompose')
   })
})
