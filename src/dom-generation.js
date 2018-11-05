/* global Node Text */
import {
  copyprop,
  isNum,
  isArr,
  isObj,
  isProxyNode,
  isPrimitive,
  isRenderable,
  isInput
} from './common.js'
import { updateComponent, components } from './components.js'
import { CR } from './lifecycles.js'
import { attach, databind, domfn } from './dom-functions.js'
import { once, on, EventManager } from './event-manager.js'
import $ from './proxy-node.js'

export const html = (input, host) => {
  if (input instanceof Function) input = input(host)
  if (isNum(input)) input = String(input)
  if (typeof input === 'string') {
    return Array.from(
      document.createRange().createContextualFragment(input).childNodes
    )
  } else if (input instanceof Node) {
    return input
  } else if (isArr(input)) {
    return input.map(i => html(i, host))
  }
  throw new Error('.html: unrenderable input')
}

export const h = (strs, ...args) => {
  let result = ''
  for (let i = 0; i < args.length; i++) result += strs[i] + args[i]
  result += strs[strs.length - 1]

  const template = document.createElement('template')
  template.innerHTML = result
  const { content } = template

  content.collect = ({ attr = 'ref', keep, assign = {}, proxy = true } = {}) => {
    Array.from(content.querySelectorAll('[' + attr + ']')).reduce((a, el) => {
      const ref = el.getAttribute(attr).trim()
      if (!keep) el.removeAttribute(attr)
      a[ref] = proxy ? $(el) : el
      return a
    }, assign)
    return assign
  }

  return content
}

export const frag = inner => inner != null
  ? html(inner) : document.createDocumentFragment()

export const assimilate = Object.assign(
  (el, { props, methods }, noProps) => {
    if (!noProps && props) assimilate.props(el, props)
    if (methods) assimilate.methods(el, methods)
  },
  {
    props (el, props) {
      const proxied = $(el)
      for (const prop in props) {
        let val = props[prop]
        if (prop in el) {
          el[prop] = val
        } else if (prop === 'accessors') {
          for (const key in val) {
            const { set = val[key], get = val[key] } = val[key]
            const accessors = {}
            if (set instanceof Function) {
              accessors.set = set.bind(el, proxied)
            }
            if (get instanceof Function) {
              accessors.get = get.bind(el, proxied)
            }
            Object.defineProperty(el, key, accessors)
          }
        } else if (val instanceof Function && !isProxyNode(val)) {
          el[prop] = val.call(el, proxied)
        } else {
          copyprop(el, props, prop)
        }
      }
    },
    methods (el, methods) {
      const proxied = $(el)
      for (const name in methods) {
        Object.defineProperty(el, name, { value: methods[name].bind(el, proxied) })
      }
    }
  }
)

// classes.push(...className.replace(/_/g, '-').split('.'))

const tagify = str => {
  const upperChars = str.match(tagify.regexp)
  if (!upperChars) return str
  for (let i = 0, n = upperChars.length; i < n; i++) {
    str = str.replace(new RegExp(upperChars[i]), '-' + upperChars[i].toLowerCase())
  }
  return str[0] === '-' ? str.slice(1) : str
}
tagify.regexp = /([A-Z])/g

const infinifyDOM = (gen, tag) => (tag = tagify(tag)) && tag in gen
  ? Reflect.get(gen, tag)
  : (gen[tag] = new Proxy(gen.bind(null, tag), {
    get (fn, classes) {
      classes = classes.replace(/_/g, '-').split('.')
      return new Proxy(function () {
        const el = fn.apply(null, arguments)
        el.classList.add(...classes)
        return el
      }, {
        get (_, anotherClass, proxy) {
          classes.push(...anotherClass.replace(/_/g, '-').split('.'))
          return proxy
        }
      })
    }
  }))

export const body = (...args) =>
  attach(document.body || 'body', 'appendChild', ...args)

export const text = (options, txt = '') => isPrimitive(options)
  ? dom(new Text(options)) : dom(new Text(txt), options)

