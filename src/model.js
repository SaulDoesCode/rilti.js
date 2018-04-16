import {
  ModelSymbol,
  allare,
  each,
  flatten,
  isBool,
  isDef,
  isFunc,
  isObj,
  isNode,
  isInput,
  isProxyNode,
  isPromise,
  isRegExp,
  isStr,
  isNil,
  isArr
} from './common.js'
import emitter from './emitter.js'
import $ from './proxy-node.js'

export const model = (data, mitter = emitter(), store = new Map()) => {
  let Model
  const {emit, emitAsync, on, once} = mitter

  function del (key, silent) {
    if (isStr(silent) && allare(arguments, isStr)) {
      for (var i = 0; i < arguments.length; i++) {
        del(arguments[i], silent)
      }
    } else {
      store.delete(key)
      if (!silent) {
        emit('delete', key)
        emit('delete:' + key)
      }
    }
    return mut
  }

  const has = new Proxy(key => store.has(key), {
    get: (_, prop) => store.has(prop)
  })

  const mut = (key, val, silent) => {
    if (typeof key === 'string') {
      const oldval = store.get(key)
      if (isDef(val) && val !== oldval) {
        store.set(key, val)
        if (!silent) {
          emit('set', key, val)
          emit('set:' + key, val)
        }
        return val
      }
      if (!silent) {
        emit('get', key)
        emit('get:' + key)
      }
      return oldval
    } else if (isObj(key)) {
      for (const k in key) {
        isNil(key[k]) ? del(k, val) : mut(k, key[k], val)
      }
    } else if (isArr(key)) {
      for (var i = 0; i < key.length; i++) {
        mut(key[i][0], key[i][1], val)
      }
    }
    return Model
  }

  const syncs = new Map()
  const sync = new Proxy(function (obj, key, prop = key) {
    if (isArr(obj)) {
      const args = Array.from(arguments).slice(1)
      if (args.every(isStr)) {
        return sync.template(obj, ...args)
      }
    } else if (isProxyNode(obj) && key !== 'html') {
      obj = obj()
    }
    let isinput = isInput(obj) || obj.isContentEditable
    if (isinput && prop === key) {
      [prop, key] = [key, obj.isContentEditable ? 'innerText' : 'value']
    }
    if (!syncs.has(obj)) {
      syncs.set(obj, new Map())
    }

    let action = 'set'
    if (prop.indexOf(':') !== -1) {
      [action, prop] = prop.split(':')
      var valid = action === 'valid'
      var iscomputed = action === 'compute'
      if (valid) {
        action = 'validate'
      }
    }

    syncs
      .get(obj)
      .set(
        prop,
        on(
          action + ':' + prop,
          val => {
            if (!isinput || obj[key].trim() !== val) {
              obj[key] = val
            }
          }
        )
      )

    if (!valid && isinput) {
      var stop = $(obj).on.input(e => {
        mut(prop, obj[key].trim())
        if (validators.has(prop)) {
          validateProp(prop)
        }
      })
    }

    if (valid) {
      obj[key] = validateProp(prop)
    } else if (iscomputed && computed.has(prop)) {
      obj[key] = compute(prop)
    } else if (has(prop)) {
      obj[key] = mut(prop)
    }
    once('delete:' + prop, () => {
      if (stop) {
        stop()
      }
      sync.stop(obj, prop)
    })
    return obj
  }, {
    get (fn, prop) {
      if (Reflect.has(fn, prop)) {
        return Reflect.get(fn, prop)
      } else {
        return (obj, key) => {
          if (isNil(obj)) {
            return sync.text(prop)
          }
          if (isNil(key)) {
            if (
              (isNode(obj) || isProxyNode(obj)) &&
              !isInput(obj) && !obj.isContentEditable
            ) {
              return sync.text(prop)
            } else {
              key = prop
            }
          }
          return fn(obj, key, prop)
        }
      }
    }
  })

  sync.stop = (obj, prop) => {
    if (has(obj)) {
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
  }

  sync.text = new Proxy(
    prop => sync(new window.Text(), 'textContent', prop),
    {get: (fn, prop) => fn(prop)}
  )

  sync.template = (strings, ...keys) => flatten(
    keys.reduce(
      (prev, cur, i) => [prev, sync.text(cur), strings[i + 1]],
      strings[0]
    ).filter(
      s => !isStr(s) || s.length
    )
  )

  const Async = new Proxy((key, fn) => has(key) ? fn(store.get(key)) : once('set:' + key, fn), {
    get: (_, key) => new Promise(resolve => {
      has(key) ? resolve(store.get(key)) : once('set:' + key, resolve)
    }),
    set: (_, key, val) => val.then(mut.bind(undefined, key))
  })

  const validators = new Map()
  const validateProp = key => {
    const valid = store.has(key) && validators.has(key) && validators.get(key)(store.get(key))
    emit('validate:' + key, valid)
    emit('validate', key, valid)
    return valid
  }

  const Validation = new Proxy((key, validator) => {
    if (isNil(validator)) return validateProp(key)
    if (isRegExp(validator)) {
      const regexp = validator
      validator = val => isStr(val) && regexp.test(val)
    }
    if (isFunc(validator)) {
      if (!isBool(validator())) throw new Error(`".${key}": bad validator`)
      validators.set(key, validator)
    }
  }, {
    get: (_, key) => validateProp(key),
    set: (vd, key, val) => vd(key, val)
  })

  const computed = new Map()
  const compute = new Proxy(function (key, computation) {
    if (isFunc(computation)) computed.set(key, computation)
    else if (isStr(computation)) {
      if (allare(arguments, isStr)) {
        const result = {}
        each(arguments, key => {
          result[key] = compute(key)
        })
        return result
      }
    }
    if (computed.has(key)) {
      const computeProp = computed.get(key)
      const result = computeProp(Model)
      if (computeProp.result !== result) {
        emitAsync('compute:' + key, result)
        emitAsync('compute', key, result)
        computeProp.result = result
      }
      return result
    } else if (isObj(key)) each(key, (v, k) => compute(k, v))
  }, {
    get: (fn, key) => fn(key),
    set: (fn, key, computation) => fn(key, computation)
  })

  const toJSON = () => map2json(store)
  const toArray = () => Array.from(store.entries())
  const toJSONArray = () => JSON.stringify(toArray())

  const map = fn => {
    store.forEach((val, key) => {
      const newVal = fn(val, key)
      if (!isNil(newVal) && newVal !== val) {
        store.set(key, val)
      }
    })
    return Model
  }

  const filter = fn => {
    store.forEach((val, key) => {
      !fn(val, key) && store.delete(key)
    })
    return Model
  }

  // merge data into the store Map (or Map-like) object
  if (isStr(data)) {
    try { mut(JSON.parse(data), true) } catch (e) {}
  } else if (isDef(data)) {
    mut(data, true)
  }

  Model = new Proxy(
    Object.assign(
      mut,
      mitter,
      {
        compute,
        async: Async,
        valid: Validation,
        each: fn => {
          store.forEach(fn)
          return Model
        },
        has,
        del,
        map,
        filter,
        store,
        sync,
        syncs,
        toJSON,
        toArray,
        toJSONArray
      }
    ),
    {
      get: (o, key) => Reflect.has(o, key) ? o[key] : key === 'size' ? store.size : mut(key),
      set: (_, key, val) => isPromise(val) ? Async(key, val) : mut(key, val),
      delete: (_, key) => del(key)
    }
  )

  Model[ModelSymbol] = true
  return Model
}

export const map2json = (map, obj = {}) => {
  map.forEach((val, key) => {
    obj[key] = val
  })
  return JSON.stringify(obj)
}
