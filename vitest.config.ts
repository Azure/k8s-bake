import {defineConfig} from 'vitest/config'

export default defineConfig({
   test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
      globals: true,
      clearMocks: true,
      testTimeout: 30000,
      setupFiles: ['src/test-setup.ts'],
      coverage: {
         provider: 'v8',
         thresholds: {
            branches: 0,
            functions: 14,
            lines: 27,
            statements: 27
         }
      }
   }
})
