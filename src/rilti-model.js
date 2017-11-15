{
  /* global rilti */
  const {each, extend, isPrimitive, isObj, isArr, isPromise, isFunc, isDef} = rilti

  const extractPrimitives = obj => {
    const data = {}
    each(obj, (val, key) => {
      if (isPrimitive(val)) {
        data[key] = val
      } else if (isArr(val)) {
        data[key] = val.filter(v => isPrimitive(v))
      } else if (isObj(val)) {
        data[key] = extractPrimitives(val)
      }
    })
    return data
  }

  rilti.model = (props = {}) => {
    const syncs = new Map()

    const $prop = type =>
      (key, fn) => isFunc(key) ? n.on('$' + type, key) : isFunc(fn) ? n.on(type + ':' + key, fn) : Model[key] = fn

    const n = extend(rilti.notifier({
      $sync (obj, key, prop = key) {
        if (!syncs.has(obj)) syncs.set(obj, new Map())
        syncs.get(obj).set(prop, n.on('set:' + prop, val => {
          obj[key] = val
        }))
        if (isDef(props[prop])) obj[key] = props[prop]
        return obj
      },
      $syncNode: (node, prop, key = 'textContent') => n.sync(node, key, prop),
      $unsync (obj, prop) {
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
      $set: $prop('set'),
      $get: $prop('get'),
      $define (key, options) {
        Object.defineProperty(n, key, options)
        return n
      },
      $rm (key) {
        if (isFunc(key)) return n.on.$rm(key)
        Reflect.deleteProperty(n, key)
        return n.emit.$rm(key)
      },
      $data: () => extractPrimitives(n)
    }), props)

    const Async = new Proxy(n, {
      get: (_, key) => new Promise(resolve => {
        n.has(key) ? resolve(n[key]) : n.once('set:' + key, resolve)
        n.emit('get:' + key)
      })
    })

    const Model = new Proxy(
      (obj, silent, key) => {
        if (!obj) return n
        for (key in obj) {
          n[key] = obj[key]
          if (!silent) {
            n.emit('$set', key, n[key])
            n.emit('set:' + key, n[key])
          }
        }
      },
      {
        get (_, key) {
          if (key === 'async') return Async
          if (key in n) {
            n.emit('get:' + key)
            n.emit('$get', key)
            return Reflect.get(n, key)
          }
          if (key[0] === '$') {
            key = key.slice(1)
            return v => (isDef(v) ? Model[key] = v : Model[key])
          }
        },
        set (_, key, val) {
          if (isPromise(val)) {
            val.then(v => {
              n.emit('set:' + key, (n[key] = v))
              n.emit('$set', key, v)
            })
          } else {
            n.emit('set:' + key, (n[key] = val))
            n.emit('$set', key, val)
          }
          return true
        },
        delete: (_, key) => n.$rm(key)
      }
    )

    return Model
  }
}
