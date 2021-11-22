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
exports.execCommand = exports.getExecutableExtension = exports.isEqual = exports.getCurrentTime = void 0;
const os = require("os");
const util = require("util");
const toolrunner_1 = require("@actions/exec/lib/toolrunner");
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
        const execResult = {};
        execResult.stdout = "";
        execResult.stderr = "";
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
