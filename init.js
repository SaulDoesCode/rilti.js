const fs = require('fs')
const babel = require('babel-core')
const childProc = require('child_process')

const exec = cmd => {
  return new Promise((resolve, reject) => {
    childProc.exec(cmd, (err, stdout) => {
      err ? reject(err) : resolve(stdout)
    })
  })
}

const formatBytes = (bytes, decimals) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1000
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return (bytes / Math.pow(k, i)).toPrecision(decimals + 1 || 3) + ' ' + 'Bytes,KB,MB,GB,TB,PB,EB,ZB,YB'.split(',')[i]
}

const minfiyScript = (filename, minfile) => {
  const rawCode = fs.readFileSync(filename, 'utf8')

  const {code} = babel.transform(rawCode, {
    sourceMaps: false,
    minified: true,
    presets: ['minify']
  })

  fs.writeFile(minfile, code, err => {
    if (err) throw err
    try {
      const srcSize = formatBytes(fs.statSync(filename).size)
      const distSize = formatBytes(fs.statSync(minfile).size)
      console.log(`unminified: ${filename} ${srcSize} \tminified: ${minfile} ${distSize}`)
    } catch (e) {
      console.log('there was an error with the minification of ' + filename)
    }
  })
}

const onlyOncePerN = (fn, n = 1000, canRun = true) => (...args) => {
  if (canRun) {
    fn(...args)
    canRun = false
  }
  setTimeout(() => {
    canRun = true
  }, n)
}

fs.watch('./src/', onlyOncePerN((type, filename) => {
  if (type === 'change' && filename.includes('.js')) {
    const minname = filename.split('.').map(e => e === 'js' ? 'min.js' : e).join('.')
    const minfileLoc = `./dist/${minname}`
    const fileLoc = `./src/${filename}`

    try {
      minfiyScript(fileLoc, minfileLoc)
    } catch (err) {
      console.log(`something's fishy: `, err)
    }
  }
}))
