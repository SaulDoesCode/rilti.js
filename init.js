const express = require('express')
const http = require('http')
const path = require('path')
const url = require('url')
const fs = require('fs')
const babel = require('babel-core')
const chokidar = require('chokidar')
const childProc = require('child_process')
const zlib = require('zlib')

const exec = cmd => {
  return new Promise((resolve, reject) => {
    childProc.exec(cmd, (err, stdout) => {
      err ? reject(err) : resolve(stdout)
    })
  })
}
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1000
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return (bytes / Math.pow(k, i)).toPrecision(decimals + 1) + ' ' + 'Bytes,KB,MB,GB,TB,PB,EB,ZB,YB'.split(',')[i]
}


const app = express()

app.get('/', (req, res) => {
  res.redirect('/docs/')
})

app.use(express.static('./', {
  dotfiles: 'ignore',
  maxAge: 0,
  redirect: true,
  setHeaders (res, path, stat) {
    res.set('Access-Control-Allow-Origin', '*')
    res.set('Access-Control-Allow-Methods', 'GET, POST')
    res.set('Access-Control-Allow-Headers', 'X-Requested-With,content-type')
    res.set('Access-Control-Allow-Credentials', true)
  }
}))

const PORT = 2018
app.listen(PORT, () => console.log(`Server Started on at localhost:${PORT}/`))

const minfiyScript = (filename, minfile) => {
  const rawCode = fs.readFileSync(filename, 'utf8')
  try {
    var {code} = babel.transform(rawCode, {
      sourceMaps: false,
      minified: true,
      presets: ['minify']
    })
  } catch (e) {
    console.error(e)
  }


  fs.writeFile(minfile, code, err => {
    if (err) throw err
    try {
      const srcSize = formatBytes(fs.statSync(filename).size)
      const minSize = formatBytes(fs.statSync(minfile).size)
      const gzipSize = formatBytes(Buffer.byteLength(zlib.gzipSync(code)))
      console.log(`
  | raw: ${filename} ${srcSize}
  | min: ${minfile} ${minSize}
  | min+gz: ${gzipSize}
   _______________________________
      `)
    } catch (e) {
      console.log('there was an error with the minification of ' + filename)
    }
  })
}

const watcher = chokidar.watch('../rilti.js/', {
  ignored:  [
    '../rilti.js/node_modules',
    '../rilti.js/.git'
  ]
})

const fileMutation = location => {
  console.log(`File Change: ${location}`)
  if (location.includes('/src/') && location.includes('.js')) {
    const filename = path.basename(location)
    const fileLoc = `./src/${filename}`
    const minname = filename.replace('.js', '.min.js')
    const minfileLoc = `./dist/${minname}`
    try {
      setTimeout(minfiyScript, 25, fileLoc, minfileLoc)
    } catch (err) {
      console.log(`something's fishy: `, err)
    }
  }
}

watcher
.on('change', fileMutation)

watcher.on('ready', () => {
  watcher
  .on('add', fileMutation)
  .on('unlink', location => {
    console.log(`removed: ${location}`)
  })
})

console.log(`
  Listening for file changes...
`)
