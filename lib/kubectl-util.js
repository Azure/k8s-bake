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
const kubectlToolName = 'kubectl';
const stableKubectlVersion = 'v1.15.0';
const stableVersionUrl = 'https://storage.googleapis.com/kubernetes-release/release/stable.txt';
function getkubectlDownloadURL(version) {
    switch (os.type()) {
        case 'Linux':
            return util.format('https://storage.googleapis.com/kubernetes-release/release/%s/bin/linux/amd64/kubectl', version);
        case 'Darwin':
            return util.format('https://storage.googleapis.com/kubernetes-release/release/%s/bin/darwin/amd64/kubectl', version);
        case 'Windows_NT':
        default:
            return util.format('https://storage.googleapis.com/kubernetes-release/release/%s/bin/windows/amd64/kubectl.exe', version);
    }
}
exports.getkubectlDownloadURL = getkubectlDownloadURL;

function getStableKubectlVersion() {
    return __awaiter(this, void 0, void 0, function* () {
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
    });
}
exports.getStableKubectlVersion = getStableKubectlVersion;

function downloadKubectl(version) {
    return __awaiter(this, void 0, void 0, function* () {
        let cachedToolpath = toolCache.find(kubectlToolName, version);
        let kubectlDownloadPath = '';
        if (!cachedToolpath) {
            try {
                kubectlDownloadPath = yield toolCache.downloadTool(getkubectlDownloadURL(version));
            }
            catch (exception) {
                throw new Error(util.format("Cannot download the kubectl client of version %s. Check if the version is correct https://github.com/kubernetes/kubernetes/releases. Error: %s", version, exception));
            }
            cachedToolpath = yield toolCache.cacheFile(kubectlDownloadPath, kubectlToolName + utilities_1.getExecutableExtension(), kubectlToolName, version);
        }
        const kubectlPath = path.join(cachedToolpath, kubectlToolName + utilities_1.getExecutableExtension());
        fs.chmodSync(kubectlPath, '777');
        return kubectlPath;
    });
}
exports.downloadKubectl = downloadKubectl;

function getKubectlPath() {
    return __awaiter(this, void 0, void 0, function* () {
        var kubectlPath = "";
        var version = core.getInput('kubectl-version', { required: false });
        if (version) {
            if (!!version && version != "latest") {
                const cachedToolPath = toolCache.find('kubectl', version);
                kubectlPath = path.join(cachedToolPath, kubectlToolName + utilities_1.getExecutableExtension());
            }
            if (!kubectlPath) {
                kubectlPath = yield installKubectl(version);
            }
        }
        else {
            kubectlPath = yield io.which('kubectl', false);
            if (!kubectlPath) {
                const allVersions = toolCache.findAllVersions('kubectl');
                kubectlPath = allVersions.length > 0 ? toolCache.find('kubectl', allVersions[0]) : '';
                if (!kubectlPath) {
                    throw new Error('Kubectl is not installed, either add install-kubectl action or provide "kubectl-version" input to download kubectl');
                }
                kubectlPath = path.join(kubectlPath, `kubectl${utilities_1.getExecutableExtension()}`);
            }
        }
        return kubectlPath;
    });
}
exports.getKubectlPath = getKubectlPath;

function installKubectl(version) {
    return __awaiter(this, void 0, void 0, function* () {
        if (utilities_1.isEqual(version, 'latest')) {
            version = yield getStableKubectlVersion();
        }
        core.debug(util.format("Downloading kubectl version %s", version));
        return yield downloadKubectl(version);
    });
}
exports.installKubectl = installKubectl;
