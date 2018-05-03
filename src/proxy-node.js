import {query, infinify, isEl, isFunc, isInput, isNode, isMounted, isProxyNode, isStr, ProxyNodeSymbol} from './common.js'
import {domfn, emit, render, vpend, prime} from './dom-functions.js'
import {EventManager} from './event-manager.js'

const ProxiedNodes = new Map()

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

  const proxy = new Proxy(fn => {
    if (isFunc(fn) && !isProxyNode(fn)) fn.call(node, proxy, node)
    return node
  }, {
    get (_, key) {
      if (key === 'class') return Class
      else if (key === 'attr') return Attr
      else if (key === 'txt') return node[textContent]
      else if (key === 'html') return node[innerHTML]
      else if (key === 'on') return on
      else if (key === 'once') return once
      else if (key === 'emit') return emit.bind(undefined, node)
      else if (key === 'mounted') return isMounted(node)
      else if (key === 'render') return render.bind(node, node)
      else if (key === 'children') return Array.from(node.children)
      else if (key === '$children') return Array.from(node.children).map($)
      else if (key === 'parent' && node.parentNode) return $(node.parentNode)
      else if (key in domfn) {
        return (...args) => {
          const result = domfn[key](node, ...args)
          return result === node || result === proxy ? proxy : result
        }
      }
      return key === ProxyNodeSymbol || (isFunc(node[key]) && !isProxyNode(node[key]) ? node[key].bind(node) : node[key])
    },
    set (_, key, val) {
      if (key === 'class') Class(node, val)
      else if (key === 'attr') Attr(node, val)
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
  })
  ProxiedNodes.set(node, proxy)

  return proxy
}

export default $
