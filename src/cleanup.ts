// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as core from '@actions/core'
import fs from 'fs'
import path from 'path'
import {
   BAKE_OUTPUT_DIRNAME,
   BAKED_MANIFEST_PATTERN,
   CLEANUP_STATE_KEY
} from './constants.js'

// Removes the manifest bake wrote into the workspace. Deletes exactly the file
// the main step recorded, then the directory only if that leaves it empty.
//
// The parent is recomputed from GITHUB_WORKSPACE rather than taken from state,
// and the recorded name must be a bare filename matching the generated pattern,
// so state cannot steer the delete outside the directory.
export function cleanup() {
   const recorded = core.getState(CLEANUP_STATE_KEY)
   if (!recorded) {
      core.debug('No baked manifest recorded; nothing to clean up.')
      return
   }
   if (
      path.basename(recorded) !== recorded ||
      !BAKED_MANIFEST_PATTERN.test(recorded)
   ) {
      core.warning(
         `Ignoring unexpected recorded manifest name "${recorded}"; skipping cleanup.`
      )
      return
   }

   const workspace = process.env['GITHUB_WORKSPACE']
   if (!workspace) {
      core.debug('GITHUB_WORKSPACE is not set; nothing to clean up.')
      return
   }

   let directory: string
   try {
      const resolvedWorkspace = fs.realpathSync(path.resolve(workspace))
      const candidate = path.join(resolvedWorkspace, BAKE_OUTPUT_DIRNAME)
      if (!fs.existsSync(candidate)) {
         core.debug(`No baked manifest directory at ${candidate}.`)
         return
      }

      // Rejects a symlink planted at .k8s-bake pointing elsewhere.
      directory = fs.realpathSync(candidate)
      if (path.relative(resolvedWorkspace, directory) !== BAKE_OUTPUT_DIRNAME) {
         core.warning(
            `Refusing to clean ${candidate}: it resolves to ${directory}, outside the expected location.`
         )
         return
      }
      if (!fs.statSync(directory).isDirectory()) {
         core.warning(`Refusing to clean ${directory}: not a directory.`)
         return
      }
   } catch (err) {
      core.warning(`Skipping cleanup of the baked manifest directory: ${err}`)
      return
   }

   const file = path.join(directory, recorded)
   try {
      // lstat, not stat: never follow a symlink named like a manifest.
      if (fs.existsSync(file)) {
         if (fs.lstatSync(file).isFile()) {
            fs.unlinkSync(file)
            core.debug(`Removed baked manifest ${file}`)
         } else {
            core.warning(`Refusing to remove ${file}: not a regular file.`)
         }
      }
   } catch (err) {
      core.warning(`Failed to remove baked manifest ${file}: ${err}`)
   }

   // Non-recursive: fails rather than deleting anything bake did not write.
   try {
      fs.rmdirSync(directory)
      core.debug(`Removed baked manifest directory ${directory}`)
   } catch {
      core.debug(`Leaving ${directory} in place; it is not empty.`)
   }
}
