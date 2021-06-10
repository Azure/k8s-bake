// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as core from '@actions/core';
import * as ioUtil from '@actions/io/lib/io-util';
import { ExecOptions } from "@actions/exec/lib/interfaces";
import * as utilities from "./utilities"
import * as path from 'path';
import * as fs from 'fs';
import * as util from 'util';
import { getHelmPath, NameValuePair } from "./helm-util"
import { getKubectlPath } from "./kubectl-util"
import { getKomposePath } from "./kompose-util"


abstract class RenderEngine {
    public bake!: (isSilent: boolean) => Promise<any>;
    protected getTemplatePath = () => {
        const tempDirectory = process.env['RUNNER_TEMP'];
        if (!!tempDirectory) {
            return path.join(tempDirectory, 'baked-template-' + utilities.getCurrentTime().toString() + '.yaml');
        }
        else {
            throw Error("Unable to create temp directory.");
        }
    }
}

export class HelmRenderEngine extends RenderEngine {
    public bake = async (isSilent: boolean): Promise<any> => {
        const helmPath = await getHelmPath();
        const chartPath = core.getInput('helmChart', { required: true });

        const options = {
            silent: isSilent
        } as ExecOptions;

        var dependencyArgs = this.getDependencyArgs(chartPath);

        console.log("Running helm dependency update command..");
        await utilities.execCommand(helmPath, dependencyArgs, options);

        console.log("Getting helm version..");
        let isV3 = true;
        await this.isHelmV3(helmPath).then((result) => { isV3 = result }).catch(() => { isV3 = false });
        
        try {
            if (!isV3) {
                await utilities.execCommand(helmPath, ['init', '--client-only', '--stable-repo-url', 'https://charts.helm.sh/stable'], options);
            }
        } catch (ex) {
            core.warning(util.format('Could not run helm init command: ', ex));
        }

        console.log("Creating the template argument string..");
        var args = this.getTemplateArgs(chartPath, isV3)

        console.log("Running helm template command..");
        var result = await utilities.execCommand(helmPath, args, options)

        const pathToBakedManifest = this.getTemplatePath();
        fs.writeFileSync(pathToBakedManifest, result.stdout);
        core.setOutput('manifestsBundle', pathToBakedManifest);
    }

    private getOverrideValues(overrides: string[]) {
        const overrideValues: NameValuePair[] = [];
        overrides.forEach(arg => {
            const overrideInput = arg.split(':');
            const overrideName = overrideInput[0];
            const overrideValue = overrideInput.slice(1).join(':');
            overrideValues.push({
                name: overrideName,
                value: overrideValue
            } as NameValuePair);
        });

        return overrideValues;
    }

    private getDependencyArgs(chartPath: string): string[] {
        let args: string[] = [];
        args.push('dependency');
        args.push('update');
        args.push(chartPath);

        return args;
    }

    private getTemplateArgs(chartPath: string, isV3: boolean): string[] {
        const releaseName = core.getInput('releaseName', { required: false });

        let args: string[] = [];
        args.push('template');
        if (isV3) {
            if (releaseName) {
                args.push(releaseName);
            }
            args.push(chartPath);
        } else {
            args.push(chartPath);
            if (releaseName) {
                args.push('--name');
                args.push(releaseName);
            }
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

    private async isHelmV3(path: string) {
        let result = await utilities.execCommand(path, ["version", "--template", "{{.Version}}"], { silent: true });
        return result.stdout.split('.')[0] === 'v3';
    }
}

export class KomposeRenderEngine extends RenderEngine {
    public bake = async (isSilent: boolean): Promise<any> => {
        var dockerComposeFilePath = core.getInput('dockerComposeFile', { required: true });
        if (!ioUtil.exists(dockerComposeFilePath)) {
            throw Error(util.format("Docker compose file path %s does not exist. Please check the path specified", dockerComposeFilePath));
        }

        const options = {
            silent: isSilent
        } as ExecOptions;

        const komposePath = await getKomposePath();
        const pathToBakedManifest = this.getTemplatePath();
        core.debug("Running kompose command..");
        await utilities.execCommand(komposePath, ['convert', '-f', dockerComposeFilePath, '-o', pathToBakedManifest], options)
        core.setOutput('manifestsBundle', pathToBakedManifest);
    }
}

export class KustomizeRenderEngine extends RenderEngine {
    public bake = async (isSilent: boolean) => {
        const kubectlPath = await getKubectlPath();
        await this.validateKustomize(kubectlPath);
        var kustomizationPath = core.getInput('kustomizationPath', { required: true });
        if (!ioUtil.exists(kustomizationPath)) {
            throw Error(util.format("kustomizationPath %s does not exist. Please check whether file exists or not.", kustomizationPath));
        }

        const options = {
            silent: isSilent
        } as ExecOptions;

        core.debug("Running kubectl kustomize command..");
        console.log(`[command] ${kubectlPath} kustomize ${core.getInput('kustomizationPath')}`);
        var result = await utilities.execCommand(kubectlPath, ['kustomize', kustomizationPath], options);
        const pathToBakedManifest = this.getTemplatePath();
        fs.writeFileSync(pathToBakedManifest, result.stdout);
        core.setOutput('manifestsBundle', pathToBakedManifest);
    };

    private async validateKustomize(kubectlPath: string) {
        var result = await utilities.execCommand(kubectlPath, ['version', '--client=true', '-o', 'json']);
        if (!!result.stdout) {
            const clientVersion = JSON.parse(result.stdout).clientVersion;
            if (clientVersion && parseInt(clientVersion.major) >= 1 && parseInt(clientVersion.minor) >= 14) {
                // Do nothing
            }
            else {
                throw new Error("kubectl client version equal to v1.14 or higher is required to use kustomize features");
            }
        }
    }
}

export async function run() {
    const renderType = core.getInput('renderEngine', { required: true });
    let renderEngine: RenderEngine;
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

    var isSilent = true;
    var silentInput = core.getInput('silent', { required: false });
    if (silentInput && silentInput == 'false')
        isSilent = false;

    try {
        await renderEngine.bake(isSilent);
    }
    catch (err) {
        throw Error(util.format("Failed to run bake action. Error: %s", err));
    }
}

run().catch(core.setFailed);