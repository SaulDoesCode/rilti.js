const express = require('express')
const compression = require('compression')
const path = require('path')
const fs = require('fs')
const chokidar = require('chokidar')
const zlib = require('zlib')

const PORT = 2018

const childProc = require('child_process')
const exec = cmd => new Promise((resolve, reject) => childProc.exec(cmd,
  (err, stdout) => err ? reject(err) : resolve(stdout)
))

const buildLibrary = () => exec('npm run build')

const app = express()
app.use(compression())

app.get('/', (req, res) => {
  res.redirect('/test/test.html')
})

app.use(express.static('./', {
  dotfiles: 'ignore',
  redirect: true,
  setHeaders (res, path, stat) {
    res.set('Access-Control-Allow-Origin', '*')
    res.set('Access-Control-Allow-Methods', 'GET, POST')
    res.set('Access-Control-Allow-Headers', 'X-Requested-With,content-type')
    res.set('Access-Control-Allow-Credentials', true)
  }
}))

app.listen(PORT, () => console.log(`Server Started on at localhost:${PORT}/`))

const watcher = chokidar.watch('../rilti/', {
  ignored: ['../rilti/node_modules', '../rilti/.git']
})

const fileMutation = async location => {
  console.log(`File Change: ${location}`)
  if (location.includes('/src/') && location.includes('.js')) {
    try {
      const success = await buildLibrary()
      console.log(success)
      try {
        const Size = formatBytes(fs.statSync('./dist/rilti.js').size)
        const minSize = formatBytes(fs.statSync('./dist/rilti.min.js').size)
        const gzipSize = formatBytes(
          Buffer.byteLength(zlib.gzipSync(
            fs.readFileSync('./dist/rilti.min.js', 'utf8')
          ))
        )
        console.log(`
    | raw: ./dist/rilti.js' ${Size}
    | min: ./dist/rilti.min.js ${minSize}
    | min+gz: ./dist/rilti.min.js ${gzipSize}
     _______________________________
        `)
      } catch (e) {
        console.log('there was an error with the minification of ' + filename)
      }
    } catch (err) {
      console.log(`something's fishy: `, err)
    }
  }
}

watcher.on('change', fileMutation)
watcher.on('ready', () => {
  watcher
    .on('add', fileMutation)
    .on('unlink', location => {
      console.log(`removed: ${location}`)
    })
})

console.log('\nListening for file changes...\n')

const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1000
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return (bytes / Math.pow(k, i))
    .toPrecision(decimals + 1) +
    ' ' + 'Bytes,KB,MB,GB,TB,PB,EB,ZB,YB'.split(',')[i]
}
