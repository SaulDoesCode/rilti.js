/* global Node */
import { query, infinify, isEl, isObj, isFunc, isInput, isMounted, isProxyNode, isStr, ProxyNodeSymbol } from './common.js'
import { domfn, emit, render, vpend, prime } from './dom-functions.js'
import { EventManager } from './event-manager.js'

// weak so proxied nodes can still be garbage collected
const ProxiedNodes = new WeakMap()

const hasOwn = (o, key) => Object.prototype.hasOwnProperty.call(o, key)

export const $ = node => {
  if (isProxyNode(node)) return node
  if (typeof node === 'string') {
    node = query(node)
    if (!node) throw new Error('$: no match')
  }
  if (node == null || typeof node !== 'object') {
    throw new TypeError(`$ needs a Node: ${String(node)}`)
  }
  if (ProxiedNodes.has(node)) return ProxiedNodes.get(node)
  if (!(node instanceof Node)) {
    throw new TypeError(`$ needs a Node: ${String(node)}`)
  }

  const Class = new Proxy((c, state) => {
    domfn.class(node, c, state)
    return proxy
  }, {
    get: (fn, key) => typeof key === 'symbol'
      ? Reflect.get(fn, key)
      : !!node.classList && node.classList.contains(key),
    set (fn, key, val) {
      fn(key, !!val)
      return true
    },
    deleteProperty (_, key) {
      if (node.classList) node.classList.remove(key)
      return true
    }
  })

  let Attr
  if (isEl(node)) {
    const getAttr = node.getAttribute.bind(node)
    const hasAttr = node.hasAttribute.bind(node)
    const rmAttr = domfn.removeAttribute.bind(null, node)
    Attr = new Proxy((attr, val) => {
      const result = domfn.attr(node, attr, val)
      return result === node ? proxy : result
    }, {
      get: (fn, key) => typeof key === 'symbol'
        ? Reflect.get(fn, key)
        : key === 'has' ? hasAttr : key === 'remove' ? rmAttr : getAttr(key),
      set (fn, key, val) {
        key === 'remove' ? rmAttr(val) : fn(key, val)
        return true
      },
      deleteProperty (_, key) {
        domfn.removeAttribute(node, key)
        return true
      }
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
      render: render.bind(null, node),
      [ProxyNodeSymbol]: true
    }),
    {
      get (fn, key) {
        if (key in fn && !(key in Function.prototype)) return fn[key]
        else if (key === 'txt') return node[textContent]
        else if (key === 'html') return node[innerHTML]
        else if (key === 'mounted') return isMounted(node)
        else if (key === 'children') return Array.from(node.children)
        else if (key === '$children') return Array.prototype.map.call(node.children, $)
        else if (key === 'parent' && node.parentNode) return $(node.parentNode)
        else if (key in domfn) {
          return (...args) => {
            const result = domfn[key](node, ...args)
            return result === node || result === proxy ? proxy : result
          }
        }

        const val = node[key]
        // bind native (prototype) methods so they work on SVG/Text/etc too,
        // but leave the user's own function props untouched
        return isFunc(val) && !hasOwn(node, key) ? val.bind(node) : val
      },
      set (fn, key, val) {
        if (key === 'class') domfn.class(node, val, isObj(val) ? undefined : true)
        else if (key === 'attr') domfn.attr(node, val)
        else if (key === 'css') domfn.css(node, val)
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
