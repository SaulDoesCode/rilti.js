{
  /* global rilti */
  const {each,extend,isPromise} = rilti

  rilti.model = (props = {}) => {
    const syncs = new Map()

    const n = extend(rilti.notifier({
      sync (obj, key, prop = key) {
        if (!syncs.has(obj)) syncs.set(obj, new Map())
        syncs.get(obj).set(prop, n.on('set:' + prop, val => {
          obj[key] = val
        }))
        obj[key] = props[prop]
        return obj
      },
      unsync (obj, prop) {
        if (syncs.has(obj)) {
          const syncedProps = syncs.get(obj)
          if (!prop) {
            each(syncedProps, ln => ln.off()).clear()
          } else if (syncedProps.has(prop)) {
            syncedProps.get(prop).off()
            syncedProps.delete(prop)
          }
          if (!syncedProps.size) syncs.delete(obj)
        }
        return obj
      },
      update (obj, key, silent) {
        for (key in obj) {
          n[key] = obj[key]
          if (!silent) n.emit('set:'+key, n[key])
        }
      }
    }), props)

    const Async = new Proxy(n, {
      get (_, key) {
        n.emit('get:' + key)
        return new Promise(resolve => {
          if (n.has(key)) {
            resolve(n[key])
          } else {
            n.once('set:'+key, resolve)
          }
        })
      }
    })

    const Model = new Proxy(n, {
      get (_, key) {
        n.emit('get:' + key)
        if (key === 'async') return Async
        return n[key]
      },
      set (_, key, val) {
        if (isPromise(val)) {
          val.then(v => {
            n.emit('set:' + key, (n[key] = v))
          })
        } else {
          n.emit('set:' + key, (n[key] = val))
        }
        return true
      }
    })

    return Model
  }
}
