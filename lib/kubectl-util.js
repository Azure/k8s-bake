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
exports.installKubectl = exports.getKubectlPath = exports.downloadKubectl = void 0;
const path = require("path");
const fs = require("fs");
const util = require("util");
const toolCache = require("@actions/tool-cache");
const core = require("@actions/core");
const io = require("@actions/io");
const utilities_1 = require("./utilities");
const kubectlToolName = 'kubectl';
function downloadKubectl(version) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!version) {
            version = yield (0, utilities_1.getStableVerison)(kubectlToolName);
        }
        let cachedToolpath = toolCache.find(kubectlToolName, version);
        if (!cachedToolpath) {
            cachedToolpath = yield (0, utilities_1.setCachedToolPath)(kubectlToolName, version);
        }
        const kubectlPath = path.join(cachedToolpath, kubectlToolName + (0, utilities_1.getExecutableExtension)());
        fs.chmodSync(kubectlPath, '777');
        return kubectlPath;
    });
}
exports.downloadKubectl = downloadKubectl;
function getKubectlPath() {
    return __awaiter(this, void 0, void 0, function* () {
        let kubectlPath = "";
        const version = core.getInput('kubectl-version', { required: false });
        if (version) {
            if (!!version && version != utilities_1.LATEST) {
                const cachedToolPath = toolCache.find(kubectlToolName, version);
                kubectlPath = path.join(cachedToolPath, kubectlToolName + (0, utilities_1.getExecutableExtension)());
            }
            if (!kubectlPath) {
                kubectlPath = yield installKubectl(version);
            }
        }
        else {
            kubectlPath = yield io.which(kubectlToolName, false);
            if (!kubectlPath) {
                const allVersions = toolCache.findAllVersions(kubectlToolName);
                kubectlPath = allVersions.length > 0 ? toolCache.find(kubectlToolName, allVersions[0]) : '';
                if (!kubectlPath) {
                    throw new Error('Kubectl is not installed, either add install-kubectl action or provide "kubectl-version" input to download kubectl');
                }
                kubectlPath = path.join(kubectlPath, `kubectl${(0, utilities_1.getExecutableExtension)()}`);
            }
        }
        return kubectlPath;
    });
}
exports.getKubectlPath = getKubectlPath;
function installKubectl(version) {
    return __awaiter(this, void 0, void 0, function* () {
        if ((0, utilities_1.isEqual)(version, utilities_1.LATEST)) {
            version = yield (0, utilities_1.getStableVerison)(kubectlToolName);
        }
        core.debug(util.format("Downloading kubectl version %s", version));
        return yield downloadKubectl(version);
    });
}
exports.installKubectl = installKubectl;
