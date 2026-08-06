import {build} from 'esbuild'

const shared = {
   bundle: true,
   platform: 'node',
   target: 'node24',
   format: 'esm',
   banner: {
      js: "import {createRequire} from 'node:module'; const require = createRequire(import.meta.url);"
   }
}

await build({
   ...shared,
   entryPoints: ['src/run.ts'],
   outfile: 'lib/index.js'
})

await build({
   ...shared,
   entryPoints: ['src/post.ts'],
   outfile: 'lib/cleanup.js'
})
