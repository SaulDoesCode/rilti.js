{
  /* global rilti */
  const {each,extend,isPromise,isDef} = rilti

  rilti.model = (props = {}) => {
    const syncs = new Map()

    const n = extend(rilti.notifier({
      sync (obj, key, prop = key) {
        if (!syncs.has(obj)) syncs.set(obj, new Map())
        syncs.get(obj).set(prop, n.on('set:' + prop, val => {
          obj[key] = val
        }))
        if (isDef(props[prop])) obj[key] = props[prop]
        return obj
      },
      syncNode: (node, prop, key = 'textContent') => n.sync(node, key, prop),
      unsync (obj, prop) {
        if (syncs.has(obj)) {
          const syncedProps = syncs.get(obj)
          if (!prop) each(syncedProps, ln => ln.off()).clear()
          else if (syncedProps.has(prop)) {
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
      },
      $set: (key, fn) => n.on('set:'+key, fn),
      $get: (key, fn) => n.on('get:'+key, fn),
      $define(key, options) {
        Object.defineProperty(n, key, options)
      }
    }), props)

    const Async = new Proxy(n, {
      get: (_, key) => new Promise(resolve => {
        n.has(key) ? resolve(n[key]) : n.once('set:'+key, resolve)
        n.emit('get:' + key)
      })
    })

    const Model = new Proxy(n, {
      get: (_, key) => key === 'async' ? Async : n.emit('get:' + key)[key],
      set (_, key, val) {
        if (isPromise(val)) val.then(v => {
          n.emit('set:' + key, (n[key] = v))
        })
        else n.emit('set:' + key, (n[key] = val))
        return true
      }
    })

    return Model
  }
}
