import {vi} from 'vitest'
;(globalThis as unknown as {jest: typeof vi}).jest = vi

vi.mock('@actions/core', () => ({
   getInput: vi.fn(),
   setOutput: vi.fn(),
   setFailed: vi.fn(),
   warning: vi.fn(),
   debug: vi.fn(),
   info: vi.fn()
}))

vi.mock('@actions/tool-cache', () => ({
   find: vi.fn(),
   findAllVersions: vi.fn(),
   downloadTool: vi.fn(),
   cacheFile: vi.fn(),
   cacheDir: vi.fn(),
   extractZip: vi.fn()
}))

vi.mock('@actions/io', () => ({
   which: vi.fn()
}))

vi.mock('@actions/io/lib/io-util', () => ({
   exists: vi.fn()
}))

vi.mock('@actions/exec', async () => {
   const globalState = globalThis as unknown as {
      __mockExecFn?: (...args: any[]) => any
   }

   return {
      getExecOutput: vi
         .fn()
         .mockImplementation(async (toolPath, args, options) => {
            if (!globalState.__mockExecFn) {
               throw new Error('__mockExecFn is not initialized')
            }

            return globalState.__mockExecFn(toolPath, args, options)
         })
   }
})
