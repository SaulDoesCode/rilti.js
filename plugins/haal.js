/*
haal.post('https://abc.xyz/', {
  body: {
    token: 'moocow24',
    action: 'update-condition',
    data: '42'
  }
})((res, output) => {
  if (!res.ok) console.error('bad things happened: ', res.err)
  if (output) {
    // do something
  } else {
    // check with res
  }
})
*/
{
  const ctype = 'Content-Type'

  const haal = new Proxy((endpoint, options = {}) => {
    if (options == null || typeof options !== 'object') options = {}
    if (endpoint != null && endpoint.constructor === Object) {
      [options, endpoint] = [endpoint, options.endpoint]
      if (!endpoint) throw new Error('road to nowhere? requests need enpoints')
    }
    if (options.method == null) options.method = 'GET'
    if (!options.headers) options.headers = {}
    if (haal.headers) {
      options.headers = Object.assign({}, haal.headers, options.headers)
    }

    if (typeof options.body === 'object') {
      if (window.msgpack && !options.json) {
        options.headers[ctype] = 'application/msgpack'
        options.body = window.msgpack.encode(options.body)
      } else {
        options.headers[ctype] = 'application/json'
        options.body = JSON.stringify(options.body)
      }
    }

    return handle => {
      window.fetch(endpoint, options).then(res => {
        const type = res.headers.get(ctype)
        const handleErr = err => {
          res.ok = false
          res.err = err
          handle(res, err)
        }
        if (type.includes('/json')) {
          res.json().then(out => handle(res, out), handleErr)
        } else if (type.includes('/msgpack') && window.msgpack) {
          res.blob().then(blob => {
            try {
              haal.filereader.onerror = null
              haal.filereader.onload = null
              haal.filereader.onerror = handleErr
              haal.filereader.onload = e => {
                try {
                  handle(res, window.msgpack.decode(new Uint8Array(e.target.result)))
                } catch (err) {
                  handleErr(err)
                } finally {
                  haal.filereader.onload = null
                  haal.filereader.onerror = null
                  haal.filereader.abort()
                }
              }
              haal.filereader.readAsArrayBuffer(blob)
            } catch (e) {
              handleErr(e)
            }
          }, handleErr)
        } else if (type.includes('text/') || type.includes('application/javascript')) {
          res.text().then(out => handle(res, out), handleErr)
        }
      })
    }
  }, {
    get (h, key) {
      return key in h ? Reflect.get(h, key) : (endpoint, options = {}) => {
        if (endpoint != null && endpoint.constructor === Object) {
          [options, endpoint] = [endpoint, options.endpoint]
        }
        options.method = key.toUpperCase()
        return haal(endpoint, options)
      }
    }
  })

  haal.filereader = new window.FileReader()
  haal.arrayEqual = (a, b) => !(a < b || b < a)
  haal.infinify = (fn, reflect = false) => new Proxy(fn, {
    get: (fn, key) => reflect && key in fn ? Reflect.get(fn, key) : fn.bind(null, key)
  })

  window.rilti.haal = haal
}
