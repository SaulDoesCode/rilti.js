export default {
  input: 'src/core.js',
  output: {
    banner: `/*
* rilti a framework for all and none
* @author Saul van der Walt
* @license MIT
*/
/* global define */
`,
    file: 'dist/rilti.js',
    name: 'rilti',
    format: 'umd'
  }
}
