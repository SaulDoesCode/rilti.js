// Please note this rilti extention requires rilti-model.js and localForage.js to work

{
  const {isObj, isFunc, model, notifier, extend} = rilti

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

  rilti.cache = name => {
    const jsonKeys = new Set()

    const store = notifier(localforage.createInstance({name}))
    store.delete = key => new Promise((resolve, reject) => {
      store.removeItem(key)
      .then(() => {
        if (jsonKeys.has(key)) jsonKeys.delete(key)
        resolve(key + ' deleted')
        store.emit['delete:' + key]()
      })
      .catch(err => {
        store.emit.error(key, err)
        reject(' an error occured while attempting to delete ' + key)
      })
    })

    let ready = false
    store.ready()
    .then(() => {
      store.emit.ready(ready = true)
    })
    .catch(store.emit.error)

    const cache = new Proxy(store, {
      set (store, key, val) {
        if (!ready) return store.once.ready(() => cache[key] = val)
        if (isObj(val)) {
          val = JSON.stringify(val)
          jsonKeys.add(key)
        } else if (jsonKeys.has(key)) {
          jsonKeys.delete(key)
        }
        store.setItem(key, val)
        .then(store.emit['set:' + key])
        .catch(err => {
          store.emit.error(key, err)
        })

        return true
      },
      get (store, key) {
        if (Reflect.has(store, key)) {
          return Reflect.get(store, key)
        }
        return new Promise((resolve, reject) => {
          const getItem = () => {
            store.getItem(key)
            .then(val => {
              if (jsonKeys.has(key)) {
                val = JSON.parse(val)
              }
              resolve(val)
              store.emit('get:' + key)
            })
            .catch(err => {
              reject(err)
              store.emit.error(key, err)
            })
          }
          ready ? getItem() : store.once.ready(getItem)
        })
      }
    })

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
    core.eventEmit = (type, vfn) => (e, el) => core.emit(type, vfn(el, e))

    rilti.apps[name] = core
    return fn => fn(core, core.cache)
  }
}
