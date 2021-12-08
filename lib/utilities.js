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
exports.MIN_KUBECTL_CLIENT_VERSION = exports.LATEST = exports.getStableVerison = exports.getDownloadUrl = exports.setCachedToolPath = exports.execCommand = exports.getExecutableExtension = exports.isEqual = exports.getCurrentTime = void 0;
const os = require("os");
const fs = require("fs");
const util = require("util");
const toolrunner_1 = require("@actions/exec/lib/toolrunner");
const toolCache = require("@actions/tool-cache");
const core = require("@actions/core");
function getCurrentTime() {
    return new Date().getTime();
}
exports.getCurrentTime = getCurrentTime;
function isEqual(str1, str2) {
    if (!str1)
        str1 = "";
    if (!str2)
        str2 = "";
    return str1.toLowerCase() === str2.toLowerCase();
}
exports.isEqual = isEqual;
function getExecutableExtension() {
    if (os.type().match(/^Win/)) {
        return '.exe';
    }
    return '';
}
exports.getExecutableExtension = getExecutableExtension;
function execCommand(toolPath, args, options = {}) {
    return __awaiter(this, void 0, void 0, function* () {
        const execResult = {
            stdout: "",
            stderr: ""
        };
        options.listeners = {
            stdout: (data) => {
                execResult.stdout += data.toString();
            },
            stderr: (data) => {
                execResult.stderr += data.toString();
            }
        };
        let toolRunner = new toolrunner_1.ToolRunner(toolPath, args, options);
        const result = yield toolRunner.exec();
        if (result != 0) {
            if (!!execResult.stderr) {
                throw Error(execResult.stderr);
            }
            else {
                throw Error(util.format("%s exited with result code %s", toolPath, result));
            }
        }
        return execResult;
    });
}
exports.execCommand = execCommand;
function setCachedToolPath(toolName, version) {
    return __awaiter(this, void 0, void 0, function* () {
        let cachedToolpath = '';
        let downloadPath = '';
        const downloadUrl = getDownloadUrl(toolName, version);
        try {
            downloadPath = yield toolCache.downloadTool(downloadUrl);
        }
        catch (exeption) {
            throw new Error(`Failed to download the ${toolName} from ${downloadUrl}.  Error: ${exeption}`);
        }
        if (toolName == 'helm') {
            fs.chmodSync(downloadPath, '777');
            const unzipedHelmPath = yield toolCache.extractZip(downloadPath);
            cachedToolpath = yield toolCache.cacheDir(unzipedHelmPath, toolName, version);
        }
        else {
            cachedToolpath = yield toolCache.cacheFile(downloadPath, toolName + getExecutableExtension(), toolName, version);
        }
        return cachedToolpath;
    });
}
exports.setCachedToolPath = setCachedToolPath;
function getDownloadUrl(toolName, version) {
    const system = os.type();
    if (!downloadLinks[system] || !downloadLinks[system][toolName]) {
        throw Error("Unknown OS or render engine type");
    }
    return util.format(downloadLinks[system][toolName], version);
}
exports.getDownloadUrl = getDownloadUrl;
function getStableVerison(toolName) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!stableVersionUrls[toolName]) {
            throw Error("Unable to download. Unknown tool name");
        }
        return toolCache.downloadTool(stableVersionUrls[toolName]).then(downloadPath => {
            let response = fs.readFileSync(downloadPath, 'utf8').toString().trim();
            if (toolName == 'helm') {
                const versionTag = JSON.parse(response);
                return versionTag.tag_name ? versionTag.tag_name : defaultStableHelmVersion;
            }
            else {
                return response ? response : defaultStableKubectlVersion;
            }
        }, err => {
            core.debug(err);
            core.warning(util.format("Failed to read latest %s version from URL %s. Using default stable version %s", toolName, stableVersionUrls[toolName], toolName == 'helm' ? defaultStableHelmVersion : defaultStableKubectlVersion));
            return toolName == 'helm' ? defaultStableHelmVersion : defaultStableKubectlVersion;
        });
    });
}
exports.getStableVerison = getStableVerison;
const defaultStableHelmVersion = 'v2.14.1';
const defaultStableKubectlVersion = 'v1.15.0';
const stableVersionUrls = {
    'kubectl': 'https://storage.googleapis.com/kubernetes-release/release/stable.txt',
    'helm': 'https://api.github.com/repos/helm/helm/releases/latest',
};
const downloadLinks = {
    'Linux': {
        'helm': 'https://get.helm.sh/helm-%s-linux-amd64.zip',
        'kompose': 'https://github.com/kubernetes/kompose/releases/download/%s/kompose-linux-amd64',
        'kubectl': 'https://storage.googleapis.com/kubernetes-release/release/%s/bin/linux/amd64/kubectl'
    },
    'Darwin': {
        'helm': 'https://get.helm.sh/helm-%s-darwin-amd64.zip',
        'kompose': 'https://github.com/kubernetes/kompose/releases/download/%s/kompose-darwin-amd64',
        'kubectl': 'https://storage.googleapis.com/kubernetes-release/release/%s/bin/darwin/amd64/kubectl'
    },
    'Windows_NT': {
        'helm': 'https://get.helm.sh/helm-%s-windows-amd64.zip',
        'kompose': 'https://github.com/kubernetes/kompose/releases/download/%s/kompose-windows-amd64.exe',
        'kubectl': 'https://storage.googleapis.com/kubernetes-release/release/%s/bin/windows/amd64/kubectl.exe'
    }
};
exports.LATEST = 'latest';
exports.MIN_KUBECTL_CLIENT_VERSION = "1.14";
