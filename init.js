const fs = require('fs')
const zlib = require('zlib')
const path = require('path')
const babel = require('babel-core')

const exec = cmd => new Promise((resolve, reject) => require('child_process').exec(cmd, (err, stdout) => err ? reject(err) : resolve(stdout)))

const formatBytes = (bytes, decimals) => {
  if (bytes == 0) return '0 Bytes'
  let k = 1000, i = Math.floor(Math.log(bytes) / Math.log(k))
  return (bytes / Math.pow(k, i)).toPrecision(decimals + 1 || 3) + ' ' + 'Bytes,KB,MB,GB,TB,PB,EB,ZB,YB'.split(',')[i]
}

const onlyOncePerN = (fn, n = 1000, canRun = true) => (...args) => {
  if (canRun) {
    fn(...args)
    canRun = false
  }
  setTimeout(() => canRun = true, n)
}

fs.watch('./src/', onlyOncePerN((type, filename) => {
  if (type === 'change' && filename.includes('.js')) {
    const minname = filename.split('.').map(e => e == 'js' ? 'min.js' : e).join('.')
    const srcFileStats = fs.statSync(`./src/${filename}`)

    if (srcFileStats.size > 1) {
      babel.transformFile(`./src/${filename}`, {
        sourceMaps: false,
        minified: true,
        presets: ['minify']
      }, (err, {code}) => {
        if (err) throw err

        fs.writeFile(`./dist/${minname}`, code, err => {
          if (err) throw err
          try {
            const srcSize = formatBytes(srcFileStats.size)
            const distSize = formatBytes(fs.statSync(`./dist/${minname}`).size)
            console.log(`unminified: ${filename} ${srcSize} \tminified: ${minname} ${distSize}`)
          } catch (e) {
            console.log('there was an error with the minification of ' + filename)
          }
        })
      })
    }
  }
}))
