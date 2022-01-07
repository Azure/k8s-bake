// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as os from 'os';
import * as path from 'path';
import * as util from 'util';
import * as fs from 'fs';
import { getExecutableExtension, isEqual } from "./utilities"

import * as toolCache from '@actions/tool-cache';
import * as core from '@actions/core';
import * as io from '@actions/io';

const kubectlToolName = 'kubectl';
const stableKubectlVersion = 'v1.15.0';
const stableVersionUrl = 'https://storage.googleapis.com/kubernetes-release/release/stable.txt';

export function getkubectlDownloadURL(version: string): string {
    switch (os.type()) {
        case 'Linux':
            switch (os.arch()) {
                case 'arm64':
                    return util.format('https://storage.googleapis.com/kubernetes-release/release/%s/bin/linux/arm64/kubectl', version);
                case 'x64':
                    return util.format('https://storage.googleapis.com/kubernetes-release/release/%s/bin/linux/amd64/kubectl', version);
            }

        case 'Darwin':
            return util.format('https://storage.googleapis.com/kubernetes-release/release/%s/bin/darwin/amd64/kubectl', version);

        case 'Windows_NT':
        default:
            return util.format('https://storage.googleapis.com/kubernetes-release/release/%s/bin/windows/amd64/kubectl.exe', version);

    }
}

export async function getStableKubectlVersion(): Promise<string> {
    return toolCache.downloadTool(stableVersionUrl).then((downloadPath) => {
        let version = fs.readFileSync(downloadPath, 'utf8').toString().trim();
        if (!version) {
            version = stableKubectlVersion;
        }
        return version;
    }, (error) => {
        core.debug(error);
        core.warning(util.format("Failed to read latest kubectl version from stable.txt. From URL %s. Using default stable version %s", stableVersionUrl, stableKubectlVersion));
        return stableKubectlVersion;
    });
}

export async function downloadKubectl(version: string): Promise<string> {
    let cachedToolpath = toolCache.find(kubectlToolName, version);
    let kubectlDownloadPath = '';
    if (!cachedToolpath) {
        try {
            kubectlDownloadPath = await toolCache.downloadTool(getkubectlDownloadURL(version));
        } catch (exception) {
            throw new Error(util.format("Cannot download the kubectl client of version %s. Check if the version is correct https://github.com/kubernetes/kubernetes/releases. Error: %s", version, exception));
        }

        cachedToolpath = await toolCache.cacheFile(kubectlDownloadPath, kubectlToolName + getExecutableExtension(), kubectlToolName, version);
    }

    const kubectlPath = path.join(cachedToolpath, kubectlToolName + getExecutableExtension());
    fs.chmodSync(kubectlPath, '777');
    return kubectlPath;
}


export async function getKubectlPath() {
    var kubectlPath = "";
    if (core.getInput('kubectl-version', { required: false })) {
        var version = core.getInput('kubectl-version', { required: false });
        if ( !!version && version != "latest" ){
            const cachedToolPath = toolCache.find('kubectl', version);
            kubectlPath = path.join(cachedToolPath, kubectlToolName + getExecutableExtension())
        }

        if (!kubectlPath) {
            kubectlPath = await installKubectl(version);
        }
    } else {
        kubectlPath = await io.which('kubectl', false);
        if (!kubectlPath) {
            const allVersions = toolCache.findAllVersions('kubectl');
            kubectlPath = allVersions.length > 0 ? toolCache.find('kubectl', allVersions[0]) : '';
            if (!kubectlPath) {
                throw new Error('Kubectl is not installed, either add install-kubectl action or provide "kubectl-version" input to download kubectl');
            }
            kubectlPath = path.join(kubectlPath, `kubectl${getExecutableExtension()}`);
        }
    }

    return kubectlPath
}

export async function installKubectl(version: string) {
    if (isEqual(version, 'latest')) {
        version = await getStableKubectlVersion();
    }
    core.debug(util.format("Downloading kubectl version %s", version));
    return await downloadKubectl(version);
}
