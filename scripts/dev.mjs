// Dev server: rebuilds dist/ on change and serves the repo for the examples.
// Zero runtime dependencies beyond rollup; binds to localhost only.
import { createServer } from 'node:http'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { extname, join, normalize, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { watch } from 'rollup'
import config from '../rollup.config.mjs'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const PORT = Number(process.env.PORT) || 2018
const HOST = process.env.HOST || '127.0.0.1'

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.md': 'text/markdown; charset=utf-8'
}

const resolvePath = url => {
  const { pathname } = new URL(url, 'http://localhost')
  const file = normalize(join(root, decodeURIComponent(pathname)))
  // refuse path traversal and dotfiles (.git, .env, ...)
  if (file !== root && !file.startsWith(root + sep)) return null
  if (file.slice(root.length).split(sep).some(p => p.startsWith('.'))) return null
  if (file.includes(sep + 'node_modules' + sep)) return null
  return file
}

createServer(async (req, res) => {
  if (req.url === '/') {
    res.writeHead(302, { Location: '/examples/basics/index.html' })
    return res.end()
  }
  let file = resolvePath(req.url)
  try {
    if (!file) throw new Error('forbidden')
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html')
    await stat(file)
  } catch {
    res.writeHead(404).end('not found')
    return
  }
  res.writeHead(200, {
    'Content-Type': types[extname(file)] || 'application/octet-stream',
    'Cache-Control': 'no-store'
  })
  createReadStream(file).pipe(res)
}).listen(PORT, HOST, () => {
  console.log(`serving http://${HOST}:${PORT}/`)
})

watch({ ...config, watch: { include: 'src/**' } }).on('event', e => {
  if (e.code === 'BUNDLE_END') {
    console.log(`built dist/ in ${e.duration}ms`)
    e.result.close()
  } else if (e.code === 'ERROR') {
    console.error(e.error)
  }
})
