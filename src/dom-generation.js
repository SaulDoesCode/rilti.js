import {isArr, isObj, isProxyNode, isPrimitive, isRenderable} from './common.js'
import {updateComponent, components} from './components.js'
import {CR} from './lifecycles.js'
import {attach, domfn} from './dom-functions.js'
import {once, on, EventManager} from './event-manager.js'
import $ from './proxy-node.js'

export const html = (input, host) => {
  if (input instanceof Function) input = input(host)
  if (typeof input === 'string') {
    return Array.from(
      document.createRange().createContextualFragment(input).childNodes
    )
  } else if (input instanceof window.Node) {
    return input
  } else if (isArr(input)) {
    return input.map(i => html(i))
  }
}

export const frag = inner =>
  inner !== undefined ? html(inner) : document.createDocumentFragment()

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
        Object.defineProperty(el, prop, Object.getOwnPropertyDescriptor(props, prop))
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

const infinifyDOM = (dom, tag) => {
  if (Reflect.has(dom, tag)) return Reflect.get(dom, tag)
  const el = dom.bind(undefined, tag)
  el.$classes = []
  return (dom[tag] = new Proxy(el, {
    apply (el, _, args) {
      el = el(...args)
      if (dom[tag].$classes.length) {
        for (let i = 0; i < dom[tag].$classes.length; i++) {
          el.classList.add(dom[tag].$classes[i])
        }
        dom[tag].$classes.length = 0
      }
      return el
    },
    get (el, className, proxy) {
      if (className === '$classes') return el.$classes
      el.$classes.push(...className.replace(/_/g, '-').split('.'))
      return proxy
    }
  }))
}

export const body = (...args) => {
  attach(document.body || 'body', 'appendChild', ...args)
  return args.length > 1 ? args : args[0]
}

export const text = (options, txt = '') => {
  if (isPrimitive(options)) [txt, options] = [options, undefined]
  return dom(new window.Text(txt), options)
}

const reserved = ['$', 'id', 'render', 'children', 'html', 'class', 'className']
const ns = 'http://www.w3.org/2000/svg'
const svgEL = (tag, opts, ...children) => {
  const el = document.createElementNS(ns, tag)
  if (isObj(opts)) {
    for (const key in opts) {
      if (isPrimitive(opts[key]) && reserved.indexOf(key) === -1 && !(key in domfn)) {
        el.setAttribute(key, opts[key])
        opts[key] = undefined
      }
    }
  }
  return dom(el, opts, ...children)
}
export const svg = new Proxy(svgEL.bind(undefined, 'svg'), {
  get: (_, tag) => infinifyDOM(svgEL, tag)
})

export const dom = new Proxy(Object.assign((tag, opts, ...children) => {
  const el = typeof tag === 'string' ? document.createElement(tag) : tag

  const iscomponent = components.has(el.tagName)
  if (iscomponent) var componentHandled

  const proxied = $(el)

  if (isObj(opts)) {
    var {pure} = opts
    if (!iscomponent && opts.props) assimilate.props(el, opts.props)
    opts.methods && assimilate.methods(el, opts.methods)
    if (isObj(opts.state)) {
      proxied.state = opts.state
    }
    for (const key in opts) {
      let val = opts[key]
      if (val == null) continue

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
      } else if (key in el) {
        if (typeof el[key] === 'function') {
          isArr(val) ? el[key].apply(el, val) : el[key](val)
        } else {
          el[key] = opts[key]
        }
      } else if (key in domfn) {
        val = isArr(opts[key]) ? domfn[key](el, ...val) : domfn[key](el, val)
        if (val !== el) opts[key] = val
      }
    }

    if (opts.cycle) {
      const {mount, create, remount, unmount} = opts.cycle
      create && once.create(el, create.bind(el, proxied))
      mount && once.mount(el, mount.bind(el, proxied))
      opts.cycle.unmount = unmount && on.unmount(el, unmount.bind(el, proxied))
      opts.cycle.remount = remount && on.remount(el, remount.bind(el, proxied))
    }

    if (iscomponent) {
      updateComponent(el, undefined, undefined, opts.props)
      componentHandled = true
    }

    const renderHost = opts.$ || opts.render
    if (renderHost) attach(renderHost, 'appendChild', el)
    else if (opts.renderAfter) attach(opts.renderAfter, 'after', el)
    else if (opts.renderBefore) attach(opts.renderBefore, 'before', el)
  }

  if (el.nodeType !== 3 /* el != TextNode */) {
    if (isProxyNode(opts) && opts !== proxied) {
      children.unshift(opts(proxied))
    } else if (opts instanceof Function) {
      const result = opts.call(el, proxied)
      opts = result !== el && result !== proxied ? result : undefined
    }
    if (isRenderable(opts)) children.unshift(opts)
    if (children.length) attach(proxied, 'appendChild', ...children)
  }

  iscomponent
    ? !componentHandled && updateComponent(el, undefined)
    : CR(el, true, iscomponent)

  return pure ? el : proxied
}, {text, body, svg, frag, html}), {get: infinifyDOM})
