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
   getStableVerison,
   resolveHelmVersion
} from './utilities'

const helmToolName = 'helm'
export interface NameValuePair {
   name: string
   value: string
}

export function walkSync(dir, filelist = [], fileToFind) {
   const files = fs.readdirSync(dir)
   files.forEach(function (file) {
      if (fs.statSync(path.join(dir, file)).isDirectory()) {
         filelist = walkSync(path.join(dir, file), filelist, fileToFind)
      } else {
         core.debug(file)
         if (file == fileToFind) {
            filelist.push(path.join(dir, file))
         }
      }
   })
   return filelist
}

export async function downloadHelm(version: string): Promise<string> {
   if (!version) {
      version = await getStableVerison(helmToolName)
   }
   let cachedToolpath = toolCache.find(helmToolName, version)
   if (!cachedToolpath) {
      cachedToolpath = await setCachedToolPath(helmToolName, version)
   }
   const helmpath = findHelm(cachedToolpath)
   if (!helmpath) {
      throw new Error(
         util.format('Helm executable not found in path ', cachedToolpath)
      )
   }

   fs.chmodSync(helmpath, '777')
   return helmpath
}

export function findHelm(rootFolder: string): string {
   fs.chmodSync(rootFolder, '777')
   const filelist: string[] = []
   walkSync(rootFolder, filelist, helmToolName + getExecutableExtension())
   if (!filelist) {
      throw new Error(
         util.format('Helm executable not found in path ', rootFolder)
      )
   } else {
      return filelist[0]
   }
}

export async function getHelmPath() {
   let helmPath = ''
   let version = core.getInput('helm-version', {required: false})
   if (version) {
      // Resolve semver range to a specific version
      version = await resolveHelmVersion(version)

      if (!!version && version != LATEST) {
         helmPath = toolCache.find(helmToolName, version)
      }
      if (helmPath) {
         helmPath = findHelm(helmPath)
      } else {
         helmPath = await installHelm(version)
      }
   } else {
      helmPath = await io.which(helmToolName, false)
      if (!helmPath) {
         const allVersions = toolCache.findAllVersions(helmToolName)
         helmPath =
            allVersions.length > 0
               ? toolCache.find(helmToolName, allVersions[0])
               : ''
         if (!helmPath) {
            throw new Error(
               'helm is not installed, either add setup-helm action or provide "helm-version" input to download helm'
            )
         }
         helmPath = findHelm(helmPath)
      }
   }

   core.debug(util.format('Helm executable path %s', helmPath))
   return helmPath
}

export async function installHelm(version: string) {
   if (isEqual(version, LATEST)) {
      version = await getStableVerison(helmToolName)
   }
   core.debug(util.format('Downloading helm version %s', version))
   return await downloadHelm(version)
}
