const fs = require('fs');
const http = require('http');
const url = require('url');
const zlib = require('zlib');
const path = require('path');
const WebSocket = require('ws');
const {PassThrough, Readable} = require('stream');
const brotliCompress = require('iltorb').compressStream;
const command = require('child_process').exec;
const babel = require("babel-core");

const exec = cmd => new Promise((resolve, reject) => command(cmd, (err, stdout) => err ? reject(err) : resolve(stdout)));

const formatBytes = (bytes, decimals) => {
    if (bytes == 0) return '0 Bytes';
    let k = 1000, i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toPrecision(decimals + 1 || 3) + ' ' + 'Bytes,KB,MB,GB,TB,PB,EB,ZB,YB'.split(',')[i];
}

const onlyOncePerN = (fn, n = 1000, canRun = true) => (...args) => {
  if(canRun) {
    fn(...args);
    canRun = false;
  }
  setTimeout(() => canRun = true, n);
}


fs.watch('./src/', onlyOncePerN((type, filename) => {

  if(type === 'change' && filename.includes('.js')) {
    const minname = filename.split('.').map(e => e == 'js' ? 'min.js' : e).join('.');
    const srcFileStats = fs.statSync(`./src/${filename}`);
    console.log(filename, minname);

    if(srcFileStats.size > 1) babel.transformFile(`./src/${filename}`, {
      sourceMaps: false,
      minified: true,
      presets: ["minify"],
    }, (err, {code}) => {

      if (err) throw err;

      fs.writeFile(`./dist/${minname}`, code, err => {
        if (err) throw err;
        try {
          const srcSize = formatBytes(srcFileStats.size);
          const distSize = formatBytes(fs.statSync(`./dist/${minname}`).size);
          console.log(`unminified: ${filename} ${srcSize} \tminified: ${minname} ${distSize}`);
        } catch(e) {
          console.log('there was an error with the minification of '+filename);
        }
      });

    });

  }
}));

const wss = new WebSocket.Server({ port: 2021 }),

curry = (
  fn,
  arity = fn.length,
  next = (...memory) => (...more) => ((more.length + memory.length) >= arity ? fn : next)(...memory.concat(more))
) => next(),

deleteHandle = (handles, type, handle) => ((handles.has(type) && !handles.get(type).delete(handle).size) && handles.delete(type), handle),
addHandle = (handles, type, handle) => ((handles.has(type) ? handles : handles.set(type, new Set)).get(type).add(handle), handle),
handleMaker = (handles, one = false) => (type, handle) => {
  handle.one = one;
  handle.type = type;
  handle.off = () => deleteHandle(handles, type, handle);
  handle.on = () => addHandle(handles, type, handle.off());
  handle.once = () => (handle.one === true, handle.on());
  return addHandle(handles, type, handle);
},

notifier = (host = {}) => {
  const handles = new Map;

  host.on = handleMaker(handles);
  host.once = handleMaker(handles, true);
  host.off = curry(deleteHandle)(handles);
  host.hastype = type => handles.has(isFunc(type) ? type.type : type);
  host.emit = (type, ...args) => {
    if(handles.has(type)) handles.get(type).forEach(handle => {
        handle(...args);
        if(handle.one) handle.off();
    });
    return host;
  }
  return host;
},
changeNotifier = notifier();

fs.watch('./rilti-site/', (type, filename) => {
  if(type === 'change') changeNotifier.emit('update');
});

wss.on('connection', ws => {
  //ws.on('message', msg => {});
  changeNotifier.once('update', () => ws.send('reload', () => {}));
});

const mimeType = {
  '.ico': 'image/x-icon',
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.eot': 'appliaction/vnd.ms-fontobject',
  '.ttf': 'aplication/font-sfnt'
}

const sendFileStream = (useBrolti, res, location) => {
  res.statusCode = 200;
  fs.createReadStream(location).pipe(useBrolti ? brotliCompress() : zlib.createGzip()).pipe(res)
}

const send404 = res => {
  res.statusCode = 404;
  res.setHeader('Content-Encoding', 'utf8');
  res.setHeader('Content-type', 'text/html');
  res.end(`Error getting the file: it doesn't seem to exist.`);
}

http.createServer((req, res) => {

  const AcceptsBrotli = req.headers['accept-encoding'].includes('br');

  res.setHeader('Content-Encoding', AcceptsBrotli ? 'br' : 'gzip');

  res.setHeader('Cache-Control', 'max-age=86400,must-revalidate');

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  //res.setHeader('Access-Control-Allow-Credentials', true);

  // parse URL
  if(req.url == '/' || req.url == '/rilti-site/') {
      res.setHeader('Cache-Control', 'no-cache');
      sendFileStream(AcceptsBrotli, res, './rilti-site/main.html');
  } else {

    const parsedUrl = url.parse(req.url);
    // extract URL path
    let pathname = `.${parsedUrl.pathname}`;
    // maps file extention to MIME types
    fs.exists(pathname, exist => {
      if(!exist) return send404(res);

      if (fs.statSync(pathname).isDirectory()) {
        res.setHeader('Cache-Control', 'no-cache');
        let temp = pathname + '/main.html';
        if(fs.existsSync(temp)) pathname = temp;
        else {
          temp = pathname + '/index.html';
          if(fs.existsSync(temp)) pathname = temp;
        }
        temp = null;
      }

      fs.exists(pathname, modifiedPatExists => {
        if(modifiedPatExists) {
          res.setHeader('Content-type', mimeType[path.parse(pathname).ext] || 'text/plain');
          if(pathname.includes('rilti.js') || pathname.includes('main')) {
            res.setHeader('Cache-Control', 'no-cache');
          }
          sendFileStream(AcceptsBrotli, res, pathname);
        } else send404(res);
      });

    });
  }

}).listen(2020);
console.log(`Server listening on port 2020\n`);
