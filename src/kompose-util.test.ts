import * as komposeUtil from './kompose-util';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import * as toolCache from '@actions/tool-cache';
import * as core from '@actions/core';
import * as io from '@actions/io';

describe('Testing all funcitons in kompose-util file.', () => {

    test('downloadKompose() - return path to kompose from toolCache', async () => {
        jest.spyOn(toolCache, 'find').mockReturnValue('pathToCachedTool');
        jest.spyOn(fs, 'chmodSync').mockImplementation();
        jest.spyOn(os, 'type').mockReturnValue('Windows_NT');

        expect(await komposeUtil.downloadKompose('v1.18.0')).toBe(path.join('pathToCachedTool', 'kompose.exe'));
        expect(fs.chmodSync).toBeCalledWith(path.join('pathToCachedTool', 'kompose.exe'), 0o100);
        expect(toolCache.find).toBeCalledWith('kompose', 'v1.18.0');
    });

    test('downloadKompose() - download kompose, cache it and return path', async () => {
        jest.spyOn(toolCache, 'find').mockReturnValue('');
        jest.spyOn(toolCache, 'downloadTool').mockResolvedValue('pathToTool');
        jest.spyOn(toolCache, 'cacheFile').mockResolvedValue('pathToCachedTool');
        jest.spyOn(fs, 'chmodSync').mockImplementation();
        jest.spyOn(os, 'type').mockReturnValue('Windows_NT');

        expect(await komposeUtil.downloadKompose('v1.18.0')).toBe(path.join('pathToCachedTool', 'kompose.exe'));
        expect(toolCache.downloadTool).toBeCalledWith('https://github.com/kubernetes/kompose/releases/download/v1.18.0/kompose-windows-amd64.exe');
        expect(fs.chmodSync).toBeCalledWith(path.join('pathToCachedTool', 'kompose.exe'), 0o100);
        expect(toolCache.find).toBeCalledWith('kompose', 'v1.18.0');
    });

    test("downloadKompose() - throw error when unable to download", async () => {
        jest.spyOn(toolCache, 'find').mockReturnValue('');
        jest.spyOn(toolCache, 'downloadTool').mockImplementation(async () => { throw 'Unable to download.'});

        await expect(komposeUtil.downloadKompose('v1.18.0')).rejects.toThrow("Failed to download the kompose from https://github.com/kubernetes/kompose/releases/download/v1.18.0/kompose-windows-amd64.exe.  Error: Unable to download.");
        expect(toolCache.find).toBeCalledWith('kompose', 'v1.18.0');
    });

    test("installKompose() - return path kompose from cache", async () => {
        jest.spyOn(toolCache, 'find').mockReturnValue('pathToCachedTool');
        jest.spyOn(fs, 'chmodSync').mockImplementation();
        jest.spyOn(os, 'type').mockReturnValue('Windows_NT');
        jest.spyOn(core, 'debug').mockImplementation();

        expect(await komposeUtil.installKompose('v1.20.0')).toBe(path.join('pathToCachedTool', 'kompose.exe'));
    });

    test("installKompose() - return path to kompose v1.18.0 when input is latest", async () => {
        jest.spyOn(toolCache, 'find').mockReturnValue('pathToCachedTool');
        jest.spyOn(fs, 'chmodSync').mockImplementation();
        jest.spyOn(os, 'type').mockReturnValue('Windows_NT');
        jest.spyOn(core, 'debug').mockImplementation();

        expect(await komposeUtil.installKompose('latest')).toBe(path.join('pathToCachedTool', 'kompose.exe'));
    });

    test("getKomposePath() - return path to latest version kompose from toolCache", async () => {
        jest.spyOn(core, 'getInput').mockReturnValue('latest');
        jest.spyOn(toolCache, 'find').mockReturnValue('pathToCachedTool');
        jest.spyOn(fs, 'chmodSync').mockImplementation();
        jest.spyOn(os, 'type').mockReturnValue('Windows_NT');

        expect(await komposeUtil.getKomposePath()).toBe(path.join('pathToCachedTool', 'kompose.exe'));
        expect(core.getInput).toBeCalledWith('kompose-version', { required: false });
        expect(toolCache.find).toBeCalledWith('kompose', 'v1.18.0');
    });

    test("getKomposePath() - return path to specified version kompose from toolCache", async () => {
        jest.spyOn(core, 'getInput').mockReturnValue('v2.0.0');
        jest.spyOn(toolCache, 'find').mockReturnValue('pathToCachedTool');
        jest.spyOn(fs, 'chmodSync').mockImplementation();
        jest.spyOn(os, 'type').mockReturnValue('Windows_NT');

        expect(await komposeUtil.getKomposePath()).toBe('pathToCachedTool');
        expect(core.getInput).toBeCalledWith('kompose-version', { required: false });
        expect(toolCache.find).toBeCalledWith('kompose', 'v2.0.0');
    });

    test("getKomposePath() - return path to any version executable when input is not given", async () => {
        jest.spyOn(core, 'getInput').mockReturnValue('');
        jest.spyOn(io, 'which').mockResolvedValue('pathToTool');

        expect(await komposeUtil.getKomposePath()).toBe('pathToTool');
        expect(core.getInput).toBeCalledWith('kompose-version', { required: false });
        expect(io.which).toBeCalledWith('kompose', false);
    });

    test("getKomposePath() - return path to any version kompose from toolCache when input is not given", async () => {
        jest.spyOn(core, 'getInput').mockReturnValue('');
        jest.spyOn(io, 'which').mockResolvedValue('');
        jest.spyOn(toolCache, 'findAllVersions').mockReturnValue(['v2.0.0', 'v2.0.1']);
        jest.spyOn(toolCache, 'find').mockReturnValue('pathToTool');
        jest.spyOn(os, 'type').mockReturnValue('Windows_NT');

        expect(await komposeUtil.getKomposePath()).toBe(path.join('pathToTool', 'kompose.exe'));
        expect(core.getInput).toBeCalledWith('kompose-version', { required: false });
        expect(io.which).toBeCalledWith('kompose', false);
        expect(toolCache.findAllVersions).toBeCalledWith('kompose');
        expect(toolCache.find).toBeCalledWith('kompose', 'v2.0.0');
    });

    test("getKomposePath() - throw error when version input is not given and not kompose already exists", async () => {
        jest.spyOn(core, 'getInput').mockReturnValue('');
        jest.spyOn(io, 'which').mockResolvedValue('');
        jest.spyOn(toolCache, 'findAllVersions').mockReturnValue([]);

        await expect(komposeUtil.getKomposePath()).rejects.toThrow('kompose is not installed, provide "kompose-version" input to download kompose');
        expect(core.getInput).toBeCalledWith('kompose-version', { required: false });
        expect(io.which).toBeCalledWith('kompose', false);
        expect(toolCache.findAllVersions).toBeCalledWith('kompose');
    });
});