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
const core = __importStar(require("@actions/core"));
const ioUtil = __importStar(require("@actions/io/lib/io-util"));
const utilities = __importStar(require("./utilities"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const util = __importStar(require("util"));
const helm_util_1 = require("./helm-util");
const kubectl_util_1 = require("./kubectl-util");
const kompose_util_1 = require("./kompose-util");
class RenderEngine {
    constructor() {
        this.getTemplatePath = () => {
            const tempDirectory = process.env['RUNNER_TEMP'];
            if (!!tempDirectory) {
                return path.join(tempDirectory, 'baked-template-' + utilities.getCurrentTime().toString() + '.yaml');
            }
            else {
                throw Error("Unable to create temp directory.");
            }
        };
    }
}
class HelmRenderEngine extends RenderEngine {
    constructor() {
        super(...arguments);
        this.bake = () => __awaiter(this, void 0, void 0, function* () {
            const helmPath = yield helm_util_1.getHelmPath();
            const chartPath = core.getInput('helmChart', { required: true });
            const options = {
                silent: true
            };
            var dependencyArgs = this.getDependencyArgs(chartPath);
            core.debug("Running helm dependency update command..");
            yield utilities.execCommand(helmPath, dependencyArgs, options);
            core.debug("Creating the template argument string..");
            var args = this.getTemplateArgs(chartPath);
            core.debug("Running helm template command..");
            var result = yield utilities.execCommand(helmPath, args, options);
            const pathToBakedManifest = this.getTemplatePath();
            fs.writeFileSync(pathToBakedManifest, result.stdout);
            core.setOutput('manifestsBundle', pathToBakedManifest);
        });
    }
    getOverrideValues(overrides) {
        const overrideValues = [];
        overrides.forEach(arg => {
            const overrideInput = arg.split(':');
            const overrideName = overrideInput[0];
            const overrideValue = overrideInput.slice(1).join(':');
            overrideValues.push({
                name: overrideName,
                value: overrideValue
            });
        });
        return overrideValues;
    }
    getDependencyArgs(chartPath) {
        let args = [];
        args.push('dependency');
        args.push('update');
        args.push(chartPath);
        return args;
    }
    getTemplateArgs(chartPath) {
        const releaseName = core.getInput('releaseName', { required: false });
        let args = [];
        args.push('template');
        args.push(chartPath);
        if (releaseName) {
            args.push('--name');
            args.push(releaseName);
        }
        var overrideFilesInput = core.getInput('overrideFiles', { required: false });
        if (!!overrideFilesInput) {
            core.debug("Adding overrides file inputs");
            var overrideFiles = overrideFilesInput.split('\n');
            if (overrideFiles.length > 0) {
                overrideFiles.forEach(file => {
                    args.push('-f');
                    args.push(file);
                });
            }
        }
        var overridesInput = core.getInput('overrides', { required: false });
        if (!!overridesInput) {
            core.debug("Adding overrides inputs");
            var overrides = overridesInput.split('\n');
            if (overrides.length > 0) {
                var overrideValues = this.getOverrideValues(overrides);
                overrideValues.forEach(overrideValue => {
                    args.push('--set');
                    args.push(`${overrideValue.name}=${overrideValue.value}`);
                });
            }
        }
        return args;
    }
}
class KomposeRenderEngine extends RenderEngine {
    constructor() {
        super(...arguments);
        this.bake = () => __awaiter(this, void 0, void 0, function* () {
            var dockerComposeFilePath = core.getInput('dockerComposeFile', { required: true });
            if (!ioUtil.exists(dockerComposeFilePath)) {
                throw Error(util.format("Docker compose file path %s does not exist. Please check the path specified", dockerComposeFilePath));
            }
            const komposePath = yield kompose_util_1.getKomposePath();
            const pathToBakedManifest = this.getTemplatePath();
            core.debug("Running kompose command..");
            yield utilities.execCommand(komposePath, ['convert', '-f', dockerComposeFilePath, '-o', pathToBakedManifest]);
            core.setOutput('manifestsBundle', pathToBakedManifest);
        });
    }
}
class KustomizeRenderEngine extends RenderEngine {
    constructor() {
        super(...arguments);
        this.bake = () => __awaiter(this, void 0, void 0, function* () {
            const kubectlPath = yield kubectl_util_1.getKubectlPath();
            yield this.validateKustomize(kubectlPath);
            var kustomizationPath = core.getInput('kustomizationPath', { required: true });
            if (!ioUtil.exists(kustomizationPath)) {
                throw Error(util.format("kustomizationPath %s does not exist. Please check whether file exists or not.", kustomizationPath));
            }
            const options = {
                silent: true
            };
            core.debug("Running kubectl kustomize command..");
            console.log(`[command] ${kubectlPath} kustomize ${core.getInput('kustomizationPath')}`);
            var result = yield utilities.execCommand(kubectlPath, ['kustomize', kustomizationPath], options);
            const pathToBakedManifest = this.getTemplatePath();
            fs.writeFileSync(pathToBakedManifest, result.stdout);
            core.setOutput('manifestsBundle', pathToBakedManifest);
        });
    }
    validateKustomize(kubectlPath) {
        return __awaiter(this, void 0, void 0, function* () {
            var result = yield utilities.execCommand(kubectlPath, ['version', '--client=true', '-o', 'json']);
            if (!!result.stdout) {
                const clientVersion = JSON.parse(result.stdout).clientVersion;
                if (clientVersion && parseInt(clientVersion.major) >= 1 && parseInt(clientVersion.minor) >= 14) {
                    // Do nothing
                }
                else {
                    throw new Error("kubectl client version equal to v1.14 or higher is required to use kustomize features");
                }
            }
        });
    }
}
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        const renderType = core.getInput('renderEngine', { required: true });
        let renderEngine;
        switch (renderType) {
            case 'helm2':
                renderEngine = new HelmRenderEngine();
                break;
            case 'kompose':
                renderEngine = new KomposeRenderEngine();
                break;
            case 'kustomize':
                renderEngine = new KustomizeRenderEngine();
                break;
            default:
                throw Error("Unknown render engine");
        }
        try {
            yield renderEngine.bake();
        }
        catch (err) {
            throw Error(util.format("Failed to run bake action. Error: %s", err));
        }
    });
}
run().catch(core.setFailed);
