import terser from '@rollup/plugin-terser'

const banner = `/*
* rilti a framework for all and none
* @author Saul van der Walt
* @license MIT
*/`

export default {
  input: 'src/core.js',
  // the modules reference each other lazily (inside functions), so the
  // cycles are safe; keep the build output quiet about them
  onwarn (warning, warn) {
    if (warning.code !== 'CIRCULAR_DEPENDENCY') warn(warning)
  },
  output: [
    { file: 'dist/rilti.mjs', format: 'es', banner },
    { file: 'dist/rilti.js', format: 'umd', name: 'rilti', banner },
    {
      file: 'dist/rilti.min.js',
      format: 'umd',
      name: 'rilti',
      banner,
      plugins: [terser({ format: { comments: /@license/ } })]
    }
  ]
}
