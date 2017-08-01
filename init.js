const fs = require('fs');
const http = require('http');
const url = require('url');
const zlib = require('zlib');
const path = require('path');
const WebSocket = require('ws');
const {PassThrough, Readable} = require('stream');
const brotliCompress = require('iltorb').compressStream;
const command = require('child_process').exec;

const exec = cmd => new Promise((resolve, reject) => command(cmd, (err, stdout) => err ? reject(err) : resolve(stdout)));

const formatBytes = (bytes, decimals) => {
    if (bytes == 0) return '0 Bytes';
    let k = 1000, i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toPrecision(decimals + 1 || 3) + ' ' + 'Bytes,KB,MB,GB,TB,PB,EB,ZB,YB'.split(',')[i];
}

fs.watch('./src/', (type, filename) => {
  if(type === 'change' && filename.includes('.js')) {
    const minname = filename.split('.').map(e => e == 'js' ? 'min.js' : e).join('.');
    exec(`babili ./src/${filename} -o ./dist/${minname}`).then(() => {
      try {
        const srcSize = formatBytes(fs.statSync(`./src/${filename}`).size);
        const distSize = formatBytes(fs.statSync(`./dist/${minname}`).size);
        console.log(`unminified: ${filename} ${srcSize} \tminified: ${minname} ${distSize}`);
      } catch(e) {
        console.log('there was an error with the minification of '+filename);
      }
    });
  }
});

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
      sendFileStream(AcceptsBrotli, res, './rilti-site/main.html');
  } else {

    const parsedUrl = url.parse(req.url);
    // extract URL path
    let pathname = `.${parsedUrl.pathname}`;
    // maps file extention to MIME types
    fs.exists(pathname, exist => {
      if(!exist) return send404(res);

      if (fs.statSync(pathname).isDirectory()) {
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
          sendFileStream(AcceptsBrotli, res, pathname)
        } else send404(res);
      });

    });
  }

}).listen(2020);
console.log(`Server listening on port 2020\n`);









const streamConfig = (id, stream, data = null, pos = 0, ended = false) => ({id, stream, data, pos, ended});

/**
 * Creates a function that gets called when a stream ends.
 *
 * @param {Object} stream
 * @param {Object} otherStream
 * @param {Function(!Error, Boolean)} func
 */
const createOnEnd = (stream, otherStream, func) => () => {
  stream.ended = true;
  !otherStream.ended ? otherStream.read() : func(null, stream.pos === otherStream.pos);
}

/**
 * Returns a function that compares emitted `read()` call with that of the
 * most recent `read` call from another stream.
 *
 * @param {Object} stream
 * @param {Object} otherStream
 * @param {Function(Error, Boolean)} func
 * @return {Function(Buffer|String)}
 */
const createRead = (stream, otherStream, func) => () => {
    var data = stream.stream.read();
    if (!data) return stream.stream.once('readable', stream.read);

    // Make sure `data` is a buffer.
    if (!Buffer.isBuffer(data)) {
      data = new Buffer(typeof data === 'object' ? JSON.stringify(data) : data.toString());
    }

    var newPos = stream.pos + data.length;

    if (stream.pos < otherStream.pos) {
      var minLength = Math.min(data.length, otherStream.data.length);

      var streamData = data.slice(0, minLength);
      stream.data = data.slice(minLength);

      var otherStreamData = otherStream.data.slice(0, minLength);
      otherStream.data = otherStream.data.slice(minLength);

      // Compare.
      return func(null, streamData.every((streamDataValue, i) => otherStreamData[i] === streamDataValue));

    } else stream.data = data;

    stream.pos = newPos;
    if (newPos > otherStream.pos) {
      // If this stream is still emitting `data` events but the other has
      // ended, then this is longer than the other one.
      if (otherStream.ended) return func(null, false);

      otherStream.read(); // If this stream has caught up to the other, read from other one.
    } else stream.read();
}

/**
 * Tests that two readable streams are equal.
 *
 * @param {Readable|Stream} readStream2
 * @param {Readable|Stream} readStream2
 * @param {Function(!Error, Boolean)} func
 */
function streamEqual(origStream1, origStream2, func) {

  var readStream1 = origStream1.pipe(new PassThrough({ objectMode: true }));
  var readStream2 = origStream2.pipe(new PassThrough({ objectMode: true }));

  var stream1 = streamConfig(1, readStream1);
  var stream2 = streamConfig(2, readStream2);

  stream1.read = createRead(stream1, stream2, cleanup);
  stream2.read = createRead(stream2, stream1, cleanup);
  var onend1 = createOnEnd(stream1, stream2, cleanup);
  var onend2 = createOnEnd(stream2, stream1, cleanup);

  function cleanup(err, equal) {
    origStream1.removeListener('error', cleanup);
    readStream1.removeListener('end', onend1);
    readStream1.removeListener('readable', stream1.read);

    origStream2.removeListener('error', cleanup);
    readStream2.removeListener('end', onend2);
    readStream1.removeListener('readable', stream2.read);

    func(err, equal);
  }

  origStream1.on('error', cleanup);
  readStream1.on('end', onend1);

  origStream2.on('error', cleanup);
  readStream2.on('end', onend2);

  stream1.stream.once('readable', stream1.read); // Start by reading from the first stream.
}
