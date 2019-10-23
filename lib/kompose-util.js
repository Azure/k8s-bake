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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const util = __importStar(require("util"));
const utilities_1 = require("./utilities");
const toolCache = __importStar(require("@actions/tool-cache"));
const core = __importStar(require("@actions/core"));
const io = __importStar(require("@actions/io"));
const komposeToolName = 'kompose';
const stableKomposeVersion = "v1.18.0";
function getKomposePath() {
    return __awaiter(this, void 0, void 0, function* () {
        var komposePath = "";
        if (core.getInput('kompose-version', { required: false })) {
            var version = core.getInput('kompose-version', { required: false });
            if (!!version && version != "latest") {
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
                komposePath = path.join(komposePath, `kompose${utilities_1.getExecutableExtension()}`);
            }
        }
        return komposePath;
    });
}
exports.getKomposePath = getKomposePath;
function downloadKompose(version) {
    return __awaiter(this, void 0, void 0, function* () {
        let cachedToolpath = toolCache.find(komposeToolName, version);
        let komposeDownloadPath = '';
        if (!cachedToolpath) {
            try {
                komposeDownloadPath = yield toolCache.downloadTool(getDownloadUrl(version));
            }
            catch (exception) {
                throw new Error(util.format("Cannot download the kompose version %s. Check if the version is correct https://github.com/kubernetes/kompose/releases", version));
            }
            cachedToolpath = yield toolCache.cacheFile(komposeDownloadPath, komposeToolName + utilities_1.getExecutableExtension(), komposeToolName, version);
        }
        const komposePath = path.join(cachedToolpath, komposeToolName + utilities_1.getExecutableExtension());
        fs.chmodSync(komposePath, 0o100); // execute/search by owner permissions to the tool
        return komposePath;
    });
}
function installKompose(version) {
    return __awaiter(this, void 0, void 0, function* () {
        if (utilities_1.isEqual(version, 'latest')) {
            version = stableKomposeVersion;
        }
        core.debug(util.format("Downloading kompose version %s", version));
        return yield downloadKompose(version);
    });
}
function getDownloadUrl(version) {
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
