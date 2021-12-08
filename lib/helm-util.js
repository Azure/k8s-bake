"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.installHelm = exports.getHelmPath = exports.findHelm = exports.downloadHelm = exports.walkSync = void 0;
const path = require("path");
const util = require("util");
const fs = require("fs");
const utilities_1 = require("./utilities");
const toolCache = require("@actions/tool-cache");
const core = require("@actions/core");
const io = require("@actions/io");
const helmToolName = 'helm';
function walkSync(dir, filelist = [], fileToFind) {
    const files = fs.readdirSync(dir);
    files.forEach(function (file) {
        if (fs.statSync(path.join(dir, file)).isDirectory()) {
            filelist = walkSync(path.join(dir, file), filelist, fileToFind);
        }
        else {
            core.debug(file);
            if (file == fileToFind) {
                filelist.push(path.join(dir, file));
            }
        }
    });
    return filelist;
}
exports.walkSync = walkSync;
;
function downloadHelm(version) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!version) {
            version = yield (0, utilities_1.getStableVerison)(helmToolName);
        }
        let cachedToolpath = toolCache.find(helmToolName, version);
        if (!cachedToolpath) {
            cachedToolpath = yield (0, utilities_1.setCachedToolPath)('helm', version);
        }
        const helmpath = findHelm(cachedToolpath);
        if (!helmpath) {
            throw new Error(util.format("Helm executable not found in path ", cachedToolpath));
        }
        fs.chmodSync(helmpath, '777');
        return helmpath;
    });
}
exports.downloadHelm = downloadHelm;
function findHelm(rootFolder) {
    fs.chmodSync(rootFolder, '777');
    const filelist = [];
    walkSync(rootFolder, filelist, helmToolName + (0, utilities_1.getExecutableExtension)());
    if (!filelist) {
        throw new Error(util.format("Helm executable not found in path ", rootFolder));
    }
    else {
        return filelist[0];
    }
}
exports.findHelm = findHelm;
function getHelmPath() {
    return __awaiter(this, void 0, void 0, function* () {
        let helmPath = "";
        const version = core.getInput('helm-version', { required: false });
        if (version) {
            if (!!version && version != utilities_1.LATEST) {
                helmPath = toolCache.find('helm', version);
            }
            if (!helmPath) {
                helmPath = yield installHelm(version);
            }
        }
        else {
            helmPath = yield io.which('helm', false);
            if (!helmPath) {
                const allVersions = toolCache.findAllVersions('helm');
                helmPath = allVersions.length > 0 ? toolCache.find('helm', allVersions[0]) : '';
                if (!helmPath) {
                    throw new Error('helm is not installed, either add setup-helm action or provide "helm-version" input to download helm');
                }
                helmPath = path.join(helmPath, `helm${(0, utilities_1.getExecutableExtension)()}`);
            }
        }
        core.debug(util.format("Helm executable path %s", helmPath));
        return helmPath;
    });
}
exports.getHelmPath = getHelmPath;
function installHelm(version) {
    return __awaiter(this, void 0, void 0, function* () {
        if ((0, utilities_1.isEqual)(version, utilities_1.LATEST)) {
            version = yield (0, utilities_1.getStableVerison)(helmToolName);
        }
        core.debug(util.format("Downloading helm version %s", version));
        return yield downloadHelm(version);
    });
}
exports.installHelm = installHelm;
