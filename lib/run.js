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
exports.run = exports.KustomizeRenderEngine = exports.KomposeRenderEngine = exports.HelmRenderEngine = void 0;
const core = require("@actions/core");
const ioUtil = require("@actions/io/lib/io-util");
const utilities = require("./utilities");
const path = require("path");
const fs = require("fs");
const util = require("util");
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
        this.bake = (isSilent) => __awaiter(this, void 0, void 0, function* () {
            const helmPath = yield (0, helm_util_1.getHelmPath)();
            const chartPath = core.getInput('helmChart', { required: true });
            const options = {
                silent: isSilent
            };
            const dependencyArgs = this.getDependencyArgs(chartPath);
            console.log("Running helm dependency update command..");
            yield utilities.execCommand(helmPath, dependencyArgs, options);
            console.log("Getting helm version..");
            let isV3 = true;
            yield this.isHelmV3(helmPath).then((result) => { isV3 = result; }).catch(() => { isV3 = false; });
            try {
                if (!isV3) {
                    yield utilities.execCommand(helmPath, ['init', '--client-only', '--stable-repo-url', 'https://charts.helm.sh/stable'], options);
                }
            }
            catch (ex) {
                core.warning(util.format('Could not run helm init command: ', ex));
            }
            console.log("Creating the template argument string..");
            const args = this.getTemplateArgs(chartPath, isV3);
            console.log("Running helm template command..");
            const result = yield utilities.execCommand(helmPath, args, options);
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
    getTemplateArgs(chartPath, isV3) {
        const releaseName = core.getInput('releaseName', { required: false });
        let args = [];
        args.push('template');
        if (isV3) {
            if (releaseName) {
                args.push(releaseName);
            }
        }
        else {
            if (releaseName) {
                args.push('--name');
                args.push(releaseName);
            }
        }
        args.push(chartPath);
        const overrideFilesInput = core.getInput('overrideFiles', { required: false });
        if (!!overrideFilesInput) {
            core.debug("Adding overrides file inputs");
            const overrideFiles = overrideFilesInput.split('\n');
            if (overrideFiles.length > 0) {
                overrideFiles.forEach(file => {
                    args.push('-f');
                    args.push(file);
                });
            }
        }
        const overridesInput = core.getInput('overrides', { required: false });
        if (!!overridesInput) {
            core.debug("Adding overrides inputs");
            const overrides = overridesInput.split('\n');
            if (overrides.length > 0) {
                const overrideValues = this.getOverrideValues(overrides);
                overrideValues.forEach(overrideValue => {
                    args.push('--set');
                    args.push(`${overrideValue.name}=${overrideValue.value}`);
                });
            }
        }
        return args;
    }
    isHelmV3(path) {
        return __awaiter(this, void 0, void 0, function* () {
            let result = yield utilities.execCommand(path, ["version", "--template", "{{.Version}}"], { silent: true });
            return result.stdout.split('.')[0] === 'v3';
        });
    }
}
exports.HelmRenderEngine = HelmRenderEngine;
class KomposeRenderEngine extends RenderEngine {
    constructor() {
        super(...arguments);
        this.bake = (isSilent) => __awaiter(this, void 0, void 0, function* () {
            const dockerComposeFilePath = core.getInput('dockerComposeFile', { required: true });
            if (!ioUtil.exists(dockerComposeFilePath)) {
                throw Error(util.format("Docker compose file path %s does not exist. Please check the path specified", dockerComposeFilePath));
            }
            const options = {
                silent: isSilent
            };
            const komposePath = yield (0, kompose_util_1.getKomposePath)();
            const pathToBakedManifest = this.getTemplatePath();
            core.debug("Running kompose command..");
            yield utilities.execCommand(komposePath, ['convert', '-f', dockerComposeFilePath, '-o', pathToBakedManifest], options);
            core.setOutput('manifestsBundle', pathToBakedManifest);
        });
    }
}
exports.KomposeRenderEngine = KomposeRenderEngine;
class KustomizeRenderEngine extends RenderEngine {
    constructor() {
        super(...arguments);
        this.bake = (isSilent) => __awaiter(this, void 0, void 0, function* () {
            const kubectlPath = yield (0, kubectl_util_1.getKubectlPath)();
            yield this.validateKustomize(kubectlPath);
            const kustomizationPath = core.getInput('kustomizationPath', { required: true });
            if (!ioUtil.exists(kustomizationPath)) {
                throw Error(util.format("kustomizationPath %s does not exist. Please check whether file exists or not.", kustomizationPath));
            }
            const options = {
                silent: isSilent
            };
            core.debug("Running kubectl kustomize command..");
            console.log(`[command] ${kubectlPath} kustomize ${core.getInput('kustomizationPath')}`);
            const result = yield utilities.execCommand(kubectlPath, ['kustomize', kustomizationPath], options);
            const pathToBakedManifest = this.getTemplatePath();
            fs.writeFileSync(pathToBakedManifest, result.stdout);
            core.setOutput('manifestsBundle', pathToBakedManifest);
        });
    }
    validateKustomize(kubectlPath) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield utilities.execCommand(kubectlPath, ['version', '--client=true', '-o', 'json']);
            if (!!result.stdout) {
                const clientVersion = JSON.parse(result.stdout).clientVersion;
                const versionNumber = `${clientVersion.major}.${clientVersion.minor}`;
                if (!clientVersion || parseFloat(versionNumber) < parseFloat(utilities.MIN_KUBECTL_CLIENT_VERSION)) {
                    throw new Error("kubectl client version equal to v1.14 or higher is required to use kustomize features");
                }
            }
        });
    }
}
exports.KustomizeRenderEngine = KustomizeRenderEngine;
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        const renderType = core.getInput('renderEngine', { required: true });
        let renderEngine;
        switch (renderType) {
            case 'helm':
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
        let isSilent = core.getInput('silent', { required: false }) === 'false';
        try {
            yield renderEngine.bake(isSilent);
        }
        catch (err) {
            throw Error(util.format("Failed to run bake action. Error: %s", err));
        }
    });
}
exports.run = run;
run().catch(core.setFailed);
