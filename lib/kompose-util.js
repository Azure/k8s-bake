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
exports.installKompose = exports.downloadKompose = exports.getKomposePath = void 0;
const path = require("path");
const fs = require("fs");
const util = require("util");
const utilities_1 = require("./utilities");
const toolCache = require("@actions/tool-cache");
const core = require("@actions/core");
const io = require("@actions/io");
const komposeToolName = 'kompose';
const stableKomposeVersion = "v1.18.0";
function getKomposePath() {
    return __awaiter(this, void 0, void 0, function* () {
        let komposePath = "";
        const version = core.getInput('kompose-version', { required: false });
        if (version) {
            if (!!version && version != utilities_1.LATEST) {
                komposePath = toolCache.find('kompose', version);
            }
            if (!komposePath) {
                komposePath = yield installKompose(version);
            }
        }
        else {
            komposePath = yield io.which('kompose', false);
            if (!komposePath) {
                const allVersions = toolCache.findAllVersions('kompose');
                komposePath = allVersions.length > 0 ? toolCache.find('kompose', allVersions[0]) : '';
                if (!komposePath) {
                    throw new Error('kompose is not installed, provide "kompose-version" input to download kompose');
                }
                komposePath = path.join(komposePath, `kompose${(0, utilities_1.getExecutableExtension)()}`);
            }
        }
        return komposePath;
    });
}
exports.getKomposePath = getKomposePath;
function downloadKompose(version = stableKomposeVersion) {
    return __awaiter(this, void 0, void 0, function* () {
        let cachedToolpath = toolCache.find(komposeToolName, version);
        if (!cachedToolpath) {
            cachedToolpath = yield (0, utilities_1.setCachedToolPath)('kompose', version);
        }
        const komposePath = path.join(cachedToolpath, komposeToolName + (0, utilities_1.getExecutableExtension)());
        fs.chmodSync(komposePath, 0o100); // execute/search by owner permissions to the tool
        return komposePath;
    });
}
exports.downloadKompose = downloadKompose;
function installKompose(version) {
    return __awaiter(this, void 0, void 0, function* () {
        if ((0, utilities_1.isEqual)(version, utilities_1.LATEST)) {
            version = stableKomposeVersion;
        }
        core.debug(util.format("Downloading kompose version %s", version));
        return yield downloadKompose(version);
    });
}
exports.installKompose = installKompose;
