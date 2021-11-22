// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as os from 'os';
import * as util from 'util';
import { ToolRunner } from '@actions/exec/lib/toolrunner';
import { ExecOptions } from "@actions/exec/lib/interfaces";

export interface ExecResult {
    stdout: string;
    stderr: string
}

export function getCurrentTime(): number {
    return new Date().getTime();
}

export function isEqual(str1: string, str2: string) {
    if (!str1) str1 = "";
    if (!str2) str2 = "";
    return str1.toLowerCase() === str2.toLowerCase();
}

export function getExecutableExtension(): string {
    if (os.type().match(/^Win/)) {
        return '.exe';
    }
    return '';
}

export async function execCommand(toolPath: string, args: string[], options: ExecOptions = {} as ExecOptions) : Promise<ExecResult> {
    const execResult = {} as ExecResult;
    execResult.stdout = "";
    execResult.stderr = "";
    options.listeners =  {
            stdout: (data: Buffer) => {
                execResult.stdout += data.toString();
            },
            stderr: (data: Buffer) => {
                execResult.stderr += data.toString();
            }
        }

    let toolRunner = new ToolRunner(toolPath, args, options);
    const result = await toolRunner.exec();
    if (result != 0) {
        if (!!execResult.stderr) {
            throw Error(execResult.stderr);
        }
        else {
            throw Error(util.format("%s exited with result code %s", toolPath, result));
        }
    }

    return execResult;
}