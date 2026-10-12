import neostandard from 'neostandard'

export default [
  ...neostandard({
    env: ['browser'],
    ignores: ['dist/**', 'examples/**', 'plugins/**', '**/*.min.js']
  }),
  {
    files: ['scripts/**', '*.config.mjs'],
    languageOptions: { globals: { process: 'readonly' } }
  }
]
