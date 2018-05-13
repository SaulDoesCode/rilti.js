import {query, flatten, infinify, isNil, isArr, isEl, isFunc, isObj, isInput, isNode, isMounted, isProxyNode, isPrimitive, isStr, ProxyNodeSymbol} from './common.js'
import {domfn, emit, render, vpend, prime} from './dom-functions.js'
import {EventManager} from './event-manager.js'

const ProxiedNodes = new Map()

const state = (data = {}) => {
  const binds = new Map()
  binds.add = (key, fn) => {
    if (!binds.has(key)) {
      binds.set(key, new Set())
    }
    binds.get(key).add(fn)
  }
  binds.remove = (key, fn) => {
    if (binds.has(key)) {
      if (fn) {
        binds.get(key).delete(fn)
      } else {
        binds.each(key, bind => bind.revoke())
      }
      if (!binds.get(key).size) {
        binds.delete(key)
      }
    }
  }
  binds.each = (key, fn) => {
    if (binds.has(key)) {
      binds.get(key).forEach(fn)
    }
  }

  const bind = (key, fn, intermediate, revoke) => {
    if (intermediate) fn = intermediate(fn, proxy)
    binds.add(key, fn)
    if (key in data) fn(data[key], undefined, proxy)
    fn.revoke = () => {
      if (revoke) revoke(proxy)
      binds.remove.bind(undefined, key, fn)
    }
    return fn
  }

  bind.text = (key, fn, revoke) => {
    const text = new window.Text()
    const bindFN = val => { text.textContent = val }
    const b = bind(
      key,
      bindFN,
      undefined,
      () => {
        if (revoke) revoke(proxy)
        domfn.remove(text)
      }
    )
    if (key in data) bindFN(data[key])
    if (fn) fn(b)
    return text
  }

  const deleteProperty = key => {
    data[key] = undefined
    binds.remove(key)
  }

  const proxy = new Proxy((strings, ...keys) => {
    if (isObj(strings)) {
      for (let key in strings) {
        proxy[key] = strings[key]
      }
      return
    }
    if (isStr(strings)) {
      proxy[strings] = keys[0]
    }
    if (isArr(strings)) {
      return flatten(
        keys
          .reduce(
            (prev, cur, i) => [prev, bind.text(cur), strings[i + 1]],
            strings[0]
          )
          .filter(s => !isStr(s) || s.length)
      )
    }
  }, {
    get (fn, key) {
      if (key === 'bind') return bind
      else if (key[0] === '$') {
        return bind.bind(undefined, key.split('$')[1])
      }
      return data[key]
    },
    set (fn, key, val) {
      if (isNil(val)) {
        deleteProperty(key)
      }
      const old = data[key]
      if (isPrimitive(val) && val === old) {
        return true
      }
      data[key] = val
      binds.each(key, bind => {
        bind(val, old, proxy)
      })
      return true
    },
    deleteProperty (fn, key) {
      deleteProperty(key)
    }
  })

  return proxy
}

export const $ = node => {
  if (isProxyNode(node)) return node
  if (typeof node === 'string') node = query(node)
  if (ProxiedNodes.has(node)) return ProxiedNodes.get(node)
  if (!isNode(node)) throw new TypeError(`$ needs a Node: ${node}`)

  const Class = new Proxy((...args) => {
    domfn.class(node, ...args)
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
      get (fn, key) {
        if (key === 'has') return hasAttr
        if (key === 'remove' || key === 'rm') return rmAttr
        return getAttr(key)
      },
      set (fn, key, val) {
        key === 'remove' ? rmAttr(val) : fn(key, val)
        return true
      },
      deleteProperty: (_, key) => domfn.removeAttribute(node, key)
    })
  }

  const textContent = isInput(node) ? 'value' : 'textContent'
  const innerHTML = isInput(node) ? 'value' : node.nodeType === 3 ? textContent : 'innerHTML'

  const once = infinify(EventManager(true, node), false)
  const on = infinify(EventManager(false, node), false)

  const proxy = new Proxy(
    Object.assign(fn => {
      if (isFunc(fn) && !isProxyNode(fn)) fn.call(node, proxy, node)
      return node
    }, {
      class: Class,
      attr: Attr,
      on,
      once,
      emit: emit.bind(undefined, node),
      render: render.bind(undefined, node)
    }),
    {
      get (fn, key) {
        if (key in fn) return fn[key]
        else if (key === 'txt') return node[textContent]
        else if (key === 'html') return node[innerHTML]
        else if (key === 'mounted') return isMounted(node)
        else if (key === 'children') return Array.from(node.children)
        else if (key === '$children') return Array.prototype.map.call(node.children, $)
        else if (key === 'parent' && node.parentNode) return $(node.parentNode)
        else if (key === 'state') return fn[key] || (fn[key] = state())
        else if (key in domfn) {
          return (...args) => {
            const result = domfn[key](node, ...args)
            return result === node || result === proxy ? proxy : result
          }
        }
        return key === ProxyNodeSymbol || (isFunc(node[key]) && !isProxyNode(node[key]) ? node[key].bind(node) : node[key])
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
