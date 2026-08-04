import {vi} from 'vitest'
import * as core from '@actions/core'
import fs from 'fs'
import os from 'os'
import path from 'path'
import * as utils from './utilities.js'
import {getBakedManifestPath} from './bake.js'
import {cleanup} from './cleanup.js'

describe('getBakedManifestPath', () => {
   let workspace: string
   let runnerTemp: string
   let savedWorkspace: string | undefined
   let savedTemp: string | undefined

   const FILENAME = 'baked-template-12345678.yaml'

   beforeEach(() => {
      savedWorkspace = process.env['GITHUB_WORKSPACE']
      savedTemp = process.env['RUNNER_TEMP']
      workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-'))
      runnerTemp = fs.mkdtempSync(path.join(os.tmpdir(), 'rt-'))
      process.env['GITHUB_WORKSPACE'] = workspace
      process.env['RUNNER_TEMP'] = runnerTemp
      vi.spyOn(utils, 'getCurrentTime').mockReturnValue(12345678)
      vi.spyOn(core, 'getInput').mockReturnValue('')
   })

   afterEach(() => {
      if (savedWorkspace === undefined) delete process.env['GITHUB_WORKSPACE']
      else process.env['GITHUB_WORKSPACE'] = savedWorkspace
      if (savedTemp === undefined) delete process.env['RUNNER_TEMP']
      else process.env['RUNNER_TEMP'] = savedTemp
      fs.rmSync(workspace, {recursive: true, force: true})
      fs.rmSync(runnerTemp, {recursive: true, force: true})
      vi.restoreAllMocks()
   })

   it('defaults to .k8s-bake inside the workspace', () => {
      const result = getBakedManifestPath()
      expect(result).toBe(
         path.join(workspace, utils.BAKE_OUTPUT_DIRNAME, FILENAME)
      )
   })

   it('creates the default output directory', () => {
      getBakedManifestPath()
      const dir = path.join(workspace, utils.BAKE_OUTPUT_DIRNAME)
      expect(fs.existsSync(dir)).toBe(true)
      expect(fs.statSync(dir).isDirectory()).toBe(true)
   })

   // k8s-deploy v7 rejects anything resolving outside GITHUB_WORKSPACE.
   it('produces a path inside the workspace by default', () => {
      const result = getBakedManifestPath()
      const rel = path.relative(workspace, result)
      expect(rel.startsWith('..')).toBe(false)
      expect(path.isAbsolute(rel)).toBe(false)
   })

   it('records the generated filename, not a path', () => {
      const result = getBakedManifestPath()
      expect(core.saveState).toHaveBeenCalledWith(
         utils.CLEANUP_STATE_KEY,
         path.basename(result)
      )
      expect(utils.BAKED_MANIFEST_PATTERN.test(path.basename(result))).toBe(
         true
      )
   })

   it('falls back to RUNNER_TEMP when GITHUB_WORKSPACE is unset', () => {
      delete process.env['GITHUB_WORKSPACE']
      expect(getBakedManifestPath()).toBe(path.join(runnerTemp, FILENAME))
      expect(core.warning).toHaveBeenCalledWith(
         expect.stringContaining('GITHUB_WORKSPACE is not set')
      )
   })

   it('records nothing when falling back to RUNNER_TEMP', () => {
      delete process.env['GITHUB_WORKSPACE']
      getBakedManifestPath()
      expect(core.saveState).not.toHaveBeenCalled()
   })

   it('throws when neither workspace nor temp dir is available', () => {
      delete process.env['GITHUB_WORKSPACE']
      delete process.env['RUNNER_TEMP']
      expect(() => getBakedManifestPath()).toThrow(
         'Unable to determine an output directory'
      )
   })
})

