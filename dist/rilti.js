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

  const ProxyNodeSymbol = Symbol('Proxy Node')
  const ComponentSymbol = Symbol('Component')

  const isProxyNode = o => isFunc(o) && o[ProxyNodeSymbol] === true

  const isComponent = el => el !== undefined && el[ComponentSymbol] !== undefined

  const isArr = Array.isArray

  const isNil = o => o === undefined || o === null

  const isDef = o => o !== undefined && o !== null

  const isFunc = o => o instanceof Function

  const isBool = o => typeof o === 'boolean'

  const isObj = o => typeof o === 'object' && o.constructor === Object

  const isStr = o => typeof o === 'string'

  const isNum = o => typeof o === 'number' && !isNaN(o)

  const isInt = o => isNum(o) && o % 1 === 0

  const isArrlike = o => isArr(o) || o instanceof window.NodeList || (isDef(o) && !(isFunc(o) || isNode(o)) && o.length % 1 === 0)

  const isNodeList = (o, arr = true) => o instanceof window.NodeList || (arr && allare(o, isNode))

  const isNode = o => o instanceof window.Node

  const isPrimitive = o => {
    o = typeof o
    return o === 'string' || o === 'number' || o === 'boolean'
  }

  const isEl = o => o instanceof window.Element

  const isPromise = o => typeof o === 'object' && isFunc(o.then)

  const isRegExp = o => o instanceof RegExp

  const isEmpty = o => isNil(o) || !((isObj(o) ? Object.keys(o) : o).length || o.size)

  const isMounted = (descendant, parent = document) => (
    isNodeList(descendant) ? Array.from(descendant).every(n => isMounted(n)) : parent === descendant || !!(parent.compareDocumentPosition(descendant) & 16)
  )

  const isSvg = o => {
    if (isProxyNode(o)) o = o()
    return o instanceof window.SVGElement
  }

  const isInput = o => {
    if (isProxyNode(o)) o = o()
    return o instanceof window.HTMLInputElement || o instanceof window.HTMLTextAreaElement
  }

  const isRenderable = o => o instanceof window.Node || isProxyNode(o) || isPrimitive(o) || allare(o, isRenderable)

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

  const curry = (fn, arity = fn.length, ...args) =>
    arity <= args.length ? fn(...args) : curry.bind(undefined, fn, arity, ...args)

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

  const runAsync = (fn, ...args) => {
    if (window.requestIdleCallback) {
      window.requestIdleCallback(fn.bind(undefined, ...args))
    } else {
      setTimeout(fn, 0, ...args)
    }
  }

  /*
  * run runs a function on DOMContentLoaded or asynchronously
  * if document.body is present and loaded
  */

  const run = (...args) => {
    if (document.body || document.readyState === 'complete') {
      runAsync.apply(undefined, args)
    } else {
      window.addEventListener(
        'DOMContentLoaded',
        e => runAsync.apply(undefined, args)
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
      if (isNil(result)) {
        reject(new Error(`queryAsync: couldn't find ${selector}`))
      } else {
        resolve(result)
      }
    }
    document.body ? find() : run(find)
  })

  const queryAll = (selector, host = document) => (
    Array.from(query(host).querySelectorAll(selector))
  )

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
        while (i !== len) {
          fn(iterable[i], i++, iterable)
        }
      } else if (iterable.forEach) {
        iterable.forEach(fn)
      } else if (isInt(iterable)) {
        let i = 0
        while (i < iterable) {
          fn(i++, iterable)
        }
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

  const infinify = (fn, reflect = false) => new Proxy(fn, {
    get: (fn, key) =>
      reflect && key in fn ? Reflect.get(fn, key) : fn.bind(undefined, key)
  })

  /*
  * mutateSet is an abstraction over Set and WeakSet
  * it combines all basic Set ops into a single function
  */

  const mutateSet = set => (n, state) =>
    set[state === undefined ? 'has' : state ? 'add' : 'delete'](n)

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

  const $ = node => {
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

    const once$$1 = infinify(EventManager(true, node), false)
    const on$$1 = infinify(EventManager(false, node), false)

    const proxy = new Proxy(
      Object.assign(fn => {
        if (isFunc(fn) && !isProxyNode(fn)) fn.call(node, proxy, node)
        return node
      }, {
        class: Class,
        attr: Attr,
        on: on$$1,
        once: once$$1,
        emit: emit.bind(undefined, node),
        render: render.bind(undefined, node),
        state: state()
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
          else if (key === 'state') fn[key](val)
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

  const EventManager = curry((once, target, type, handle, options = false) => {
    if (isStr(target)) target = query(target)
    if (isObj(type)) {
      for (const name in type) {
        type[name] = EventManager(once, target, name, type[name], options)
      }
      return type
    }
    if (!isFunc(handle)) return EventManager.bind(undefined, once, target, type)

    handle = handle.bind(target)
    const proxiedTarget = isEl(target) ? $(target) : target

    const handler = evt => {
      handle(evt, proxiedTarget)
      once && remove()
    }

    const remove = () => {
      target.removeEventListener(type, handler)
      return manager
    }

    const add = mode => {
      once = !!mode
      target.addEventListener(type, handler, options)
      return manager
    }

    const manager = {
      handler,
      on: add,
      off: remove,
      once: add.bind(undefined, true),
      emit (type, detail) {
        target.dispatchEvent(new window.CustomEvent(type, {detail}))
        return manager
      }
    }

    return add(once)
  }, 3)

  // Event Manager Proxy Configuration
  const EMPC = {
    get: (fn, type) => (tgt, hndl, opts) => fn(tgt, type, hndl, opts)
  }
  const once = new Proxy(EventManager(true), EMPC)
  const on = new Proxy(EventManager(false), EMPC)

  const html = (input, host) => {
    if (input instanceof Function) {
      input = input(host)
    }
    if (typeof input === 'string') {
      return Array.from(document.createRange().createContextualFragment(input).childNodes)
    } else if (input instanceof window.Node) {
      return input
    } else if (isArr(input)) {
      return input.map(i => html(i))
    }
  }

  const frag = inner =>
    inner !== undefined ? html(inner) : document.createDocumentFragment()

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
            if (isFunc(set)) {
              accessors.set = set.bind(el, proxied)
            }
            if (isFunc(get)) {
              accessors.get = get.bind(el, proxied)
            }
            Object.defineProperty(el, key, accessors)
          }
        } else if (isFunc(val) && !isProxyNode(val)) {
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

  const infinifyDOM = (domgen, tag) => tag in domgen ? Reflect.get(domgen, tag) : new Proxy(
    domgen.bind(undefined, tag),
    {
      get (el, className) {
        const classes = [className.replace(/_/g, '-')]
        return new Proxy((...args) => {
          el = el(...args)
          domfn.class(el(), classes)
          return el
        }, {
          get (_, anotherClass, proxy) {
            classes.push(anotherClass.replace(/_/g, '-'))
            return proxy
          }
        })
      }
    }
  )

  const body = (...args) => {
    attach(document.body || 'body', 'appendChild', ...args)
    return args.length > 1 ? args : args[0]
  }

  const text = (options, txt = '') => {
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
  const svg = new Proxy(svgEL.bind(undefined, 'svg'), {
    get: (_, tag) => infinifyDOM(svgEL, tag)
  })

  const dom = new Proxy(Object.assign((tag, opts, ...children) => {
    const el = typeof tag === 'string' ? document.createElement(tag) : tag

    const iscomponent = components.has(el.tagName)
    if (iscomponent) var componentHandled

    const proxied = $(el)

    if (isObj(opts)) {
      var pure = opts.pure
      if (!iscomponent && opts.props) assimilate.props(el, opts.props)
      opts.methods && assimilate.methods(el, opts.methods)
      if (isObj(opts.state)) proxied.state = opts.state
      for (const key in opts) {
        let val = opts[key]
        const isOnce = key.indexOf('once') === 0
        const isOn = !isOnce && key.indexOf('on') === 0
        if (isOnce || isOn) {
          const i = isOnce ? 4 : 2
          const mode = key.substr(0, i)
          let type = key.substr(i)
          const evtfn = EventManager(isOnce)
          const args = isArr(val) ? val : [val]
          if (!opts[mode]) opts[mode] = {}
          if (type.length) {
            opts[mode][type] = evtfn(el, type, ...args)
          } else {
            opts[mode][type] = evtfn(el, ...args)
          }
        } else if (key in el) {
          if (isFunc(el[key])) {
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

    if (el.nodeType !== 3) {
      if (isProxyNode(opts) && opts !== proxied) {
        children.unshift(opts(proxied))
      } else if (opts instanceof Function) {
        const result = opts.call(el, proxied)
        opts = result !== el && result !== proxied ? result : undefined
      }
      if (isRenderable(opts)) children.unshift(opts)
      if (children.length) attach(proxied, 'appendChild', ...children)
    }

    iscomponent ? !componentHandled && updateComponent(el, undefined) : CR(el, true, iscomponent)
    return pure ? el : proxied
  },
  {text, body, svg, frag, html}
  ),
  {get: infinifyDOM}
  )

  const Initiated = new Map()
  const beenInitiated = (attrName, el) => (
    Initiated.has(attrName) && Initiated.get(attrName)(el)
  )

  const attributeObserver = (el, attrName, opts) => {
    el = $(el)
    const {init, update, remove} = opts
    const intialize = (present, value) => {
      if (present && !beenInitiated(attrName, el)) {
        if (init) {
          init(el, value)
        }
        if (!Initiated.has(attrName)) {
          Initiated.set(attrName, mutateSet(new WeakSet()))
        }
        Initiated.get(attrName)(el, true)
        return true
      }
      return beenInitiated(attrName, el)
    }
    let removedBefore = false
    let old = el.getAttribute(attrName)
    intialize(el.hasAttribute(attrName), old)
    const stop = el.on.attr(({detail: {name, value, oldvalue, present}}) => {
      if (
        attrName === name &&
        old !== value &&
        value !== oldvalue &&
        intialize(present, value)
      ) {
        if (present) {
          if (update) {
            update(el, value, old)
          }
          removedBefore = false
        } else if (!removedBefore) {
          if (remove) {
            remove(el, value, old)
          }
          removedBefore = true
        }
        old = value
      }
    }).off
    return () => {
      stop()
      if (Initiated.has(attrName)) {
        Initiated.get(attrName)(el, false)
      }
    }
  }

  const directives = new Map()
  const directive = (name, {init, update, remove, accessors, toggle}) => {
    const directive = new Map()
    directive.init = el => {
      if (!beenInitiated(name, el)) {
        directive.set(
          el,
          attributeObserver(el, name, {init, update, remove})
        )
      }
    }
    directive.stop = el => {
      if (directive.has(el)) {
        directive.get(el)()
      }
    }
    directives.set(name, directive)
    run(() => {
      queryEach('[' + name + ']', n => {
        attributeChange(n, name)
      })
    })
  }

  const attributeChange = (el, name, oldvalue, value = el.getAttribute(name), present = el.hasAttribute(name)) => {
    if (directives.has(name)) {
      directives.get(name).init($(el))
    }
    emit(el, 'attr', {name, value, oldvalue, present})
  }

  const emit = (node, type, detail) => {
    node.dispatchEvent(new window.CustomEvent(type, {detail}))
    return node
  }

  // vpend - virtual append, add nodes and get them as a document fragment
  const vpend = (children, host, connector = 'appendChild', dfrag = frag(), noHostAppend) => {
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
      if (typeof child === 'string') {
        if (!child.length) continue
        child = new window.Text(child)
      } else if (isArr(child)) {
        child = vpend(child, host, connector, dfrag, true)
      }
      if (child instanceof window.Node) {
        dfrag.appendChild(child)
        children[i] = child
      }
    }
    if (host && !noHostAppend) {
      run(() => {
        host[connector](dfrag)
        for (let i = 0; i < children.length; i++) {
          children[i] && children[i].dispatchEvent && MNT(children[i])
        }
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
      if (n instanceof window.Node || n instanceof Function) {
        continue
      } else if (isPrimitive(n)) {
        nodes[i] = new window.Text(n)
        continue
        // n = document.createRange().createContextualFragment(n).childNodes
      }

      const isnl = n instanceof window.NodeList
      if (isnl) {
        if (n.length < 2) {
          nodes[i] = n[0]
          continue
        }
        n = Array.from(n)
      } else if (isObj(n)) {
        n = Object.values(n)
      }

      if (isArr(n)) {
        if (!isnl) {
          n = prime.apply(undefined, n)
          if (n.length < 2) {
            nodes[i] = n[0]
            continue
          }
        }
        const nlen = n.length
        n.unshift(i, 1)
        nodes.splice.apply(nodes, n)
        n.slice(2, 0)
        i += nlen
      } else if (isDef(n)) {
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
    const nodeHost = host instanceof window.Node || isProxyNode(host)
    renderables = prime(renderables)
    if (nodeHost) {
      if ((connector === 'after' || connector === 'before') && !isMounted(host)) {
        once.mount(host, e => attach(host, connector, ...renderables))
      } else {
        vpend(renderables, host, connector)
      }
    } else if (isStr(host)) {
      return queryAsync(host).then(h => attach(h, connector, ...renderables))
    } if (isArr(host)) {
      host.push(...renderables)
    }
    return renderables.length < 2 ? renderables[0] : renderables
  }

  /*
  * render attaches a node to another
  *
  */
  const render = (
    node,
    host = document.body || 'body',
    connector = 'appendChild'
  ) => attach(host, connector, node)

  const domfn = {
    css (node, styles, prop) {
      if (isObj(styles)) {
        for (const key in styles) domfn.css(node, key, styles[key])
      } else if (isStr(styles)) {
        if (styles.indexOf('--') === 0) {
          node.style.setProperty(styles, prop)
        } else {
          node.style[styles] = prop
        }
      }
      return node
    },
    class (node, c, state) {
      if (!node.classList) return node
      if (isArr(node)) {
        for (let i = 0; i < node.length; i++) {
          domfn.class(node[i], c, state)
        }
        return node
      }
      if (isObj(c)) {
        for (const className in c) {
          domfn.class(
            node,
            className,
            isBool(c[className]) ? c[className] : undefined
          )
        }
      } else {
        if (isStr(c)) c = c.split(' ')
        if (isArr(c)) {
          const booleanState = isBool(state)
          for (var i = 0; i < c.length; i++) {
            node.classList[booleanState ? state ? 'add' : 'remove' : 'toggle'](c[i])
          }
        }
      }
      return node
    },
    hasClass: curry((node, name) => node.classList.contains(name)),
    attr (node, attr, val) {
      if (isObj(attr)) {
        for (const a in attr) {
          const present = isNil(attr[a])
          node[present ? 'removeAttribute' : 'setAttribute'](a, attr[a])
          attributeChange(node, a, undefined, attr[a], !present)
        }
      } else if (isStr(attr)) {
        const old = node.getAttribute(attr)
        if (isNil(val)) return old
        node.setAttribute(attr, val)
        attributeChange(node, attr, old, val)
      }
      return node
    },
    removeAttribute (node, ...attrs) {
      attrs = flatten(attrs)
      for (var i = 0; i < attrs.length; i++) {
        node.removeAttribute(attrs[i])
        attributeChange(node, attrs[i], undefined, undefined, false)
      }
      return node
    },
    attrToggle (node, name, state = !node.hasAttribute(name), val = node.getAttribute(name) || '') {
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
      Array.from(node.attributes).forEach(({name}) => {
        node.removeAttribute(name)
      })
      node.removeAttribute('class')
      return domfn.clear(node)
    },
    remove (node, after) {
      if (isFunc(node)) node = node()
      if (isArr(node)) return node.forEach(n => domfn.remove(n, after))
      if (isNum(after)) setTimeout(() => domfn.remove(node), after)
      else if (isMounted(node)) {
        run(() => node.remove())
      } else if (isNodeList(node)) {
        Array.from(node).forEach(n => domfn.remove(n))
      }
      return node
    },
    replace (node, newnode) {
      if (isFunc(newnode)) newnode = newnode()
      run(() => node.replaceWith(newnode))
      return newnode
    }
  }
  domfn.empty = domfn.clear

  const Created = mutateSet(new WeakSet())
  const Mounted = mutateSet(new WeakSet())
  const Unmounted = mutateSet(new WeakSet())

  const CR = (n, undone = !Created(n), component$$1 = isComponent(n)) => {
    if (undone && !component$$1) {
      Created(n, true)
      emit(n, 'create')
    }
  }

  const MNT = n => {
    const iscomponent = isComponent(n)
    CR(n, !Created(n), iscomponent)
    if (!Mounted(n)) {
      if (Unmounted(n)) {
        Unmounted(n, false)
        emit(n, 'remount')
      } else if (iscomponent) {
        updateComponent(n, 'mount')
      } else {
        Mounted(n, true)
        emit(n, 'mount')
      }
    }
  }

  const UNMNT = n => {
    Mounted(n, false)
    Unmounted(n, true)
    emit(n, 'unmount')
  }

  const MountNodes = n => updateComponent(n, 'mount') || MNT(n)
  const UnmountNodes = n => updateComponent(n, 'unmount') || UNMNT(n)

  new window.MutationObserver(muts => {
    for (let i = 0; i < muts.length; i++) {
      const {addedNodes, removedNodes, attributeName} = muts[i]
      if (addedNodes.length) {
        for (let x = 0; x < addedNodes.length; x++) {
          MountNodes(addedNodes[x])
        }
      }
      if (removedNodes.length) {
        for (let x = 0; x < removedNodes.length; x++) {
          UnmountNodes(removedNodes[x])
        }
      }
      typeof attributeName === 'string' && attributeChange(muts[i].target, attributeName, muts[i].oldValue)
    }
  }).observe(
    document,
    {attributes: true, attributeOldValue: true, childList: true, subtree: true}
  )

  const components = new Map()
  const component = (tagName, config) => {
    if (tagName.indexOf('-') === -1) {
      throw new Error(`component: ${tagName} tagName is un-hyphenated`)
    }
    components.set(tagName.toUpperCase(), config)
    run(() => queryEach(tagName, updateComponent))
    return dom[tagName]
  }

  const updateComponent = (el, config, stage, afterProps) => {
    if (el.nodeType !== 1 || !components.has(el.tagName)) return
    if (isStr(config)) [stage, config] = [config, components.get(el.tagName)]
    else if (!isObj(config)) config = components.get(el.tagName)

    const {create, mount, remount, unmount, props, methods, attr} = config
    const proxied = $(el)

    if (!Created(el)) {
      el[ComponentSymbol] = el.tagName
      methods && assimilate.methods(el, methods)
      props && assimilate.props(el, props)
      afterProps && assimilate.props(el, afterProps)
      Created(el, true)
      create && create.call(el, proxied)
      emit(el, 'create')
      if (isObj(attr)) {
        for (const name in attr) attributeObserver(el, name, attr[name])
      }
      remount && on.remount(el, remount.bind(el, proxied))
    }
    if (!Mounted(el) && stage === 'mount') {
      if (Unmounted(el)) {
        remount && remount.call(el, proxied)
        emit(el, 'remount')
      } else {
        Mounted(el, true)
        mount && mount.call(el, proxied)
        emit(el, stage)
      }
    } else if (stage === 'unmount') {
      Mounted(el, false)
      Unmounted(el, true)
      unmount && unmount.call(el, proxied)
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
  exports.runAsync = runAsync
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