const reserved = ['$', 'id', 'render', 'children', 'html', 'class', 'className']
const ns = 'http://www.w3.org/2000/svg'
const svgEL = (tag, ops, ...children) => {
  const el = document.createElementNS(ns, tag)
  if (isObj(ops)) {
    for (const key in ops) {
      if (isPrimitive(ops[key]) && !reserved.includes(key) && !(key in domfn)) {
        el.setAttribute(key, ops[key])
        delete ops[key]
      }
    }
  }
  return dom(el, ops, ...children)
}
export const svg = new Proxy(svgEL.bind(null, 'svg'), {
  get: (_, tag) => infinifyDOM(svgEL, tag)
})

export const dom = new Proxy(Object.assign((tag, ops, ...children) => {
  if (tag[0] === '$') {
    tag = tag.slice(1)
    var pure = true
  }
  const el = tag.constructor === String ? document.createElement(tag) : tag

  const iscomponent = components.has(el.tagName)
  if (iscomponent) var componentHandled

  let proxied
  if (!isObj(ops)) {
    if (!pure) proxied = $(el)
  } else {
    var { cycle, bind } = ops
    if (!pure || !(pure = ops.pure)) proxied = $(el)

    assimilate(el, ops, iscomponent)

    let val
    for (const key in ops) {
      if ((val = ops[key]) == null) continue

      if (key[0] === 'o' && key[1] === 'n') {
        const isOnce = key[2] === 'c' && key[3] === 'e'
        const i = isOnce ? 4 : 2
        const mode = key.substr(0, i)
        let type = key.substr(i)
        const evtfn = EventManager(isOnce)
        const args = isArr(val) ? val : [val]
        if (!ops[mode]) ops[mode] = {}
        ops[mode][type] = type.length
          ? evtfn(el, type, ...args) : evtfn(el, ...args)
      } else if (key in el) {
        if (el[key] instanceof Function) {
          isArr(val) ? el[key].apply(el, val) : el[key](val)
        } else {
          el[key] = ops[key]
        }
      } else if (key in domfn) {
        val = isArr(val) ? domfn[key](el, ...val) : domfn[key](el, val)
        if (val !== el) ops[key] = val
      }
    }

    if (bind) {
      const isinput = isInput(el)
      for (const key in bind) {
        if (key in el) throw new Error('databind overwrites property')
        bind[key].host = proxied || el
        bind[key].isinput = isinput
        const b = databind(bind[key])
        Object.defineProperty(bind, key, {
          get () { return b.val },
          set: b.change
        })
        Object.defineProperty(bind, '$' + key, {
          value: b
        })
      }
      el.bind = bind
    }

    if (iscomponent) {
      updateComponent(el, null, null, ops.props)
      componentHandled = true
    }

    if (cycle) {
      const { mount, create, remount, unmount } = cycle
      if (create) once.create(el, create.bind(el, proxied || el))
      if (mount) once.mount(el, mount.bind(el, proxied || el))
      if (unmount) cycle.unmount = on.unmount(el, unmount.bind(el, proxied || el))
      if (remount) cycle.remount = on.remount(el, remount.bind(el, proxied || el))
    }

    const host = ops.$ || ops.render
    if (host) attach(host, 'appendChild', el)
    else if (ops.renderAfter) attach(ops.renderAfter, 'after', el)
    else if (ops.renderBefore) attach(ops.renderBefore, 'before', el)
  }

  if (el.nodeType !== 3 /* el != Text */) {
    if (isProxyNode(ops) && (!proxied || ops !== proxied)) {
      children.unshift(ops(proxied || el))
    } else if (ops instanceof Function) {
      const result = ops.call(el, proxied || el)
      ops = result !== el && result !== proxied ? result : undefined
    }

    if (isRenderable(ops)) children.unshift(ops)

    if (children.length) attach(proxied || el, 'appendChild', children)
  }

  iscomponent
    ? !componentHandled && updateComponent(el)
    : CR(el, true, iscomponent)

  return proxied || el
}, { text, body, svg, frag, html }), { get: infinifyDOM })
