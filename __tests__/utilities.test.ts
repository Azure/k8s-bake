import * as utils from '../src/utilities';
import * as os from 'os';
import { ExecOptions } from "@actions/exec/lib/interfaces";

var mockStatusCode, stdOutMessage, stdErrMessage;
const mockExecFn = jest.fn().mockImplementation((toolPath, args, options) => {
    options.listeners.stdout(!stdOutMessage ? '' : stdOutMessage); 
    options.listeners.stderr(!stdErrMessage ? '' : stdErrMessage); 
    return mockStatusCode;
})
jest.mock('@actions/exec/lib/toolrunner', () => {
    return {
        ToolRunner: jest.fn().mockImplementation((toolPath, args, options) => {
            return {
                exec: () => mockExecFn(toolPath, args, options)  
            }
        })
    }
});

describe('Test all functions in utilities file', () => {
    test('isEqual() - ', () => {
        expect(utils.isEqual('', null)).toBeTruthy();
        expect(utils.isEqual('a', 'A')).toBeTruthy();
        expect(utils.isEqual(null, 'a')).toBeFalsy();
    });

    test('getExecutableExtension() - return .exe when os is Windows', () => {
        jest.spyOn(os, 'type').mockReturnValue('Windows_NT');

        expect(utils.getExecutableExtension()).toBe('.exe');
        expect(os.type).toBeCalled();         
    });

    test('getExecutableExtension() - return empty string for non-windows OS', () => {
        jest.spyOn(os, 'type').mockReturnValue('Darwin');

        expect(utils.getExecutableExtension()).toBe('');         
        expect(os.type).toBeCalled();         
    });

    test('execCommand() - generate and throw error if non-zero code is returned with empty stderr', async () => {
        mockStatusCode = 1;
        stdOutMessage = ''; 
        stdErrMessage = ''; 

        await expect(utils.execCommand('cd', ['nonEsistingDirectory'])).rejects.toThrow('cd exited with result code 1');         
    });

    test('execCommand() - throw stderr if non zero code is returned', async () => {
        mockStatusCode = 1;
        stdOutMessage = ''; 
        stdErrMessage = 'Directory doesn\'t exist'; 
        await expect(utils.execCommand('cd', ['nonEsistingDirectory'], {} as ExecOptions)).rejects.toThrow('Directory doesn\'t exist');         
    });

    test('execCommand() - return ExecOptions type object with stdout if exit code is 0', async () => {
        mockStatusCode = 0;
        stdOutMessage = 'list of files'; 
        stdErrMessage = ''; 
        expect(await utils.execCommand('ls', [], {} as ExecOptions)).toMatchObject({'stderr': '', 'stdout': 'list of files'});         
    });
});