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
const os = require("os");
const path = require("path");
const util = require("util");
const fs = require("fs");
const utilities_1 = require("./utilities");
const toolCache = require("@actions/tool-cache");
const core = require("@actions/core");
const io = require("@actions/io");
const helmToolName = 'helm';
const stableHelmVersion = 'v2.14.1';
const helmLatestReleaseUrl = 'https://api.github.com/repos/helm/helm/releases/latest';

function getHelmDownloadURL(version) {
    switch (os.type()) {
        case 'Linux':
            return util.format('https://get.helm.sh/helm-%s-linux-amd64.zip', version);
        case 'Darwin':
            return util.format('https://get.helm.sh/helm-%s-darwin-amd64.zip', version);
        case 'Windows_NT':
        default:
            return util.format('https://get.helm.sh/helm-%s-windows-amd64.zip', version);
    }
}
exports.getHelmDownloadURL = getHelmDownloadURL;

function getStableHelmVersion() {
    return __awaiter(this, void 0, void 0, function* () {
        return toolCache.downloadTool(helmLatestReleaseUrl).then((downloadPath) => {
            const response = JSON.parse(fs.readFileSync(downloadPath, 'utf8').toString().trim());
            if (!response.tag_name) {
                return stableHelmVersion;
            }
            return response.tag_name;
        }, (error) => {
            core.debug(error);
            core.warning(util.format("Failed to read latest helm version from stable.txt. From URL %s. Using default stable version %s", helmLatestReleaseUrl, stableHelmVersion));
            return stableHelmVersion;
        });
    });
}
exports.getStableHelmVersion = getStableHelmVersion;

function walkSync(dir, filelist, fileToFind) {
    var files = fs.readdirSync(dir);
    filelist = filelist || [];
    files.forEach(function (file) {
        if (fs.statSync(path.join(dir, file)).isDirectory()) {
            filelist = exports.walkSync(path.join(dir, file), filelist, fileToFind);
        }
        else {
            core.debug(file);
            if (file == fileToFind) {
                filelist.push(path.join(dir, file));
            }
        }
    });
    return filelist;
};
exports.walkSync = walkSync;

function downloadHelm(version) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!version) {
            version = yield getStableHelmVersion();
        }
        let cachedToolpath = toolCache.find(helmToolName, version);
        if (!cachedToolpath) {
            let helmDownloadPath;
            try {
                helmDownloadPath = yield toolCache.downloadTool(getHelmDownloadURL(version));
            }
            catch (exception) {
                throw new Error(util.format("Failed to download Helm from location %s. Error: %s ", getHelmDownloadURL(version), exception));
            }
            fs.chmodSync(helmDownloadPath, '777');
            const unzipedHelmPath = yield toolCache.extractZip(helmDownloadPath);
            cachedToolpath = yield toolCache.cacheDir(unzipedHelmPath, helmToolName, version);
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
    var filelist = [];
    exports.walkSync(rootFolder, filelist, helmToolName + utilities_1.getExecutableExtension());
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
        var helmPath = "";
        if (core.getInput('helm-version', { required: false })) {
            var version = core.getInput('helm-version', { required: false });
            if (!!version && version != "latest") {
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
                helmPath = path.join(helmPath, `helm${utilities_1.getExecutableExtension()}`);
            }
        }
        core.debug(util.format("Helm executable path %s", helmPath));
        return helmPath;
    });
}
exports.getHelmPath = getHelmPath;

function installHelm(version) {
    return __awaiter(this, void 0, void 0, function* () {
        if (utilities_1.isEqual(version, 'latest')) {
            version = yield getStableHelmVersion();
        }
        core.debug(util.format("Downloading helm version %s", version));
        return yield downloadHelm(version);
    });
}
exports.installHelm = installHelm;
