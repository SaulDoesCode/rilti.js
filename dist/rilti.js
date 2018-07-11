/*
* rilti a framework for all and none
* @author Saul van der Walt
* @license MIT
*/
/* global define */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports)
    : typeof define === 'function' && define.amd ? define(['exports'], factory)
      : (factory((global.rilti = {})))
}(this, function (exports) {
  'use strict'

  /* global Node NodeList Element SVGElement HTMLInputElement HTMLTextAreaElement */
  const ProxyNodeSymbol = Symbol('Proxy Node')
  const ComponentSymbol = Symbol('Component')

  const isProxyNode = o => isFunc(o) && o[ProxyNodeSymbol] === true

  const isComponent = el => el !== undefined && el[ComponentSymbol] !== undefined

  const isArr = Array.isArray

  const isNil = o => o == null

  const isDef = o => o != null

  const isFunc = o => o instanceof Function

  const isBool = o => typeof o === 'boolean'

  const isObj = o => o != null && o.constructor === Object

  const isStr = o => typeof o === 'string'

  const isNum = o => typeof o === 'number' && !isNaN(o)

  const isInt = o => isNum(o) && o % 1 === 0

  const isArrlike = o => isArr(o) || (
    o != null && (
      o instanceof NodeList ||
      (!(isFunc(o) || isNode(o)) && o.length % 1 === 0)
    )
  )

  const isNodeList = (o, arr = true) => o instanceof NodeList || (arr && allare(o, isNode))

  const isNode = o => o instanceof Node

  const isPrimitive = o => {
    o = typeof o
    return o === 'string' || o === 'number' || o === 'boolean'
  }

  const isEl = o => o instanceof Element

  const isPromise = o => typeof o === 'object' && isFunc(o.then)

  const isRegExp = o => o instanceof RegExp

  const isEmpty = o => isNil(o) || !((isObj(o) ? Object.keys(o) : o).length || o.size)

  const isMounted = (child, parent = document) => isNodeList(child)
    ? Array.from(child).every(n => isMounted(n))
    : parent === child || !!(parent.compareDocumentPosition(child) & 16)

  const isSvg = o => {
    if (isProxyNode(o)) o = o()
    return o instanceof SVGElement
  }

  const isInput = o => {
    if (isProxyNode(o)) o = o()
    return o instanceof HTMLInputElement || o instanceof HTMLTextAreaElement
  }

  const isRenderable = o => o instanceof Node ||
    isProxyNode(o) || isPrimitive(o) || allare(o, isRenderable)

  /*
  * allare checks whether all items in an array are like a given param
  * it's similar to array.includes but allows functions
  */
  const allare = (arr, like) => {
    if (isArrlike(arr)) {
      const isfn = like instanceof Function
      for (let i = 0; i < arr.length; i++) {
        if (!(isfn ? like(arr[i]) : arr[i] === like)) {
          return false
        }
      }
      return true
    }
    return false
  }

  /*
  * compose a typical function composition functions
  * @ example compose(x => x + 1, x => x + 1)(1) === 3
  */
  const compose = (...fns) => fns.reduce((a, b) => (...args) => a(b(...args)))

  /*
  * curry a function
  * and optionally
  * set the arity or pre bound arguments
  */
  const curry = (fn, arity = fn.length, ...args) => arity <= args.length
    ? fn(...args)
    : curry.bind(undefined, fn, arity, ...args)

  /*
  * flatten recursively spreads out nested arrays
  * to make the entire array one dimentional
  * @example flatten([1, [2, [3]], 4, [5]]) -> [1, 2, 3, 4, 5]
  * @example flatten(x) -> [x]
  */
  const flatten = (arr, result = [], encaptulate = true) => {
    if (encaptulate && !isArr(arr)) return [arr]
    for (let i = 0; i < arr.length; i++) {
      isArr(arr[i]) ? flatten(arr[i], result) : result.push(arr[i])
    }
    return result
  }

  /*
  * runAsync runs a function asynchronously
  */
  exports.runAsync = (fn, ...args) =>
    window.requestIdleCallback(fn.bind(undefined, ...args))

  if (!window.requestIdleCallback) {
    exports.runAsync = (fn, ...args) => setTimeout(fn, 0, ...args)
  }

  /*
  * run runs a function on DOMContentLoaded or asynchronously
  * if document.body is present and loaded
  */

  const run = function () {
    if (document.body || document.readyState === 'complete') {
      exports.runAsync.apply(undefined, arguments)
    } else {
      window.addEventListener('DOMContentLoaded',
        e => exports.runAsync.apply(undefined, arguments),
        {once: true}
      )
    }
  }

  /*
  *
  * DOM Query Selector Functions
  *
  */
  const query = (selector, host = document) =>
    isNode(selector) ? selector : query(host).querySelector(selector)

  const queryAsync = (selector, host) => new Promise((resolve, reject) => {
    const find = () => {
      const result = query(selector, host)
      if (result == null) {
        reject(new Error("queryAsync: couldn't find " + selector))
      } else {
        resolve(result)
      }
    }
    document.body ? find() : run(find)
  })

  const queryAll = (selector, host = document) =>
    Array.from(query(host).querySelectorAll(selector))

  const queryEach = (selector, fn, host = document) => {
    if (!isFunc(fn)) [fn, host] = [host, document]
    return each(queryAll(selector, host), fn)
  }

  /*
  * each iterates over arrays, objects, integers,
  * and anything implementing .forEach
  */
  const each = (iterable, fn) => {
    if (isDef(iterable)) {
      if (isObj(iterable)) {
        for (const key in iterable) {
          fn(iterable[key], key, iterable)
        }
      } else if (iterable.length) {
        const len = iterable.length
        let i = 0
        while (i !== len) fn(iterable[i], i++, iterable)
      } else if (iterable.forEach) {
        iterable.forEach(fn)
      } else if (isInt(iterable)) {
        let i = 0
        while (i < iterable) fn(i++, iterable)
      }
    }
    return iterable
  }

  /*
  * infinify takes a function that has a string (like an event type or key)
  * and returns a proxy which binds the key of any get operation
  * as that initial string argument enabling a very natural feeling API
  * @scope infinify(func) -> Proxy<func>
  * @example const emit = infinify(emitFN); emit.anyEvent(details)
  */
  const infinify = (fn, reflect) => new Proxy(fn, {
    get: reflect === true
      ? (fn, key) => key in fn ? Reflect.get(fn, key) : fn.bind(undefined, key)
      : (fn, key) => fn.bind(undefined, key)
  })

  /*
  * mutateSet is an abstraction over Set and WeakSet
  * it combines all basic Set ops into a single function
  */
  const mutateSet = set => (n, state) =>
    set[state == null ? 'has' : state ? 'add' : 'delete'](n)

  /* global Text Node */

  const ProxiedNodes = new Map()

  const state = (data = {}, host) => {
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

    const bind = (key, fn, intermediate, revoke) => {
      if (intermediate) fn = intermediate(fn, proxy)
      binds.add(key, fn)
      if (key in data) fn.call(host, data[key], undefined, proxy, host)
      fn.revoke = () => {
        if (revoke) revoke(proxy)
        binds.remove(key, fn)
      }
      return fn
    }

    bind.text = (key, fn, revoke) => {
      const txt = new Text()
      const bindFN = val => { txt.textContent = val }
      const b = bind(
        key,
        bindFN,
        undefined,
        () => {
          if (revoke) revoke(proxy)
          domfn.remove(txt)
        }
      )
      if (key in data) bindFN(data[key])
      if (fn) fn(b)
      return txt
    }

    const deleteProperty = key => {
      binds.remove(key)
      return delete data[key]
    }

    const proxy = new Proxy((strings, ...keys) => {
      if (strings.constructor === Object) {
        for (const key in strings) proxy[key] = strings[key]
      } else if (typeof strings === 'string') {
        proxy[strings] = keys[0]
      } else if (isArr(strings)) {
        return flatten(keys
          .reduce(
            (prev, cur, i) => [prev, bind.text(cur), strings[i + 1]],
            strings[0]
          )
          .filter(s => !isStr(s) || s.length)
        )
      }
    }, {
      get: (fn, key) => key === 'bind' ? bind : key[0] === '$'
        ? bind.bind(null, key.substr(1)) : Reflect.get(data, key),

      set (fn, key, val) {
        if (val == null) {
          deleteProperty(key)
        } else {
          const old = data[key]
          if (val !== old) {
            data[key] = val
            binds.each(key, bind => bind.call(host, val, old, proxy, host))
          }
        }
        return true
      },
      deleteProperty: (fn, key) => deleteProperty(key)
    })

    return proxy
  }

  const $ = node => {
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

    const textContent = isInput(node) ? 'value' : 'textContent'
    const innerHTML = isInput(node) ? 'value' : node.nodeType === 3 ? textContent : 'innerHTML'

    const once$$1 = infinify(EventManager(true, node), false)
    const on$$1 = infinify(EventManager(false, node), false)

    const proxy = new Proxy(
      Object.assign(fn => {
        if (fn instanceof Function && !isProxyNode(fn)) {
          fn.call(node, proxy, node)
        }
        return node
      }, {
        class: Class,
        attr: Attr,
        on: on$$1,
        once: once$$1,
        emit: emit.bind(undefined, node),
        render: render.bind(undefined, node)
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

  /* global Node */

  const listen = (once, target, type, fn, options = false) => {
    if (
      isStr(target) &&
      (isArr(target) ? target : target = queryAll(target)).length === 1
    ) target = target[0]

    if (isArr(target) ? !target.length : !target.addEventListener) {
      throw new Error('nil/empty event target(s)')
    }

    let typeobj = isObj(type)
    if (type == null || !(typeobj || isStr(type))) {
      throw new TypeError('cannot listen to nil or invalid event type')
    }

    if (isArr(target)) {
      for (let i = 0; i < target.length; i++) {
        target[i] = listen(
          once, target[i], typeobj ? Object.assign({}, type) : type, fn, options
        )
      }
      target.off = () => {
        for (const h of target) h()
        return target
      }
      target.on = mode => {
        for (const h of target) h.on(mode)
        return target
      }
      return target
    }

    if (typeobj) {
      for (const name in type) {
        type[name] = listen(once, target, name, type[name], options)
      }
      return type
    }

    if (target instanceof Node && !options.proxy) target = $(target)

    function wrapper () {
      fn.call(this, ...arguments, target)
      if (off.once) off()
    }

    const on = mode => {
      if (mode != null && mode !== off.once) off.once = !!mode
      target.addEventListener(type, wrapper, options)
      off.ison = true
      return off
    }

    const off = Object.assign(() => {
      target.removeEventListener(type, wrapper)
      off.ison = false
      return off
    }, {target, on, once})
    off.off = off

    return on()
  }

  const infinifyListen = {
    get: (ln, type) => (tgt, fn, opts) => ln(tgt, type, fn, opts)
  }

  const on = new Proxy(listen.bind(null, false), infinifyListen)
  const once = new Proxy(listen.bind(null, true), infinifyListen)
  const EventManager = curry(listen, 3)

  /* global Node Text */

  const html = (input, host) => {
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

  const frag = inner => inner != null
    ? html(inner) : document.createDocumentFragment()

  const assimilate = {
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
          Object.defineProperty(
            el, prop, Object.getOwnPropertyDescriptor(props, prop)
          )
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

  const infinifyDOM = (gen, tag) => tag in gen ? Reflect.get(gen, tag) : (gen[tag] = new Proxy(gen.bind(null, tag), {
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

  const body = (...args) => attach(document.body || 'body', 'appendChild', ...args)

  const text = (options, txt = '') => {
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
  const svg = new Proxy(svgEL.bind(undefined, 'svg'), {
    get: (_, tag) => infinifyDOM(svgEL, tag)
  })

  const dom = new Proxy(Object.assign((tag, opts, ...children) => {
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
          proxied.state = opts.state
        }
        if (opts.binds) {
          for (const key in opts.binds) {
            proxied.state.bind(key, opts.binds[key])
          }
        }
        delete opts.state
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
        opts = result !== el && (!proxied || result !== proxied) ? result : undefined
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

  /* global Text Node NodeList CustomEvent */

  const emit = (node, type, detail) => {
    node.dispatchEvent(typeof type !== 'string' ? type : new CustomEvent(type, {detail}))
    return node
  }

  // vpend - virtual append, add nodes and append them as a document fragment
  const vpend = (
    children,
    host,
    connector = 'appendChild',
    dfrag = frag(),
    noHostAppend
  ) => {
    for (let i = 0; i < children.length; i++) {
      let child = children[i]
      if (child instanceof Function) {
        if ((child = child(host)) === host) {
          continue
        } else if (child instanceof Function) {
          let lvl = 0
          let ishost = false
          while (child instanceof Function && lvl < 25) {
            child = child()
            if ((ishost = child === host)) break
            lvl++
          }
          if (ishost) continue
        }
      }
      const childtype = typeof child
      if (childtype === 'string' || childtype === 'number') {
        if (!child.length) continue
        child = new Text(child)
      } else if (isArr(child)) {
        child = vpend(child, host, connector, dfrag, true)
      }
      if (child instanceof Node) {
        dfrag.appendChild(child)
        children[i] = child
      }
    }
    if (host && !noHostAppend) {
      run(() => {
        host[connector](dfrag)
      })
    }
    return children
  }

  /*
  * prime takes an array of renderable entities
  * and turns them into just nodes and functions
  * (to be degloved later rather than sooner [by vpend])
  */
  const prime = (...nodes) => {
    for (let i = 0; i < nodes.length; i++) {
      let n = nodes[i]
      const ntype = typeof n
      if (n == null || ntype === 'boolean') {
        nodes.splice(i, 1)
        continue
      }
      if (n instanceof Node || n instanceof Function) {
        continue
      } else if (ntype === 'string' || ntype === 'number') {
        const nextI = i + 1
        if (nextI < nodes.length) {
          const next = nodes[nextI]
          const nexttype = typeof next
          if (nexttype === 'string' || nexttype === 'number') {
            nodes[i] = String(n) + String(next)
            nodes.splice(nextI, 1)
            i--
          }
        } else {
          nodes[i] = new Text(String(n))
        }
        continue
      }

      const isnl = n instanceof NodeList
      if (isnl) {
        if (n.length < 2) {
          nodes[i] = n[0]
          continue
        }
        n = Array.from(n)
      } else if (n.constructor === Object) {
        n = Object.values(n)
      }

      if (isArr(n)) {
        if (!isnl) {
          n = prime.apply(null, n)
          if (n.length < 2) {
            nodes[i] = n[0]
            i--
            continue
          }
        }
        nodes.splice(i, 1, ...n)
        i--
      } else if (n != null) {
        throw new Error(`illegal renderable: ${n}`)
      }
    }
    return nodes
  }

  /*
  * attach renderables to a host node via a connector
  * like append, prepend, before, after
  * independant of load state
  */
  const attach = (host, connector, ...renderables) => {
    if (host instanceof Function && !isProxyNode(host)) host = host()
    const nodeHost = host instanceof Node || isProxyNode(host)
    renderables = prime(renderables)
    if (nodeHost) {
      if ((connector === 'after' || connector === 'before') && !isMounted(host)) {
        once.mount(host, e => attach(host, connector, ...renderables))
      } else {
        vpend(renderables, host, connector)
      }
    } else if (typeof host === 'string') {
      return queryAsync(host).then(h => attach(h, connector, ...renderables))
    } if (isArr(host)) {
      host.push(...renderables)
    }
    return renderables.length === 1 ? renderables[0] : renderables
  }

  /*
  * render attaches a node to another
  *
  */
  const render = (
    node, host = document.body || 'body', connector = 'appendChild'
  ) => attach(host, connector, node)

  const domfn = {
    css (node, styles, prop) {
      if (styles.constructor === Object) {
        for (const key in styles) domfn.css(node, key, styles[key])
      } else if (typeof styles === 'string') {
        if (styles[0] === '-') {
          node.style.setProperty(styles, prop)
        } else {
          node.style[styles] = prop
        }
      }
      return node
    },
    class (node, c, state) {
      if (!node || c == null || !node.classList) return node

      if (isArr(node)) {
        for (let i = 0; i < node.length; i++) {
          domfn.class(node[i], c, state)
        }
        return node
      }

      if (c.constructor === Object) {
        for (const name in c) domfn.class(node, name, c[name])
      } else {
        if (typeof c === 'string') c = c.split(' ')
        if (isArr(c)) {
          const noState = typeof state !== 'boolean'
          for (let i = 0; i < c.length; i++) {
            node.classList[noState ? 'toggle' : state ? 'add' : 'remove'](c[i])
          }
        }
      }
      return node
    },
    hasClass: curry((node, name) => node.classList.contains(name)),
    attr (node, attr, val) {
      if (attr.constructor === Object) {
        for (const a in attr) {
          const present = attr[a] == null
          node[present ? 'removeAttribute' : 'setAttribute'](a, attr[a])
          attributeChange(node, a, undefined, attr[a], !present)
        }
      } else if (typeof attr === 'string') {
        const old = node.getAttribute(attr)
        if (val == null) return old
        node.setAttribute(attr, val)
        attributeChange(node, attr, old, val)
      }
      return node
    },
    removeAttribute (node, ...attrs) {
      if (attrs.length === 1) {
        node.removeAttribute(attrs[0])
        attributeChange(node, attrs[0], undefined, undefined, false)
      } else {
        for (let i = 0; i < attrs.length; i++) {
          if (isArr(attrs[i])) {
            attrs.splice(i, 1, ...attrs[i])
            i--
          }
          node.removeAttribute(attrs[i])
          attributeChange(node, attrs[i], undefined, undefined, false)
        }
      }
      return node
    },
    attrToggle (
      node,
      name,
      state = !node.hasAttribute(name),
      val = node.getAttribute(name) || ''
    ) {
      node[state ? 'setAttribute' : 'removeAttribute'](name, val)
      attributeChange(node, name, state ? val : null, state ? null : val, state)
      return node
    },
    emit,
    append (node, ...children) {
      attach(node, 'appendChild', ...children)
      return node
    },
    prepend (node, ...children) {
      attach(node, 'prepend', ...children)
      return node
    },
    appendTo (node, host) {
      attach(host, 'appendChild', node)
      return node
    },
    prependTo (node, host) {
      attach(host, 'prepend', node)
      return node
    },
    clear (node) {
      node[isInput(node) ? 'value' : 'textContent'] = ''
      return node
    },
    refurbish (node) {
      for (let i = 0; i < node.attributes.length; i++) {
        node.removeAttribute(node.attributes[i].name)
      }
      node.removeAttribute('class')
      return domfn.clear(node)
    },
    remove (node, after) {
      if (node instanceof Function) node = node()
      if (isArr(node)) {
        for (let i = 0; i < node.length; i++) domfn.remove(node[i], after)
      } else if (isNum(after)) {
        setTimeout(() => domfn.remove(node), after)
      } else if (isMounted(node)) {
        run(() => node.remove())
      } else if (isNodeList(node)) {
        for (let i = 0; i < node.length; i++) domfn.remove(node[i])
      }
      return node
    },
    replace (node, newnode) {
      if (newnode instanceof Function) newnode = newnode()
      run(() => node.replaceWith(newnode))
      return newnode
    },
    find (node, query$$1, pure) {
      query$$1 = queryAll(query$$1, node)
      return pure ? query$$1 : query$$1.map(n => $(n))
    },
    findOne: (node, q, pure) => pure ? query(q, node) : $(q)
  }
  domfn.empty = domfn.clear

  /* const watched = Object.create(null)
  const watch = (name, opts) => {
    if (opts == null) throw new TypeError(`attr.watch: useless watcher opts == null`)
    watched[name] = opts = Object.assign(Object.create(null), opts)
  }
  watch.update = (name, el, value = el.getAttribute(name)) => {}
  */

  const Initiated = new Map()
  const beenInitiated = (name, el) =>
    Initiated.has(name) && Initiated.get(name)(el)

  const attributeObserver = (el, name, opts) => {
    el = $(el)
    let {init, update, remove} = opts
    if (!init && !update && opts instanceof Function) {
      [init, update] = [opts, opts]
    }
    const intialize = (present, value) => {
      if (present && !beenInitiated(name, el)) {
        if (init) init(el, value)
        if (!Initiated.has(name)) {
          Initiated.set(name, mutateSet(new WeakSet()))
        }
        Initiated.get(name)(el, true)
        return true
      }
      return beenInitiated(name, el)
    }
    let removedBefore = false
    let old = el.getAttribute(name)
    intialize(el.hasAttribute(name), old)
    const stop = el.on.attr(({
      detail: {name: attrName, value, oldvalue, present}
    }) => {
      if (
        attrName === name &&
        old !== value &&
        value !== oldvalue &&
        intialize(present, value)
      ) {
        if (present) {
          if (update) update(el, value, old)
          removedBefore = false
        } else if (!removedBefore) {
          if (remove) remove(el, value, old)
          removedBefore = true
        }
        old = value
      }
    })

    const manager = () => {
      stop()
      if (Initiated.has(name)) Initiated.get(name)(el, false)
    }
    manager.stop = manager
    manager.start = () => {
      stop.on()
      Initiated.get(name)(el, true)
    }
    return manager
  }

  const directives = new Map()
  const directive = (name, opts) => {
    const directive = new Map()
    directive.init = el => {
      if (!beenInitiated(name, el)) {
        directive.set(el, attributeObserver(el, name, opts))
      }
    }
    directive.stop = el => {
      if (directive.has(el)) directive.get(el)()
    }
    directives.set(name, directive)
    run(() => queryEach('[' + name + ']', n => attributeChange(n, name)))
    return directive
  }

  const attributeChange = (
    el,
    name,
    oldvalue,
    value = el.getAttribute(name),
    present = el.hasAttribute(name)
  ) => {
    if (directives.has(name)) directives.get(name).init($(el))
    if (value !== oldvalue) {
      emit(el, 'attr', {name, value, oldvalue, present})
    }
  }

  /* global CustomEvent MutationObserver */

  const Created = mutateSet(new WeakSet())
  const Mounted = mutateSet(new WeakSet())
  const Unmounted = mutateSet(new WeakSet())

  const CR = (n, undone = !Created(n), component$$1 = isComponent(n)) => {
    if (undone && !component$$1) {
      Created(n, true)
      n.dispatchEvent(new CustomEvent('create'))
    }
  }

  const MNT = (n, iscomponent = isComponent(n)) => {
    CR(n, !Created(n), iscomponent)
    if (!Mounted(n) && n.parentNode) {
      if (Unmounted(n)) {
        Unmounted(n, false)
        n.dispatchEvent(new CustomEvent('remount'))
      } else if (iscomponent) {
        n.dispatchEvent(new CustomEvent('mount'))
      } else {
        Mounted(n, true)
        n.dispatchEvent(new CustomEvent('mount'))
      }
    }
  }

  const UNMNT = n => {
    Mounted(n, false)
    Unmounted(n, true)
    n.dispatchEvent(new CustomEvent('unmount'))
  }

  const MountNodes = n => updateComponent(n, 'mount') || MNT(n)
  const UnmountNodes = n => updateComponent(n, 'unmount') || UNMNT(n)

  new MutationObserver(muts => {
    for (const mut of muts) {
      const {addedNodes, removedNodes, attributeName} = mut
      if (addedNodes.length) {
        for (const node of addedNodes) MountNodes(node)
      }
      if (removedNodes.length) {
        for (const node of removedNodes) UnmountNodes(node)
      }
      if (attributeName != null) {
        attributeChange(mut.target, attributeName, mut.oldValue)
      }
    }
  })
    .observe(document,
      {attributes: true, attributeOldValue: true, childList: true, subtree: true}
    )

  const components = new Map()
  const component = (tagName, config) => {
    if (isFunc(config)) config = config()
    if (tagName.indexOf('-') === -1) {
      throw new Error(`component: ${tagName} tagName is un-hyphenated`)
    }
    components.set(tagName.toUpperCase(), config)
    run(() => queryEach(tagName, el => updateComponent(el)))
    return dom[tagName]
  }
  component.plugin = plugin => {
    if (isObj(plugin)) {
      if (!component.plugins) component.plugins = {}
      for (const key in plugin) {
        if (!(key in component.plugins)) component.plugins[key] = new Set()
        component.plugins.add(plugin[key])
      }
    }
  }

  const updateComponent = (el, config, stage, afterProps) => {
    if (el.nodeType !== 1 || !components.has(el.tagName)) return
    if (isStr(config)) [stage, config] = [config, components.get(el.tagName)]
    else if (!isObj(config)) config = components.get(el.tagName)

    const {
      create,
      mount,
      remount,
      unmount,
      props,
      methods,
      attr,
      state
    } = config
    const proxied = $(el)

    if (!Created(el)) {
      proxied.state = Object.assign({}, state, proxied.state)
      el[ComponentSymbol] = el.tagName

      if (methods) assimilate.methods(el, methods)
      if (props) assimilate.props(el, props)
      if (afterProps) assimilate.props(el, afterProps)
      Created(el, true)
      if (create) create.call(el, proxied)

      if (component.plugins) {
        component.plugins.config.forEach(fn => {
          fn.bind(el, config, proxied, el)
        })
        component.plugins.create.forEach(fn => {
          fn.bind(el, proxied, el)
        })
      }

      emit(el, 'create')

      if (isObj(config.on)) proxied.on(config.on)
      if (isObj(config.once)) proxied.once(config.once)

      if (isObj(attr)) {
        proxied.state.observedAttrs = Object.create(null)
        for (const name in attr) {
          proxied.state.observedAttrs[name] = attributeObserver(el, name, attr[name])
        }
      }
      if (remount) proxied.on.remount(remount.bind(el, proxied))
    }

    if (!Mounted(el) && (stage === 'mount' || isMounted(el))) {
      if (Unmounted(el)) {
        component.plugins && component.plugins.remount.forEach(fn => {
          fn.bind(el, proxied, el)
        })
        for (const name in proxied.state.observedAttrs) {
          proxied.state.observedAttrs[name].start()
        }
        if (remount) remount.call(el, proxied)
        emit(el, 'remount')
      } else {
        Mounted(el, true)
        component.plugins && component.plugins.mount.forEach(fn => {
          fn.bind(el, proxied, el)
        })
        if (mount) mount.call(el, proxied)
        emit(el, 'mount')
      }
    } else if (stage === 'unmount') {
      Mounted(el, false)
      Unmounted(el, true)
      component.plugins && component.plugins.unmount.forEach(fn => {
        fn.bind(el, proxied, el)
      })
      for (const name in proxied.state.observedAttrs) {
        proxied.state.observedAttrs[name].stop()
      }
      if (unmount) unmount.call(el, proxied)
      emit(el, stage)
    }
    return el
  }

  exports.isArr = isArr
  exports.isComponent = isComponent
  exports.isNil = isNil
  exports.isDef = isDef
  exports.isObj = isObj
  exports.isFunc = isFunc
  exports.isBool = isBool
  exports.isStr = isStr
  exports.isNum = isNum
  exports.isArrlike = isArrlike
  exports.isNodeList = isNodeList
  exports.isNode = isNode
  exports.isMounted = isMounted
  exports.isPrimitive = isPrimitive
  exports.isPromise = isPromise
  exports.isProxyNode = isProxyNode
  exports.isRenderable = isRenderable
  exports.isRegExp = isRegExp
  exports.isInt = isInt
  exports.isInput = isInput
  exports.isEmpty = isEmpty
  exports.isEl = isEl
  exports.isSvg = isSvg
  exports.allare = allare
  exports.attributeObserver = attributeObserver
  exports.flatten = flatten
  exports.curry = curry
  exports.compose = compose
  exports.components = components
  exports.component = component
  exports.run = run
  exports.render = render
  exports.query = query
  exports.queryAsync = queryAsync
  exports.queryAll = queryAll
  exports.queryEach = queryEach
  exports.on = on
  exports.once = once
  exports.each = each
  exports.svg = svg
  exports.dom = dom
  exports.domfn = domfn
  exports.html = html
  exports.directive = directive
  exports.directives = directives
  exports.prime = prime
  exports.Mounted = Mounted
  exports.Unmounted = Unmounted
  exports.Created = Created
  exports.$ = $

  Object.defineProperty(exports, '__esModule', { value: true })
}))