describe('cleanup', () => {
   let workspace: string
   let outsider: string
   let bakeDir: string
   let savedWorkspace: string | undefined

   const baked = (n: number) => `${utils.BAKED_MANIFEST_PREFIX}${n}.yaml`
   const record = (name: string) =>
      vi.spyOn(core, 'getState').mockReturnValue(name)

   beforeEach(() => {
      savedWorkspace = process.env['GITHUB_WORKSPACE']
      workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-'))
      outsider = fs.mkdtempSync(path.join(os.tmpdir(), 'outside-'))
      bakeDir = path.join(workspace, utils.BAKE_OUTPUT_DIRNAME)
      process.env['GITHUB_WORKSPACE'] = workspace
   })

   afterEach(() => {
      // Restore before removing: one test mocks fs to throw.
      vi.restoreAllMocks()
      if (savedWorkspace === undefined) delete process.env['GITHUB_WORKSPACE']
      else process.env['GITHUB_WORKSPACE'] = savedWorkspace
      fs.rmSync(workspace, {recursive: true, force: true})
      fs.rmSync(outsider, {recursive: true, force: true})
   })

   it('removes the recorded manifest and the now-empty directory', () => {
      fs.mkdirSync(bakeDir)
      fs.writeFileSync(path.join(bakeDir, baked(1)), 'kind: Service')
      record(baked(1))
      cleanup()
      expect(fs.existsSync(bakeDir)).toBe(false)
   })

   // Bake records the one filename it generated.
   it('preserves a pre-existing manifest it did not generate', () => {
      fs.mkdirSync(bakeDir)
      const theirs = path.join(bakeDir, baked(123))
      const ours = path.join(bakeDir, baked(456))
      fs.writeFileSync(theirs, 'not mine')
      fs.writeFileSync(ours, 'kind: Service')
      record(baked(456))

      cleanup()

      expect(fs.readFileSync(theirs, 'utf8')).toBe('not mine')
      expect(fs.existsSync(ours)).toBe(false)
      expect(fs.existsSync(bakeDir)).toBe(true)
   })

   // post.ts runs even when the main step failed before generating anything.
   it('does nothing when no manifest was recorded', () => {
      fs.mkdirSync(bakeDir)
      const theirs = path.join(bakeDir, baked(123))
      fs.writeFileSync(theirs, 'not mine')
      record('')

      cleanup()

      expect(fs.readFileSync(theirs, 'utf8')).toBe('not mine')
      expect(fs.existsSync(bakeDir)).toBe(true)
   })

   it('removes an empty directory when the manifest was never written', () => {
      fs.mkdirSync(bakeDir)
      record(baked(1))
      cleanup()
      expect(fs.existsSync(bakeDir)).toBe(false)
   })

   it('preserves a pre-existing user file and keeps the directory', () => {
      fs.mkdirSync(bakeDir)
      const userFile = path.join(bakeDir, 'user-file.txt')
      fs.writeFileSync(userFile, 'mine')
      fs.writeFileSync(path.join(bakeDir, baked(1)), 'kind: Service')
      record(baked(1))

      cleanup()

      expect(fs.readFileSync(userFile, 'utf8')).toBe('mine')
      expect(fs.existsSync(path.join(bakeDir, baked(1)))).toBe(false)
      expect(fs.existsSync(bakeDir)).toBe(true)
   })

   it('preserves a user subdirectory', () => {
      fs.mkdirSync(bakeDir)
      fs.mkdirSync(path.join(bakeDir, 'nested'))
      fs.writeFileSync(path.join(bakeDir, 'nested', 'keep.yaml'), 'kind: X')
      record(baked(1))
      cleanup()
      expect(fs.existsSync(path.join(bakeDir, 'nested', 'keep.yaml'))).toBe(
         true
      )
   })

   it('does nothing when the directory is absent', () => {
      record(baked(1))
      expect(() => cleanup()).not.toThrow()
   })

   // State travels as a STATE_* env var, so the recorded name is untrusted.
   it.each([
      ['traversal', '../../../etc/passwd'],
      ['absolute path', '/etc/passwd'],
      ['nested path', 'sub/baked-template-1.yaml'],
      ['traversal with valid basename', `../${'baked-template-1.yaml'}`],
      ['non-matching name', 'user-file.txt'],
      ['near miss', 'baked-template-abc.yaml']
   ])('rejects a recorded name with %s', (_label, value) => {
      fs.mkdirSync(bakeDir)
      const victim = path.join(outsider, 'data.txt')
      fs.writeFileSync(victim, 'do not delete')
      fs.writeFileSync(path.join(bakeDir, 'user-file.txt'), 'mine')
      record(value)

      cleanup()

      expect(fs.existsSync(victim)).toBe(true)
      expect(fs.existsSync(path.join(bakeDir, 'user-file.txt'))).toBe(true)
      expect(core.warning).toHaveBeenCalledWith(
         expect.stringContaining('Ignoring unexpected recorded manifest name')
      )
   })

   it('refuses to follow a symlink planted at .k8s-bake', () => {
      const victim = path.join(outsider, 'precious')
      fs.mkdirSync(victim)
      fs.writeFileSync(path.join(victim, baked(1)), 'do not delete')
      fs.symlinkSync(victim, bakeDir)
      record(baked(1))

      cleanup()

      expect(fs.existsSync(path.join(victim, baked(1)))).toBe(true)
      expect(core.warning).toHaveBeenCalledWith(
         expect.stringContaining('outside the expected location')
      )
   })

   // A symlink named like a manifest must not delete its target.
   it('does not follow a symlink named like a baked manifest', () => {
      fs.mkdirSync(bakeDir)
      const victim = path.join(outsider, 'data.txt')
      fs.writeFileSync(victim, 'do not delete')
      fs.symlinkSync(victim, path.join(bakeDir, baked(1)))
      record(baked(1))

      cleanup()

      expect(fs.existsSync(victim)).toBe(true)
      expect(core.warning).toHaveBeenCalledWith(
         expect.stringContaining('not a regular file')
      )
   })

   it('refuses to act on a plain file at .k8s-bake', () => {
      fs.writeFileSync(bakeDir, 'not a directory')
      record(baked(1))
      cleanup()
      expect(fs.existsSync(bakeDir)).toBe(true)
      expect(core.warning).toHaveBeenCalledWith(
         expect.stringContaining('not a directory')
      )
   })

   it('skips when GITHUB_WORKSPACE is unset', () => {
      fs.mkdirSync(bakeDir)
      fs.writeFileSync(path.join(bakeDir, baked(1)), 'kind: Service')
      record(baked(1))
      delete process.env['GITHUB_WORKSPACE']
      cleanup()
      expect(fs.existsSync(bakeDir)).toBe(true)
   })

   it('warns rather than failing the job when the delete fails', () => {
      fs.mkdirSync(bakeDir)
      fs.writeFileSync(path.join(bakeDir, baked(1)), 'kind: Service')
      record(baked(1))
      vi.spyOn(fs, 'unlinkSync').mockImplementation(() => {
         throw new Error('EPERM')
      })
      expect(() => cleanup()).not.toThrow()
      expect(core.warning).toHaveBeenCalledWith(
         expect.stringContaining('Failed to remove baked manifest')
      )
   })
})
