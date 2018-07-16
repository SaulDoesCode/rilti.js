/* global Text Node */
import {query, flatten, infinify, isArr, isEl, isFunc, isInput, isMounted, isProxyNode, isStr, ProxyNodeSymbol} from './common.js'
import {domfn, emit, render, vpend, prime} from './dom-functions.js'
import {EventManager} from './event-manager.js'

const ProxiedNodes = new Map()

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
    const bindFN = val => { txt.textContent = val }
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

export const $ = node => {
  if (isProxyNode(node)) return node
  if (typeof node === 'string') {
    node = query(node)
    if (!node) throw new Error('no selector match')
  }
  if (ProxiedNodes.has(node)) return ProxiedNodes.get(node)
  if (!(node instanceof Node)) {
    throw new TypeError(`$ needs a Node: ${node}`)
  }

  const Class = new Proxy((c, state) => {
    domfn.class(node, c, state)
    return proxy
  }, {
    get: (fn, key) => node.classList.contains(key),
    set: (fn, key, val) => fn(key, val),
    deleteProperty: (_, key) => !!node.classList.remove(key)
  })

  if (isEl(node)) {
    var getAttr = node.getAttribute.bind(node)
    var hasAttr = node.hasAttribute.bind(node)
    var rmAttr = domfn.removeAttribute.bind(undefined, node)
    var Attr = new Proxy((attr, val) => {
      const result = domfn.attr(node, attr, val)
      return result === node ? proxy : result
    }, {
      get: (fn, key) => key === 'has' ? hasAttr : key === 'remove' ? rmAttr : getAttr(key),

      set (fn, key, val) {
        key === 'remove' ? rmAttr(val) : fn(key, val)
        return true
      },
      deleteProperty: (_, key) => domfn.removeAttribute(node, key)
    })
  }

  const isinput = isInput(node)
  const textContent = isinput ? 'value' : 'textContent'
  const innerHTML = isinput ? 'value' : node.nodeType === 3 ? textContent : 'innerHTML'

  const once = infinify(EventManager(true, node), false)
  const on = infinify(EventManager(false, node), false)

  const proxy = new Proxy(
    Object.assign(fn => {
      if (fn instanceof Function && !isProxyNode(fn)) {
        fn.call(node, proxy, node)
      }
      return node
    }, {
      class: Class,
      attr: Attr,
      on,
      once,
      emit: emit.bind(null, node),
      render: render.bind(null, node)
    }),
    {
      get (fn, key) {
        if (Reflect.has(fn, key)) return Reflect.get(fn, key)
        else if (key === 'state') return fn[key] || (fn[key] = state(Object.create(null), proxy))
        else if (key === 'txt') return node[textContent]
        else if (key === 'html') return node[innerHTML]
        else if (key === 'mounted') return isMounted(node)
        /*
        // still thinking about how to make this work
        else if (key === 'mounting') {
          return new Promise(resolve => {
            if (isMounted(node) || node.parentNode) return resolve(proxy.parent)
            proxy.once.mount(e => resolve(proxy.parent))
          })
        }
        */
        else if (key === 'children') return Array.from(node.children)
        else if (key === '$children') return Array.prototype.map.call(node.children, $)
        else if (key === 'parent' && node.parentNode) return $(node.parentNode)
        else if (key in domfn) {
          return (...args) => {
            const result = domfn[key](node, ...args)
            return result === node || result === proxy ? proxy : result
          }
        } else if (key === ProxyNodeSymbol) return true
        const val = node[key]
        return isFunc(val) && !isProxyNode(val) ? val.bind(node) : val
      },
      set (fn, key, val) {
        if (key === 'class') Class(node, val)
        else if (key === 'attr') Attr(node, val)
        else if (key === 'css') domfn.css(node, val)
        else if (key === 'state') (fn[key] || proxy[key])(val)
        else if (key === 'txt') node[textContent] = val
        else if (key === 'html' || key === 'children') {
          if (isStr(val)) {
            node[innerHTML] = val
          } else {
            node[textContent] = ''
            vpend(prime(val), node)
          }
        } else {
          node[key] = val
        }
        return true
      }
    }
  )
  ProxiedNodes.set(node, proxy)

  return proxy
}

export default $
