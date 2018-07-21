/* global Text Node */
import {query, flatten, isArr, isInput, isStr} from './common.js'
import {domfn} from './dom-functions.js'
import $ from './proxy-node.js'

const state = (data = Object.create(null), host) => {
  const binds = new Map()
  binds.add = (key, fn) => {
    if (!binds.has(key)) binds.set(key, new Set())
    binds.get(key).add(fn)
  }
  binds.remove = (key, fn) => {
    if (binds.has(key)) {
      if (fn) {
        binds.get(key).delete(fn)
      } else {
        binds.each(key, bind => bind.revoke())
      }

      if (!binds.get(key).size) binds.delete(key)
    }
  }
  binds.each = (key, fn) => {
    if (binds.has(key)) binds.get(key).forEach(fn)
  }

  const bind = (key, fn, revoke, intermediate) => {
    if (isInput(fn, true)) return bind.input(key, fn, revoke)
    if (intermediate) fn = intermediate(fn, proxy)
    binds.add(key, fn = fn.bind(host))
    if (key in data) fn(data[key], undefined, proxy, host)
    fn.revoke = () => {
      if (revoke) revoke(proxy)
      binds.remove(key, fn)
    }
    return fn
  }

  bind.text = (key, revoke) => {
    const txt = new Text()
    const bindFN = val => {
      txt.textContent = val
    }
    bind(key, bindFN, () => {
      if (revoke) revoke(proxy)
      domfn.remove(txt)
    })
    if (key in data) bindFN(data[key])
    return txt
  }

  bind.input = (key, input, revoke) => {
    if (isStr(input)) input = query(input)
    if (input == null) throw new Error(`bind ${key}: invalid/nil input element)`)
    if (input instanceof Node) input = $(input)
    let shouldUpdate = true
    const realInput = isInput(input)
    const bindFN = val => {
      if (shouldUpdate) {
        realInput ? input.value = val : input.innerText = val
      }
    }
    const listener = input.on.input(e => {
      shouldUpdate = false
      proxy[key] = input.value
      shouldUpdate = true
    })
    bind(key, bindFN, () => {
      if (revoke) revoke(proxy)
      listener.off()
    })
    if (key in data) bindFN(data[key])
    return input
  }

  const deleteProperty = key => {
    binds.remove(key)
    return delete data[key]
  }

  const proxy = new Proxy((strings, ...keys) => {
    if (strings.constructor === Object) {
      const silent = keys[0] === true
      for (const key in strings) {
        (silent ? data : proxy)[key] = strings[key]
      }
    } else if (typeof strings === 'string') {
      (keys[1] === true ? data : proxy)[strings] = keys[0]
    } else if (isArr(strings)) {
      return flatten(
        keys.reduce(
          (prev, cur, i) => [prev, bind.text(cur), strings[i + 1]],
          strings[0]
        ).filter(s => !isStr(s) || s.length)
      )
    } else if (isInput(strings, true) && typeof keys[0] === 'string') {
      return bind.input(strings, ...keys)
    }
    return proxy
  }, {
    get: (fn, key) =>
      key === 'bind' ? bind
        : key === 'binds' ? binds
          : key[0] === '$' ? bind.bind(null, key.substr(1))
            : Reflect.get(data, key),

    set (fn, key, val) {
      if (val == null) {
        deleteProperty(key)
      } else {
        const old = data[key]
        if (val !== old) {
          data[key] = val
          binds.each(key, bind => bind(val, old, proxy, host))
        }
      }
      return true
    },
    deleteProperty: (fn, key) => deleteProperty(key)
  })

  return proxy
}

export default state
