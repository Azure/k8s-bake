// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as path from 'path';
import * as fs from 'fs';
import * as util from 'util';
import * as toolCache from '@actions/tool-cache';
import * as core from '@actions/core';
import * as io from '@actions/io';
import { getExecutableExtension, isEqual, setCachedToolPath, LATEST } from "./utilities"

const komposeToolName = 'kompose';
const stableKomposeVersion = "v1.18.0";

export async function getKomposePath() {
    let komposePath = "";
    const version = core.getInput('kompose-version', { required: false });
    if (version) {
        if ( !!version && version != LATEST ){
            komposePath = toolCache.find(komposeToolName, version);
        }
        
        if (!komposePath) {
            komposePath = await installKompose(version);
        }
    } else {
        komposePath = await io.which(komposeToolName, false);
        if (!komposePath) {
            const allVersions = toolCache.findAllVersions(komposeToolName);
            komposePath = allVersions.length > 0 ? toolCache.find(komposeToolName, allVersions[0]) : '';
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
        cachedToolpath = await setCachedToolPath(komposeToolName, version);
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