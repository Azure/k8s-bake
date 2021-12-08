// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as os from 'os';
import * as fs from 'fs';
import * as util from 'util';
import { ToolRunner } from '@actions/exec/lib/toolrunner';
import { ExecOptions } from "@actions/exec/lib/interfaces";
import * as toolCache from '@actions/tool-cache';
import * as core from '@actions/core';

export interface ExecResult {
    stdout: string;
    stderr: string
}

export function getCurrentTime(): number {
    return new Date().getTime();
}

export function isEqual(str1: string, str2: string) {
    if (!str1) str1 = "";
    if (!str2) str2 = "";
    return str1.toLowerCase() === str2.toLowerCase();
}

export function getExecutableExtension(): string {
    if (os.type().match(/^Win/)) {
        return '.exe';
    }
    return '';
}

export async function execCommand(toolPath: string, args: string[], options: ExecOptions = {} as ExecOptions) : Promise<ExecResult> {
    const execResult = {
        stdout : "",
        stderr : ""
    } as ExecResult;
    
    options.listeners =  {
            stdout: (data: Buffer) => {
                execResult.stdout += data.toString();
            },
            stderr: (data: Buffer) => {
                execResult.stderr += data.toString();
            }
        }

    let toolRunner = new ToolRunner(toolPath, args, options);
    const result = await toolRunner.exec();
    if (result != 0) {
        if (!!execResult.stderr) {
            throw Error(execResult.stderr);
        }
        else {
            throw Error(util.format("%s exited with result code %s", toolPath, result));
        }
    }

    return execResult;
}



export async function setCachedToolPath(toolName:string, version : string) {
    let cachedToolpath = ''
    let downloadPath = ''
    const downloadUrl = getDownloadUrl(toolName, version);

    try {
        downloadPath = await toolCache.downloadTool(downloadUrl);
    } catch(exeption) {
        throw new Error(`Failed to download the ${toolName} from ${downloadUrl}.  Error: ${exeption}`)
    }

    if(toolName == 'helm') {
        fs.chmodSync(downloadPath, '777');
        const unzipedHelmPath = await toolCache.extractZip(downloadPath);
        cachedToolpath = await toolCache.cacheDir(unzipedHelmPath, toolName, version);
    } else {
        cachedToolpath = await toolCache.cacheFile(downloadPath, toolName + getExecutableExtension(), toolName, version);
    }

    return cachedToolpath
}

export function getDownloadUrl(toolName : string, version: string): string {
    const system = os.type()
    if (!downloadLinks[system] || !downloadLinks[system][toolName]) {
        throw Error("Unknown OS or render engine type");
    }

    return util.format(downloadLinks[system][toolName], version)
}

export async function getStableVerison(toolName : string){
    if(!stableVersionUrls[toolName]){
        throw Error("Unable to download. Unknown tool name");
    }

    return toolCache.downloadTool(stableVersionUrls[toolName]).then(downloadPath => {
        let response = fs.readFileSync(downloadPath, 'utf8').toString().trim();
        if(toolName == 'helm'){
            const versionTag = JSON.parse(response);
            return versionTag.tag_name ? versionTag.tag_name : defaultStableHelmVersion;
        } else {
            return response ? response : defaultStableKubectlVersion;
        }
    }, err => {
        core.debug(err);
        core.warning(util.format("Failed to read latest %s version from URL %s. Using default stable version %s", toolName, stableVersionUrls[toolName] ,toolName == 'helm' ? defaultStableHelmVersion: defaultStableKubectlVersion));
        return toolName == 'helm' ? defaultStableHelmVersion: defaultStableKubectlVersion;
    })
}

const defaultStableHelmVersion = 'v2.14.1';
const defaultStableKubectlVersion = 'v1.15.0';

const stableVersionUrls = {
    'kubectl' : 'https://storage.googleapis.com/kubernetes-release/release/stable.txt',
    'helm': 'https://api.github.com/repos/helm/helm/releases/latest',
}

const downloadLinks = {
    'Linux': {
        'helm' : 'https://get.helm.sh/helm-%s-linux-amd64.zip',
        'kompose' : 'https://github.com/kubernetes/kompose/releases/download/%s/kompose-linux-amd64', 
        'kubectl' : 'https://storage.googleapis.com/kubernetes-release/release/%s/bin/linux/amd64/kubectl'
    },
    'Darwin' : {
        'helm' : 'https://get.helm.sh/helm-%s-darwin-amd64.zip',
        'kompose' : 'https://github.com/kubernetes/kompose/releases/download/%s/kompose-darwin-amd64', 
        'kubectl' : 'https://storage.googleapis.com/kubernetes-release/release/%s/bin/darwin/amd64/kubectl'
    },
    'Windows_NT' : {
        'helm' : 'https://get.helm.sh/helm-%s-windows-amd64.zip',
        'kompose' : 'https://github.com/kubernetes/kompose/releases/download/%s/kompose-windows-amd64.exe', 
        'kubectl' : 'https://storage.googleapis.com/kubernetes-release/release/%s/bin/windows/amd64/kubectl.exe'
    }
}

export const LATEST = 'latest';
export const MIN_KUBECTL_CLIENT_VERSION = "1.14"

