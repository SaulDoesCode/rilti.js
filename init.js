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

const UTF8 = 'utf8'

const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1000
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return (bytes / Math.pow(k, i)).toPrecision(decimals + 1) + ' ' + 'Bytes,KB,MB,GB,TB,PB,EB,ZB,YB'.split(',')[i]
}

const fileCache = {}

const minfiyScript = (filename, minfile, webloc) => {
  const rawCode = fs.readFileSync(filename, UTF8)

  if (rawCode === fileCache[webloc]) return
  fileCache[webloc] = rawCode

  const {code} = babel.transform(rawCode, {
    sourceMaps: false,
    minified: true,
    presets: ['minify']
  })

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

const onlyOncePerN = (fn, n = 800, canRun = true) => (...args) => {
  if (canRun) {
    fn(...args)
    canRun = false
  }
  setTimeout(() => {canRun = true}, n)
}

const urlify = location => {
  const hasDot = location[0] === '.'
  location = path.relative('./', path.resolve(location)).split('//').join('/')
  if (location[0] != '/') location = '/' + location
  if (hasDot) location = '.' + location
  return location
}

const watcher = chokidar.watch('../rilti.js/', {
  ignored:  [
    '../rilti.js/node_modules',
    '../rilti.js/.git'
  ]
})

const fileMutation = location => {
  const webloc = urlify(location)
  console.log(webloc, ' changed')
  if (location.includes('/src/') && location.includes('.js')) {
    const filename = path.basename(location)
    const fileLoc = `./src/${filename}`
    const minname = filename.split('.').map(e => e === 'js' ? 'min.js' : e).join('.')
    const minfileLoc = `./dist/${minname}`
    try {
      setTimeout(minfiyScript, 25, fileLoc, minfileLoc, webloc)
    } catch (err) {
      console.log(`something's fishy: `, err)
    }
  } else {
    try {
      fileCache[webloc] = fs.readFileSync(location, UTF8)
    } catch (e) {
      console.error('touble reading: ' + webloc)
    }
  }
}

watcher
.on('change', fileMutation)

watcher.on('ready', () => {
  watcher
  .on('add', fileMutation)
  .on('unlink', location => {
    location = urlify(location)
    delete fileCache[location]
    console.log(`removed: ${location}`)
  })
})

const mime_types = {
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.wav': 'audio/wav'
}

const send = (res, code, data, type = 'text/html') => {
  res.statusCode = code
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE')
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type')
  res.setHeader('Access-Control-Allow-Credentials', true)
  if (data.constructor === Object) {
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(data))
  } else {
    res.setHeader('Content-Type', type)
    res.end(data)
  }
}

const PORT = 2018

console.log(`Server Started on at localhost:${PORT}/`)
http.createServer((req, res) => {
    const pathname = url.parse(req.url).pathname
    if (pathname === '/') {
      res.writeHead(302, {Location: '/docs/'})
      res.end()
      return
    }

    let location = '.' + pathname

    let ext = path.extname(location)
    const type = mime_types[ext] || 'text/html'

    if (!ext && location[location.length - 1] !== '/') {
      res.writeHead(302, {Location: location + '/'})
      res.end()
      return
    }

    const data = fileCache[location]
    if (data !== undefined && data.length) {
      send(res, 200, data, type)
      return
    }

    fs.exists(location, exists => {
      if (!exists) {
        send(res, 404, {
          code: 404,
          msg: `Couldn't find: ${location}`
        })
        return
      }

      if (fs.statSync(location).isDirectory()) {
        const oldLoc = location
        location = urlify(location + '/index.html')
        if (location in fileCache && !(oldLoc in fileCache)) {
          Object.defineProperty(fileCache, oldLoc, {
            get() {
              try {
                return fileCache[location] || (fileCache[location] = fs.readFileSync(location, UTF8))
              } catch (e) {}
            }
          })
        }
      }

      fs.readFile(location, (err, data) => {
        if (err) {
          send(res, 500, `
            <h1 style="color:red;">
              Server Error: ${err.code}...
            </h1>
          `)
          return
        }
        send(res, 200, data, type)
        fileCache[location] = data
      })
    })
})
.listen(PORT)

console.log(`
  Listening for file changes...
`)
