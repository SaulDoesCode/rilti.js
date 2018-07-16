/* global Node Text */
import {copyprop, isNum, isArr, isObj, isProxyNode, isPrimitive, isRenderable} from './common.js'
import {updateComponent, components} from './components.js'
import {CR} from './lifecycles.js'
import {attach, domfn} from './dom-functions.js'
import {once, on, EventManager} from './event-manager.js'
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
    return input.map(i => html(i))
  }
  throw new Error('.html: unrenderable input')
}

export const frag = inner => inner != null
  ? html(inner) : document.createDocumentFragment()

export const assimilate = {
  props (el, props) {
    const proxied = $(el)
    for (const prop in props) {
      let val = props[prop]
      if (prop in el) {
        el[prop] = val
      } else if (prop === 'accessors') {
        for (const key in val) {
          const {set = val[key], get = val[key]} = val[key]
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
      Object.defineProperty(el, name, {value: methods[name].bind(el, proxied)})
    }
  }
}

// classes.push(...className.replace(/_/g, '-').split('.'))

const hyphenate = str => {
  const upperChars = str.match(/([A-Z])/g)
  if (!upperChars) return str
  for (let i = 0, n = upperChars.length; i < n; i++) {
    str = str.replace(new RegExp(upperChars[i]), '-' + upperChars[i].toLowerCase())
  }
  return str[0] === '-' ? str.slice(1) : str
}

const infinifyDOM = (gen, tag) => (tag = hyphenate(tag)) && tag in gen
  ? Reflect.get(gen, tag)
  : (gen[tag] = new Proxy(gen.bind(null, tag), {
    get (el, className) {
      const classes = className.replace(/_/g, '-').split('.')
      return new Proxy(function () {
        el = el.apply(null, arguments)
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

export const body = (...args) => attach(document.body || 'body', 'appendChild', ...args)

export const text = (options, txt = '') => {
  if (isPrimitive(options)) [txt, options] = [options, undefined]
  return dom(new Text(txt), options)
}

const reserved = ['$', 'id', 'render', 'children', 'html', 'class', 'className']
const ns = 'http://www.w3.org/2000/svg'
const svgEL = (tag, opts, ...children) => {
  const el = document.createElementNS(ns, tag)
  if (isObj(opts)) {
    for (const key in opts) {
      if (isPrimitive(opts[key]) && reserved.indexOf(key) === -1 && !(key in domfn)) {
        el.setAttribute(key, opts[key])
        delete opts[key]
      }
    }
  }
  return dom(el, opts, ...children)
}
export const svg = new Proxy(svgEL.bind(null, 'svg'), {
  get: (_, tag) => infinifyDOM(svgEL, tag)
})

export const dom = new Proxy(Object.assign((tag, opts, ...children) => {
  const el = typeof tag === 'string' ? document.createElement(tag) : tag

  const iscomponent = components.has(el.tagName)
  if (iscomponent) var componentHandled

  let proxied
  if (!isObj(opts)) {
    proxied = $(el)
  } else {
    var {pure, cycle} = opts

    if (!pure) {
      proxied = $(el)
      if (isObj(opts.state)) {
        opts.state = (proxied.state = opts.state)
      }
    }

    if (!iscomponent && opts.props) {
      assimilate.props(el, opts.props)
    }
    if (opts.methods) {
      assimilate.methods(el, opts.methods)
    }

    let val
    for (const key in opts) {
      if ((val = opts[key]) == null) continue

      if (key[0] === 'o' && key[1] === 'n') {
        const isOnce = key[2] === 'c' && key[3] === 'e'
        const i = isOnce ? 4 : 2
        const mode = key.substr(0, i)
        let type = key.substr(i)
        const evtfn = EventManager(isOnce)
        const args = isArr(val) ? val : [val]
        if (!opts[mode]) opts[mode] = {}
        opts[mode][type] = type.length
          ? evtfn(el, type, ...args) : evtfn(el, ...args)
      } else if (key === 'state') {
        continue
      } else if (key in el) {
        if (el[key] instanceof Function) {
          isArr(val) ? el[key].apply(el, val) : el[key](val)
        } else {
          el[key] = opts[key]
        }
      } else if (key in domfn) {
        val = isArr(val) ? domfn[key](el, ...val) : domfn[key](el, val)
        if (val !== el) opts[key] = val
      }
    }

    if (cycle) {
      const {mount, create, remount, unmount} = cycle
      if (create) once.create(el, create.bind(el, proxied || el))
      if (mount) once.mount(el, mount.bind(el, proxied || el))
      if (unmount) cycle.unmount = on.unmount(el, unmount.bind(el, proxied || el))
      if (remount) cycle.remount = on.remount(el, remount.bind(el, proxied || el))
    }

    if (iscomponent) {
      updateComponent(el, undefined, undefined, opts.props)
      componentHandled = true
    }

    if (proxied && opts.binds) {
      for (const key in opts.binds) {
        proxied.state.bind(key, opts.binds[key])
      }
    }

    const host = opts.$ || opts.render
    if (host) attach(host, 'appendChild', el)
    else if (opts.renderAfter) attach(opts.renderAfter, 'after', el)
    else if (opts.renderBefore) attach(opts.renderBefore, 'before', el)
  }

  if (el.nodeType !== 3 /* el != Text */) {
    if (isProxyNode(opts) && (!proxied || opts !== proxied)) {
      children.unshift(opts(proxied || el))
    } else if (opts instanceof Function) {
      const result = opts.call(el, proxied || el)
      opts = result !== el && result !== proxied ? result : undefined
    }
    if (isRenderable(opts)) children.unshift(opts)
    if (children.length === 1) {
      attach(proxied || el, 'appendChild', children[0])
    } else if (children.length) {
      attach(proxied || el, 'appendChild', ...children)
    }
  }

  iscomponent
    ? !componentHandled && updateComponent(el)
    : CR(el, true, iscomponent)

  return proxied || el
}, {text, body, svg, frag, html}), {get: infinifyDOM})
