import * as kubectlUtil from '../src/kubectl-util';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import * as toolCache from '@actions/tool-cache';
import * as core from '@actions/core';
import * as io from '@actions/io';

describe('Testing all funcitons in kubectl-util file.', () => {
    test('getkubectlDownloadURL() - return the URL to download kubectl for Linux_x64', () => {
        jest.spyOn(os, 'type').mockReturnValue('Linux');
        jest.spyOn(os, 'arch').mockReturnValue('x64');
        const kubectlLinuxUrl = 'https://storage.googleapis.com/kubernetes-release/release/v1.15.0/bin/linux/amd64/kubectl'

        expect(kubectlUtil.getkubectlDownloadURL('v1.15.0')).toBe(kubectlLinuxUrl);
        expect(os.type).toBeCalled();
        expect(os.arch).toBeCalled();
    });

    test('getkubectlDownloadURL() - return the URL to download kubectl for Linux_arm64', () => {
        jest.spyOn(os, 'type').mockReturnValue('Linux');
        jest.spyOn(os, 'arch').mockReturnValue('arm64');
        const kubectlLinuxUrl = 'https://storage.googleapis.com/kubernetes-release/release/v1.15.0/bin/linux/arm64/kubectl'
 
        expect(kubectlUtil.getkubectlDownloadURL('v1.15.0')).toBe(kubectlLinuxUrl);
        expect(os.type).toBeCalled();
        expect(os.arch).toBeCalled();
    });

    test('getkubectlDownloadURL() - return the URL to download kubectl for Darwin', () => {
        jest.spyOn(os, 'type').mockReturnValue('Darwin');
        const kubectlDarwinUrl = 'https://storage.googleapis.com/kubernetes-release/release/v1.15.0/bin/darwin/amd64/kubectl'
    
        expect(kubectlUtil.getkubectlDownloadURL('v1.15.0')).toBe(kubectlDarwinUrl);
        expect(os.type).toBeCalled();         
    });

    test('getkubectlDownloadURL() - return the URL to download kubectl for Windows', () => {
        jest.spyOn(os, 'type').mockReturnValue('Windows_NT');
    
        const kubectlWindowsUrl = 'https://storage.googleapis.com/kubernetes-release/release/v1.15.0/bin/windows/amd64/kubectl.exe'
        expect(kubectlUtil.getkubectlDownloadURL('v1.15.0')).toBe(kubectlWindowsUrl);
        expect(os.type).toBeCalled();         
    });

    test('getStableKubectlVersion() - download stable version file, read version and return it', async () => {
        jest.spyOn(toolCache, 'downloadTool').mockResolvedValue('pathToTool');
        jest.spyOn(fs, 'readFileSync').mockReturnValue('v1.20.4');
        
        expect(await kubectlUtil.getStableKubectlVersion()).toBe('v1.20.4');
        expect(toolCache.downloadTool).toBeCalled();
        expect(fs.readFileSync).toBeCalledWith('pathToTool', 'utf8');
    });

    test('getStableKubectlVersion() - return default v1.15.0 if version read is empty', async () => {
        jest.spyOn(toolCache, 'downloadTool').mockResolvedValue('pathToTool');
        jest.spyOn(fs, 'readFileSync').mockReturnValue('');
        jest.spyOn(core, 'warning').mockImplementation();
        
        expect(await kubectlUtil.getStableKubectlVersion()).toBe('v1.15.0');
        expect(toolCache.downloadTool).toBeCalled();
        expect(fs.readFileSync).toBeCalledWith('pathToTool', 'utf8');
    });

    test('getStableKubectlVersion() - return default v1.15.0 if unable to download file', async () => {
        jest.spyOn(toolCache, 'downloadTool').mockRejectedValue('Unable to download.');
        jest.spyOn(core, 'debug').mockImplementation();
        jest.spyOn(core, 'warning').mockImplementation();
        
        expect(await kubectlUtil.getStableKubectlVersion()).toBe('v1.15.0');
        expect(toolCache.downloadTool).toBeCalled();
    });

    test('downloadKubectl() - download kubectl, add it to toolCache and return path to it', async () => {
        jest.spyOn(toolCache, 'find').mockReturnValue('');
        jest.spyOn(toolCache, 'downloadTool').mockResolvedValue('pathToTool');
        jest.spyOn(toolCache, 'cacheFile').mockResolvedValue('pathToCachedTool');
        jest.spyOn(os, 'type').mockReturnValue('Windows_NT');
        jest.spyOn(fs, 'chmodSync').mockImplementation();

        expect(await kubectlUtil.downloadKubectl('v1.15.0')).toBe(path.join('pathToCachedTool', 'kubectl.exe'));
        expect(toolCache.find).toBeCalledWith('kubectl', 'v1.15.0');
        expect(toolCache.downloadTool).toBeCalled();
        expect(toolCache.cacheFile).toBeCalled();
        expect(os.type).toBeCalled();
        expect(fs.chmodSync).toBeCalledWith(path.join('pathToCachedTool', 'kubectl.exe'), '777');
    });

    test('downloadKubectl() - throw DownloadKubectlFailed error when unable to download kubectl', async () => {
        jest.spyOn(toolCache, 'find').mockReturnValue('');
        jest.spyOn(toolCache, 'downloadTool').mockRejectedValue('Unable to download kubectl.');

        await expect(kubectlUtil.downloadKubectl('v1.15.0')).rejects.toThrow('Cannot download the kubectl client of version v1.15.0. Check if the version is correct https://github.com/kubernetes/kubernetes/releases. Error: Unable to download kubectl.');
        expect(toolCache.find).toBeCalledWith('kubectl', 'v1.15.0');
        expect(toolCache.downloadTool).toBeCalled();
    });

    test('downloadKubectl() - return path to existing cache of kubectl', async () => {
        jest.spyOn(toolCache, 'find').mockReturnValue('pathToCachedTool');
        jest.spyOn(os, 'type').mockReturnValue('Windows_NT');
        jest.spyOn(fs, 'chmodSync').mockImplementation(() => {});

        expect(await kubectlUtil.downloadKubectl('v1.15.0')).toBe(path.join('pathToCachedTool', 'kubectl.exe'));
        expect(toolCache.find).toBeCalledWith('kubectl', 'v1.15.0');
        expect(os.type).toBeCalled();
        expect(fs.chmodSync).toBeCalledWith(path.join('pathToCachedTool', 'kubectl.exe'), '777');
    });

    test('installKubectl() - return its path to installed kubectl', async () => {
        jest.spyOn(toolCache, 'find').mockReturnValue('pathToCachedDir');
        jest.spyOn(toolCache, 'downloadTool').mockImplementation(async () => { throw 'Error!!'});
        jest.spyOn(os, 'type').mockReturnValue('Windows_NT');
        jest.spyOn(fs, 'readdirSync').mockImplementation((file, _) => ['kubectl.exe' as unknown as fs.Dirent]);
        jest.spyOn(fs, 'statSync').mockImplementation((file) => {
            const isDirectory = (file as string).indexOf('folder') == -1 ? false: true
            return { isDirectory: () =>  isDirectory } as fs.Stats;
        });
        jest.spyOn(fs, 'chmodSync').mockImplementation();
        jest.spyOn(core, 'debug').mockImplementation();

        expect(await kubectlUtil.installKubectl('v1.15.0')).toBe(path.join('pathToCachedDir', 'kubectl.exe'));
        expect(toolCache.find).toBeCalledWith('kubectl', 'v1.15.0');
    });

    test('installKubectl() - download and return path to latest kubectl', async () => {
        jest.spyOn(toolCache, 'find').mockReturnValue('');
        jest.spyOn(toolCache, 'downloadTool').mockResolvedValue('pathToTool');
        jest.spyOn(toolCache, 'cacheFile').mockResolvedValue('pathToCachedTool');
        jest.spyOn(os, 'type').mockReturnValue('Windows_NT');
        jest.spyOn(fs, 'chmodSync').mockImplementation();
        jest.spyOn(fs, 'readFileSync').mockReturnValue('v1.15.0');
        jest.spyOn(core, 'debug').mockImplementation();

        expect(await kubectlUtil.installKubectl('latest')).toBe(path.join('pathToCachedTool', 'kubectl.exe'));
        expect(toolCache.find).toBeCalledWith('kubectl', 'v1.15.0');
        expect(toolCache.downloadTool).toBeCalled();
        expect(toolCache.cacheFile).toBeCalled();
        expect(os.type).toBeCalled();
        expect(fs.chmodSync).toBeCalledWith(path.join('pathToCachedTool', 'kubectl.exe'), '777');
    });

    test('getKubectlPath() - throw if version is not provided and no kubectl is already present', async () => {
        jest.spyOn(core, 'getInput').mockReturnValue('');
        jest.spyOn(io, 'which').mockResolvedValue('');
        jest.spyOn(toolCache, 'findAllVersions').mockReturnValue([]);

        await expect(kubectlUtil.getKubectlPath()).rejects.toThrow('Kubectl is not installed, either add install-kubectl action or provide "kubectl-version" input to download kubectl');
        expect(core.getInput).toBeCalledWith('kubectl-version', {required: false});
        expect(io.which).toBeCalledWith('kubectl', false);
        expect(toolCache.findAllVersions).toBeCalledWith('kubectl');
    });

    test('getKubectlPath() - return installed version of kubectl if input not provided', async () => {
        jest.spyOn(core, 'getInput').mockReturnValue('');
        jest.spyOn(io, 'which').mockResolvedValue('pathToKubectl');

        expect(await kubectlUtil.getKubectlPath()).toBe('pathToKubectl');
        expect(core.getInput).toBeCalledWith('kubectl-version', {required: false});
        expect(io.which).toBeCalledWith('kubectl', false);
    });

    test('getKubectlPath() - return any version of kubectl from toolCache if input not provided', async () => {
        jest.spyOn(core, 'getInput').mockReturnValue('');
        jest.spyOn(io, 'which').mockResolvedValue('');
        jest.spyOn(toolCache, 'findAllVersions').mockReturnValue(['v2.0.0', 'v1.0.0']);
        jest.spyOn(toolCache, 'find').mockReturnValue('pathToCachedKubectl');
        jest.spyOn(os, 'type').mockReturnValue('Windows_NT');

        expect(await kubectlUtil.getKubectlPath()).toBe(path.join('pathToCachedKubectl', 'kubectl.exe'));
        expect(core.getInput).toBeCalledWith('kubectl-version', {required: false});
        expect(io.which).toBeCalledWith('kubectl', false);
        expect(toolCache.findAllVersions).toBeCalledWith('kubectl');
        expect(toolCache.find).toBeCalledWith('kubectl', 'v2.0.0');
    });

    test('getKubectlPath() - return path to specified version kubectl from toolCache', async () => {
        jest.spyOn(core, 'getInput').mockReturnValue('v2.0.0');
        jest.spyOn(toolCache, 'find').mockReturnValue('pathToKubectl');
        jest.spyOn(os, 'type').mockReturnValue('Windows_NT');

        expect(await kubectlUtil.getKubectlPath()).toBe(path.join('pathToKubectl', 'kubectl.exe'));
        expect(core.getInput).toBeCalledWith('kubectl-version', {required: false});
        expect(toolCache.find).toBeCalledWith('kubectl', 'v2.0.0');
    });
});
