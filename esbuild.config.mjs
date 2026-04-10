import {build} from 'esbuild'

await build({
   entryPoints: ['src/run.ts'],
   bundle: true,
   platform: 'node',
   target: 'node24',
   format: 'esm',
   outfile: 'lib/index.js',
   banner: {
      js: "import {createRequire} from 'node:module'; const require = createRequire(import.meta.url);"
   }
})
