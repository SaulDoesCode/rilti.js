const fastify = require('fastify')
const compression = require('compression')
const fs = require('fs')
const chokidar = require('chokidar')
const zlib = require('zlib')

const PORT = 2018

// const isWindows = process.platform === 'win32'

const childProc = require('child_process')
const exec = cmd => new Promise((resolve, reject) => childProc.exec(cmd,
  (err, stdout) => err ? reject(err) : resolve(stdout)
))

const buildLibrary = () => exec('yarn build')

const app = fastify({
  ignoreTrailingSlash: true
})
app.use(compression())

app.get('/', (req, res) => {
  res.redirect('/examples/basics/index.html')
})

app.register(require('fastify-static'), {
  dotfiles: 'ignore',
  root: __dirname,
  redirect: true,
  setHeaders (res, path, stat) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST')
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type')
    res.setHeader('Access-Control-Allow-Credentials', true)
  }
})

app.listen(PORT, () => console.log(`Server Started on at localhost:${PORT}/`))

const watcher = chokidar.watch('../rilti.js/', {
  ignored: ['../rilti.js/node_modules', '../rilti.js/.git']
})

const fileMutation = async location => {
  console.log(`File Change: ${location}`)
  location = location.replace(/\\/g, '/')
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
        console.log('there was an error with the minification of ' + location)
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
