// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import * as util from 'util';
import { getExecutableExtension, isEqual, setCachedToolPath, LATEST } from "./utilities"

import * as toolCache from '@actions/tool-cache';
import * as core from '@actions/core';
import * as io from '@actions/io';

const komposeToolName = 'kompose';
const stableKomposeVersion = "v1.18.0";

export async function getKomposePath() {
    let komposePath = "";
    const version = core.getInput('kompose-version', { required: false });
    if (version) {
        if ( !!version && version != LATEST ){
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

export async function downloadKompose(version: string=stableKomposeVersion): Promise<string> {
    let cachedToolpath = toolCache.find(komposeToolName, version);
    if (!cachedToolpath) {
        cachedToolpath = await setCachedToolPath('kompose', version);
    }

    const komposePath = path.join(cachedToolpath, komposeToolName + getExecutableExtension());
    fs.chmodSync(komposePath, 0o100); // execute/search by owner permissions to the tool
    return komposePath;
}

export async function installKompose(version: string) {
    if (isEqual(version, LATEST)) {
        version = stableKomposeVersion;
    }
    core.debug(util.format("Downloading kompose version %s", version));
    return await downloadKompose(version);
}