// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import * as util from 'util';
import { getExecutableExtension, isEqual } from "./utilities"

import * as toolCache from '@actions/tool-cache';
import * as core from '@actions/core';
import * as io from '@actions/io';

const komposeToolName = 'kompose';
const stableKomposeVersion = "v1.18.0";

export async function getKomposePath() {
    var komposePath = "";
    if (core.getInput('kompose-version', { required: false })) {
        var version = core.getInput('kompose-version', { required: false });
        if ( !!version && version != "latest" ){
            komposePath = toolCache.find('kompose', version);
        }
        
        if (!komposePath) {
            komposePath = await installKompose(version);
        }
    } else {
        komposePath = await io.which('kompose', false);
        if (!komposePath) {
            const allVersions = toolCache.findAllVersions('kompose');
            komposePath = allVersions.length > 0 ? toolCache.find('kompose', allVersions[0]) : '';
            if (!komposePath) {
                throw new Error('kompose is not installed, provide "kompose-version" input to download kompose');
            }
            komposePath = path.join(komposePath, `kompose${getExecutableExtension()}`);
        }
    }

    return komposePath;
}

export async function downloadKompose(version: string): Promise<string> {
    let cachedToolpath = toolCache.find(komposeToolName, version);
    let komposeDownloadPath = '';
    if (!cachedToolpath) {
        try {
            komposeDownloadPath = await toolCache.downloadTool(getDownloadUrl(version));
        } catch (exception) {
            throw new Error(util.format("Cannot download the kompose version %s. Check if the version is correct https://github.com/kubernetes/kompose/releases. Error: %s", version, exception));
        }

        cachedToolpath = await toolCache.cacheFile(komposeDownloadPath, komposeToolName + getExecutableExtension(), komposeToolName, version);
    }

    const komposePath = path.join(cachedToolpath, komposeToolName + getExecutableExtension());
    fs.chmodSync(komposePath, 0o100); // execute/search by owner permissions to the tool
    return komposePath;
}

export async function installKompose(version: string) {
    if (isEqual(version, 'latest')) {
        version = stableKomposeVersion;
    }
    core.debug(util.format("Downloading kompose version %s", version));
    return await downloadKompose(version);
}

export function getDownloadUrl(version): string {
    switch (os.type()) {
        case 'Linux':
            return `https://github.com/kubernetes/kompose/releases/download/${version}/kompose-linux-amd64`;
        case 'Darwin':
            return `https://github.com/kubernetes/kompose/releases/download/${version}/kompose-darwin-amd64`;
        case 'Windows_NT':
            return `https://github.com/kubernetes/kompose/releases/download/${version}/kompose-windows-amd64.exe`;
        default:
            throw Error('Unknown OS type');
    }
}