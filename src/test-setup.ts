import {vi} from 'vitest'

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
