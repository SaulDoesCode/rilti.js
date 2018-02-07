// Please note this rilti extention requires localForage.js to work

{ /* global rilti WebSocket btoa localStorage localforage fetch */
  const {isObj, isArr, model, notifier, extend, each} = rilti

  rilti.ws = (loc, conf = {}) => {
    const state = notifier()
    const ws = new WebSocket(loc)
    ws.onopen = () => {
      state.emit.open(state.isOpen = ws.readyState === 1)
    }
    ws.onmessage = e => {
      try {
        const msg = JSON.parse(e.data)
        state.emit.msg(msg, e)
      } catch (err) {
        if (!conf.silent) console.warn(`rilti.ws: couldn't decode json message`)
        state.emit.msg(e.data, e)
      }
    }
    ws.onerror = state.emit.err
    ws.onclose = state.emit.close

    if (!conf.defaults) conf.defaults = {}

    return extend(state, {
      ws,
      close () {
        ws.close()
      },
      set defaults (data) {
        if (isObj(data)) conf.defaults = Object.assign(data, conf.defaults)
        else throw new TypeError('rilti.ws: setDefaults only takes an Object')
      },
      get defaults () {
        return conf.defaults
      },
      send (msg) {
        try {
          if (isObj(msg)) {
            msg = JSON.stringify(Object.assign(msg, conf.defaults))
          }
          ws.readyState === 1 ? ws.send(msg) : state.once.open(() => ws.send(msg))
        } catch (err) {
          if (!conf.silent) console.error(err)
        }
      }
    })
  }

  rilti.arrayBufferToB64 = buff => {
    let binary = '';
    (new Uint8Array(buff)).forEach(b => {
      binary += String.fromCharCode(b)
    })
    return btoa(binary)
  }

  rilti.cache = name => {
    const store = notifier(localforage.createInstance({name}))

    store.delete = key => new Promise((resolve, reject) => {
      store.removeItem(key, err => {
        if (err) {
          store.emit.error(key, err)
          return reject(
            new Error(' an error occured while attempting to delete ' + key)
          )
        }
        resolve(key + ' deleted')
        store.emit['delete:' + key]()
      })
    })

    let ready = false
    store.ready(err => {
      if (err) throw err
      store.emit.ready(ready = true)
    })

    const cache = new Proxy(
      obj => obj && each(obj, (val, key) => {
        cache[key] = val
      }),
      {
        set (_, key, val) {
          if (!ready) {
            return store.once.ready(() => {
              cache[key] = val
            })
          }

          store.setItem(key, val, err => {
            if (err) return store.emit.error(key, err)
            store.emit('set:' + key, val)
          })
          return true
        },
        get: (_, key) => {
          if (Reflect.has(store, key)) {
            return Reflect.get(store, key)
          }
          return new Promise((resolve, reject) => {
            const getItem = () => {
              store.getItem(key, (err, val) => {
                if (err) {
                  reject(err)
                  return store.emit.error(key, err)
                }
                resolve(val)
                store.emit('get:' + key)
              })
            }

            ready ? getItem() : store.once.ready(getItem)
          })
        }
      }
    )

    store.resource = (loc, type = 'text', reqOptions) => new Promise((resolve, reject) => cache[loc].then(data => {
      if (data) return resolve(data)
      fetch(loc, reqOptions || {
        method: 'GET',
        mode: 'cors'
      })
      .then(res => {
        resolve(cache[loc] = res[type]())
      }, reject)
    }, reject))

    store.local = new Proxy(
      extend((prop, value) => {
        if (isObj(prop)) {
          each(prop, (val, key) => store.local(key, val))
        } else if (value !== undefined) {
          const isJSON = isObj(value) || isArr(value)
          localStorage.setItem(prop, isJSON ? JSON.stringify(value) : value)
          if (isJSON) {
            localStorage.setItem('isJSON:' + prop, true)
          }
        } else {
          if (localStorage.getItem('isJSON:' + prop)) {
            return JSON.parse(localStorage.getItem(prop))
          }
          return localStorage.getItem(prop)
        }
      }, {
        clear () {
          localStorage.clear()
        },
        remove (...items) {
          each(items, item => {
            localStorage.removeItem(item)
            localStorage.removeItem('isJSON:' + item)
          })
        }
      }),

      {
        get (local, key) {
          return key in local ? local[key] : local(key)
        },
        set (local, key, val) {
          return local(key, val)
        }
      }
    )
    return cache
  }

  rilti.apps = {}

  const defaultConf = {
    cache: true
  }

  rilti.app = (name, conf = {}, data = {}) => {
    if (name in rilti.apps) return rilti.apps[name]
    conf = extend(conf, defaultConf, true)

    const core = model(data)
    if (conf.cache) core.cache = rilti.cache(name)
    core.eventEmit = (type, vfn) => (e, el) => {
      core.emit(type, vfn(el, e))
    }

    rilti.apps[name] = core
    return fn => fn(core, core.cache, core.cache.local)
  }
}
