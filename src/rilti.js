{ /* global Node Text NodeList Element CustomEvent MutationObserver HTMLInputElement HTMLTextAreaElement */
  const UNDEF = void 0

  const isArr = Array.isArray
  const isNil = o => o === UNDEF || o === null
  const isDef = o => o !== UNDEF && o !== null
  const isFunc = o => o instanceof Function
  const isBool = o => typeof o === 'boolean'
  const isObj = o => typeof o === 'object' && o.constructor === Object
  const isStr = o => typeof o === 'string'
  const isNum = o => typeof o === 'number' && !isNaN(o)
  const isInt = o => isNum(o) && o % 1 === 0
  const isArrlike = o => isArr(o) || o instanceof NodeList || (isDef(o) && !(isFunc(o) || isNode(o)) && o.length % 1 === 0)
  const isNodeList = (o, arr = true) => o instanceof NodeList || (arr && allare(o, isNode))
  const isNode = o => o instanceof Node
  const isPrimitive = o => {
    o = typeof o
    return o === 'string' || o === 'number' || o === 'boolean'
  }
  const isPromise = o => typeof o === 'object' && isFunc(o.then)
  const isRegExp = o => o instanceof RegExp
  const isEl = o => o instanceof Element
  const isInput = o => o instanceof HTMLInputElement || o instanceof HTMLTextAreaElement
  const isEmpty = o => isNil(o) || !((isObj(o) ? Object.keys(o) : o).length || o.size)
  const isRenderable = o => o instanceof Node || ProxyNodes(o) || isPrimitive(o) || allare(o, isRenderable)

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

  const curry = (fn, arity = fn.length, ...args) => (
    arity <= args.length ? fn(...args) : curry.bind(UNDEF, fn, arity, ...args)
  )

  const flatten = (arr, result = [], encaptulate = true) => {
    if (encaptulate && !isArr(arr)) return [arr]
    arr.forEach(val => isArr(val) ? flatten(val, result) : result.push(val))
    return result
  }

  const runAsync = (fn, ...args) => setTimeout(fn, 0, ...args)
  const run = fn => {
    if (document.body || document.readyState === 'complete') {
      setTimeout(fn, 0)
    } else {
      window.addEventListener('DOMContentLoaded', fn)
    }
  }

  const each = (iterable, fn) => {
    if (isDef(iterable)) {
      if (isObj(iterable)) {
        for (const key in iterable) fn(iterable[key], key, iterable)
      } else if (iterable.length) {
        const len = iterable.length
        let i = 0
        while (i !== len) fn(iterable[i], i++, iterable)
      } else if (iterable.forEach) {
        iterable.forEach(fn)
      } else if (isInt(iterable)) {
        let i = 0
        while (i !== iterable) fn(i++, iterable)
      }
    }
    return iterable
  }

  const query = (selector, host = document) => (
    isNode(selector) ? selector : query(host).querySelector(selector)
  )
  const queryAsync = (selector, fn, host) => {
    document.body ? fn(query(selector, host)) : run(() => fn(query(selector, host)))
  }
  const queryAll = (selector, host = document) => (
    Array.from(query(host).querySelectorAll(selector))
  )
  const queryEach = (selector, fn, host = document) => {
    if (!isFunc(fn)) [fn, host] = [host, document]
    return each(queryAll(selector, host), fn)
  }

  const EventManager = curry((once, target, type, handle, options = false) => {
    if (isStr(target)) target = query(target)
    if (isObj(type)) {
      return each(type, (fn, name) => {
        type[name] = EventManager(once, target, name, fn, options)
      })
    }
    if (!isFunc(handle)) return EventManager.bind(UNDEF, once, target, type)

    handle = handle.bind(target)
    const proxiedTarget = isNode(target) ? $(target) : target

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
      once: add.bind(UNDEF, true)
    }

    return add(once)
  }, 3)

  // Event Manager Proxy Configuration
  const EMPC = {
    get: (fn, type) => (tgt, hndl, opts) => fn(tgt, type, hndl, opts)
  }
  const once = new Proxy(EventManager(true), EMPC)
  const on = new Proxy(EventManager(false), EMPC)

  const emit = (node, type, detail) => {
    node.dispatchEvent(new CustomEvent(type, {detail}))
    return node
  }

  const infinify = (fn, reflect = false) => new Proxy(fn, {
    get: (fn, key) =>
      (reflect && key in fn && Reflect.get(fn, key)) || fn.bind(UNDEF, key)
  })

  const emitter = (host = {}, listeners = new Map()) => Object.assign(host, {
    listeners,
    emit: infinify((event, ...data) => {
      listeners.has(event) && listeners.get(event).forEach(h => h(...data))
    }),
    emitAsync: infinify((event, ...data) => runAsync(() => {
      listeners.has(event) && listeners.get(event).forEach(h => runAsync(h, ...data))
    })),
    on: infinify((event, handler) => {
      if (!listeners.has(event)) listeners.set(event, new Set())
      listeners.get(event).add(handler)
      return () => host.off(event, handler)
    }),
    once: infinify((event, handler) => host.on(event, function h () {
      handler(...arguments)
      host.off(event, h)
    })),
    off: infinify((event, handler) => {
      if (listeners.has(event)) {
        // ls = listener Set
        const ls = listeners.get(event)
        ls.delete(handler)
        if (!ls.size) listeners.delete(event)
      }
    })
  })

  const assimilateProps = (el, props) => {
    const proxied = $(el)
    for (const prop in props) {
      let val = props[prop]
      if (prop in el) el[prop] = val
      else if (prop === 'accessors') {
        for (const key in val) {
          const {set = val[key], get = val[key]} = val[key]
          const accessors = {}
          if (isFunc(set)) accessors.set = set.bind(el, proxied)
          if (isFunc(get)) accessors.get = get.bind(el, proxied)
          Object.defineProperty(el, key, accessors)
        }
      } else if (isFunc(val) && !ProxyNodes(val) && !Models(val)) {
        el[prop] = val.call(el, proxied)
      } else {
        Object.defineProperty(el, prop, Object.getOwnPropertyDescriptor(props, prop))
      }
    }
  }

  const assimilateMethods = (el, methods) => {
    const proxied = $(el)
    for (const name in methods) {
      Object.defineProperty(el, name, {
        value: methods[name].bind(el, proxied)
      })
    }
  }

  const isMounted = (descendant, parent = document) => (
    isNodeList(descendant) ? Array.from(descendant).every(n => isMounted(n)) : parent === descendant || !!(parent.compareDocumentPosition(descendant) & 16)
  )

  const mutateSet = set => (n, state) => (
    set[isBool(state) ? state ? 'add' : 'delete' : 'has'](n)
  )

  const Created = mutateSet(new WeakSet())
  const Mounted = mutateSet(new WeakSet())
  const Unmounted = mutateSet(new WeakSet())

  const CR = (n, undone = !Created(n), component = isComponent(n)) => {
    if (undone && !component) {
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

  /*
  const flattenChildren = children => {
    for (var i = 0; i < children.length;) {
      var child = children[i]
      if (Array.isArray(child)) {
        var childLength = child.length
        child.unshift(i, 1)
        children.splice.apply(children, child)
        child.slice(2, 0)
        i += childLength
      } else {
        i++
      }
    }
    return children
  }
  */

  const html = (input, host) => {
    if (input instanceof Function) input = input(host)
    if (typeof input === 'string') {
      return Array.from(document.createRange().createContextualFragment(input).childNodes)
    } else if (input instanceof Node) return input
    else if (isArr(input)) return input.map(i => html(i))
  }

  const frag = inner => inner !== UNDEF ? html(inner) : document.createDocumentFragment()

  // vpend - virtual append, add nodes and get them as a document fragment
  const vpend = (children, host, connector = 'appendChild', dfrag = frag(), noHostAppend) => {
    for (var i = 0; i < children.length;) {
      let child = children[i]
      if (child instanceof Function) {
        child = child(host)
        if (child instanceof Function) {
          let lvl = 0
          while (child instanceof Function && lvl !== 20) {
            child = child()
            lvl++
          }
        }
      }
      if (typeof child === 'string') child = new Text(child)
      else if (isArr(child)) child = vpend(child, host, connector, dfrag, true)
      if (child instanceof Node) {
        dfrag.appendChild(child)
        MNT(child)
        i++
      }
    }
    if (host && !noHostAppend) {
      host[connector](dfrag)
    } else {
      return dfrag
    }
  }

  const prime = (...nodes) => {
    for (let i = 0; i < nodes.length; i++) {
      let n = nodes[i]
      if (n instanceof Node || n instanceof Function) {
        continue
      } else if (isPrimitive(n)) {
        nodes[i] = new Text(n)
        continue
        // n = document.createRange().createContextualFragment(n).childNodes
      }

      const isnl = n instanceof NodeList
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
          n = prime.apply(UNDEF, n)
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
      } else {
        throw new Error(`illegal renderable: ${n}`)
      }
    }
    return nodes
  }

  const attach = (host, connector, ...renderables) => {
    if (host instanceof Function) host = host()
    const nodeHost = host instanceof Node
    renderables = prime(renderables)
    if (nodeHost) {
      if ((connector === 'after' || connector === 'before') && !isMounted(host)) {
        once.mount(host, e => attach(host, connector, ...renderables))
      } else {
        vpend(renderables, host, connector)
      }
    } else if (isStr(host)) {
      return queryAsync(host, h => attach(h, connector, ...renderables))
    } if (isArr(host)) {
      host.push(...renderables)
    }
    return renderables.length < 2 ? renderables[0] : renderables
  }

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
    class (node, c, state = !node.classList.contains(c)) {
      if (isArr(node)) return node.forEach(n => domfn.class(n, c, state))
      if (isObj(c)) {
        for (const className in c) {
          domfn.class(
            node,
            className,
            isBool(c[className]) ? c[className] : !node.classList.contains(className)
          )
        }
      } else {
        if (isStr(c)) c = c.split(' ')
        isArr(c) && c.forEach(cl => {
          node.classList[(isBool(state) ? state : !node.classList.contains(cl)) ? 'add' : 'remove'](cl)
        })
      }
      return node
    },
    hasClass: curry((node, name) => node.classList.contains(name)),
    attr (node, attr, val) {
      if (isObj(attr)) {
        for (const a in attr) {
          const present = isNil(attr[a])
          node[present ? 'removeAttribute' : 'setAttribute'](a, attr[a])
          attributeChange(node, a, UNDEF, attr[a], !present)
        }
      } else if (isStr(attr)) {
        if (isNil(val)) return node.getAttribute(attr)
        const old = node.getAttribute(attr)
        node.setAttribute(attr, val)
        attributeChange(node, attr, old, val)
      }
      return node
    },
    removeAttribute (node, ...attrs) {
      flatten(attrs).forEach(attr => {
        node.removeAttribute(attr)
        attributeChange(node, attr, UNDEF, UNDEF, false)
      })
      return node
    },
    attrToggle (node, name, state = !node.hasAttribute(name), val = node.getAttribute(name)) {
      node[state ? 'setAttribute' : 'removeAttribute'](name, val)
      attributeChange(node, name, state ? val : null, state ? null : val, state)
      return node
    },
    emit,
    append: (node, ...children) => attach(node, 'append', ...children),
    prepend: (node, ...children) => attach(node, 'prepend', ...children),
    appendTo: (node, host) => attach(host, 'append', node),
    prependTo: (node, host) => attach(host, 'prepend', node),
    clear (node) {
      node[isInput(node) ? 'value' : 'innerHTML'] = ''
      return node
    },
    remove (node, after) {
      if (isFunc(node)) node = node()
      if (isArr(node)) return node.forEach(n => domfn.remove(n, after))
      if (isNum(after)) setTimeout(() => domfn.remove(node), after)
      else if (isMounted(node)) node.remove()
      else if (isNodeList(node)) Array.from(node).forEach(n => domfn.remove(n))
      return node
    }
  }

  const ProxiedNodes = new Map()
  const ProxyNodes = mutateSet(new WeakSet())

  const $ = node => {
    if (ProxyNodes(node)) return node
    else if (typeof node === 'string') {
      node = query(node)
    }
    if (ProxiedNodes.has(node)) return ProxiedNodes.get(node)
    if (!isNode(node)) throw new TypeError(`$ needs a Node: ${node}`)

    const Class = new Proxy(domfn.class.bind(UNDEF, node), {
      get: (fn, key) => node.classList.contains(key),
      set: (fn, key, val) => fn(key, val),
      deleteProperty (_, key) {
        node.classList.remove(key)
        return true
      }
    })

    const Attr = new Proxy(domfn.attr.bind(UNDEF, node), {
      get (fn, key) {
        if (key === 'has') return attr => node.hasAttribute(attr)
        if (key === 'remove' || key === 'rm') return domfn.removeAttribute.bind(UNDEF, node)
        return node.getAttribute(key)
      },
      set (fn, key, val) {
        if (key === 'remove') {
          domfn.removeAttribute(node, val)
        } else {
          fn(key, val)
        }
        return true
      },
      deleteProperty: (_, key) => domfn.removeAttribute(node, key)
    })

    const textContent = isInput(node) ? 'value' : 'textContent'
    const innerHTML = isInput(node) ? 'value' : node.nodeType === 3 ? textContent : 'innerHTML'

    const once = infinify(EventManager(true, node), false)
    const on = infinify(EventManager(false, node), false)

    const proxy = new Proxy(fn => {
      if (isFunc(fn) && !ProxyNodes(fn)) fn.call(node, proxy, node)
      return node
    }, {
      get (_, key) {
        if (key === 'class') return Class
        else if (key === 'attr') return Attr
        else if (key === 'txt') return node[textContent]
        else if (key === 'html') return node[innerHTML]
        else if (key === 'on') return on
        else if (key === 'once') return once
        else if (key === 'emit') return emit.bind(node, node)
        else if (key === 'mounted') return isMounted(node)
        else if (key === 'render') return render.bind(node, node)
        else if (key === 'children') return Array.from(node.children)
        else if (key === '$children') return Array.from(node.children).map($)
        else if (key === 'parent' && node.parentNode) return $(node.parentNode)
        else if (key in domfn) return domfn[key].bind(node, node)
        return isFunc(node[key]) && !ProxyNodes(node[key]) && !Models(node[key]) ? node[key].bind(node) : node[key]
      },
      set (_, key, val) {
        if (key === 'class') Class(node, val)
        else if (key === 'attr') Attr(node, val)
        else if (key === 'css') domfn.css(node, val)
        else if (key === 'txt') node[textContent] = val
        else if (key === 'html' || key === 'children') {
          if (isStr(val) && node[innerHTML] !== val) {
            node[innerHTML] = val
          } else {
            node[textContent] = ''
            vpend(isArr(val) ? prime(val) : html(val), node)
          }
        } else {
          node[key] = val
        }
        return true
      }
    })
    ProxiedNodes.set(node, proxy)
    ProxyNodes(proxy, true)
    return proxy
  }

  const getTag = el => el !== UNDEF && (el.tagName || String(el).toUpperCase())
  const isComponent = el => components.has(getTag(el))

  const components = new Map()
  const component = (tagName, config) => {
    if (!tagName.includes('-')) throw new Error(`component: ${tagName} tagName is un-hyphenated`)
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
      methods && assimilateMethods(el, methods)
      props && assimilateProps(el, props)
      afterProps && assimilateProps(el, afterProps)
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

  const body = (...args) => {
    render(args = prime(args))
    return args.length > 1 ? args : args[0]
  }

  const text = (options, txt = '') => {
    if (isPrimitive(options)) [txt, options] = [options, UNDEF]
    return dom(new Text(txt), options)
  }

  const ns = 'http://www.w3.org/2000/svg'
  const svg = new Proxy((...args) => dom(
    document.createElementNS(ns, 'svg'),
    ...args
  ), {
    get: (_, tag) => (...args) => dom(
      document.createElementNS(ns, tag),
      ...args
    )
  })

  const fastdom = infinify(function (tag, opts) {
    const el = typeof tag === 'string' ? document.createElement(tag) : tag
    let children = Array.prototype.slice.call(arguments, 2)

    if (isObj(opts)) {
      for (const key in opts) {
        if (key in el) el[key] = opts[key]
        else if (key === '$' || key === 'render') {
          opts[key].nodeType ? opts[key].appendChild(el) : attach(opts[key], 'appendChild', el)
        } else if (domfn.hasOwnProperty(key)) domfn[key](el, opts[key])
        else if (key.indexOf('on') === 0) on(el, opts[key])
        else if (key.indexOf('once') === 0) once(el, opts[key])
        else el.setAttribute(key, opts[key])
      }
    } else if (typeof opts === 'string') el.appendChild(new Text(opts))
    else if (opts instanceof Node) {
      el.appendChild(opts)
    } else if (opts instanceof Function) {
      children.unshift(opts(el))
    } else if (isArr(opts) || opts instanceof NodeList) {
      children = Array.prototype.concat.call(opts, children)
    }

    if (children.length) {
      const dfrag = frag()
      for (let i = 0; i < children.length; i++) {
        let child = children[i]
        if (child instanceof Function) child = child(el)
        if (child instanceof Node) {
          dfrag.appendChild(child)
        } else if (isArr(child)) {
          vpend(child, el, 'appendChild', dfrag, true)
        } else if (child !== UNDEF) {
          dfrag.appendChild(new Text(child))
        }
      }
      el.appendChild(dfrag)
    }
    return el
  })

  const dom = infinify(Object.assign((tag, opts, ...children) => {
    const el = typeof tag === 'string' ? document.createElement(tag) : tag

    const iscomponent = components.has(el.tagName)
    if (iscomponent) var componentHandled

    const proxied = $(el)
    if (el.nodeType !== 3) {
      if (ProxyNodes(opts) && opts !== proxied) {
        children.unshift(opts(proxied))
      } else if (opts instanceof Function) {
        const result = opts.call(el, proxied)
        if (result !== el && result !== proxied) opts = result
      } else if (isRenderable(opts)) {
        children.unshift(opts)
      }
      if (children.length) attach(el, 'appendChild', ...children)
    }

    if (isObj(opts)) {
      var pure = opts.pure
      if (!iscomponent && opts.props) assimilateProps(el, opts.props)
      opts.methods && assimilateMethods(el, opts.methods)
      if (opts.sync) opts.sync = opts.sync(el)
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
        updateComponent(el, UNDEF, UNDEF, opts.props)
        componentHandled = true
      }
      const renderHost = opts.$ || opts.render
      if (renderHost) attach(renderHost, 'appendChild', el)
      else if (opts.renderAfter) attach(opts.renderAfter, 'after', el)
      else if (opts.renderBefore) attach(opts.renderBefore, 'before', el)
    }

    iscomponent ? !componentHandled && updateComponent(el, UNDEF) : CR(el, true, iscomponent)
    return pure ? el : proxied
  }, {
    text, body, svg, frag, prime, html
  }),
    true
  )

  const Initiated = new Map()
  const beenInitiated = (attrName, el) => Initiated.has(attrName) && Initiated.get(attrName)(el)
  const attributeObserver = (el, attrName, opts) => {
    el = $(el)
    const {init, update, remove} = opts
    const intialize = (present, value) => {
      if (present && !beenInitiated(attrName, el)) {
        init && init(el, value)
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
      if (attrName === name && old !== value && value !== oldvalue && intialize(present, value)) {
        if (present) {
          update && update(el, value, old)
          removedBefore = false
        } else if (!removedBefore) {
          remove && remove(el, value, old)
          removedBefore = true
        }
        old = value
      }
    }).off
    return () => {
      stop()
      Initiated.has(attrName) && Initiated.get(attrName)(el, false)
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
      if (directive.has(el)) directive.get(el)()
    }
    directives.set(name, directive)
    run(
      () => queryEach('[' + name + ']', n => attributeChange(n, name))
    )
  }

  const attributeChange = (el, name, oldvalue, value = el.getAttribute(name), present = el.hasAttribute(name)) => {
    if (directives.has(name)) directives.get(name).init($(el))
    emit(el, 'attr', {name, value, oldvalue, present})
  }

  const MountNodes = n => updateComponent(n, 'mount') || MNT(n)
  const UnmountNodes = n => updateComponent(n, 'unmount') || UNMNT(n)

  new MutationObserver(muts => {
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

  const map2json = (map, obj = {}) => {
    map.forEach((val, key) => {
      obj[key] = val
    })
    return JSON.stringify(obj)
  }

  const Models = mutateSet(new WeakSet())

  const model = (data, mitter = emitter(), store = new Map()) => {
    const {emit, emitAsync, on, once} = mitter

    const del = (key, silent) => {
      if (isArr(key)) {
        key.forEach(k => del(k, silent))
      } else {
        store.delete(key)
        if (!silent) {
          emit('delete', key)
          emit('delete:' + key)
        }
      }
      return mut
    }

    const has = key => store.has(key)

    const mut = (key, val, silent) => {
      if (isObj(key)) {
        for (const k in key) {
          isNil(key[k]) ? del(k, val) : mut(k, key[k], val)
        }
      } else if (isArr(key)) {
        key.forEach(([k, v]) => mut(k, v, val))
      } else {
        const oldval = store.get(key)
        if (isDef(val) && val !== oldval) {
          store.set(key, val)
          if (!silent) {
            emit('set', key, val)
            emit('set:' + key, val)
          }
          return val
        }
        if (!silent) {
          emit('get', key)
          emit('get:' + key)
        }
        return oldval
      }
    }

    const syncs = new Map()
    const sync = new Proxy(function (obj, key, prop = key) {
      if (isArr(obj)) {
        const args = Array.from(arguments).slice(1)
        if (args.every(isStr)) return sync.template(obj, ...args)
      } else if (ProxyNodes(obj)) obj = obj()
      const isinput = isInput(obj)
      if (isinput) [prop, key] = [key, 'value']
      if (!syncs.has(obj)) syncs.set(obj, new Map())

      let action = 'set'
      if (prop.includes(':')) {
        [action, prop] = prop.split(':')
        var valid = action === 'valid'
        var iscomputed = action === 'compute'
      }

      syncs
      .get(obj)
      .set(
        prop,
        on(
          action + ':' + prop,
          val => { obj[key] = val }
        )
      )

      if (!valid && isinput) {
        var stop = $(obj).on.input(e => {
          mut(prop, obj[key].trim())
          if (validators.has(prop)) validateProp(prop)
        })
      }

      if (valid) {
        obj[key] = validateProp(prop)
      } else if (iscomputed && computed.has(prop)) {
        obj[key] = compute(prop)
      } else if (has(prop)) {
        obj[key] = mut(prop)
      }
      once('delete:' + prop, () => {
        stop && stop()
        sync.stop(obj, prop)
      })
      return obj
    }, {
      get: (fn, prop) =>
      Reflect.has(fn, prop) ? Reflect.get(fn, prop) : (obj, key = prop, valid) => isNil(obj) ? sync.text(prop) : fn(obj, key, prop, valid)
    })

    sync.stop = (obj, prop) => {
      if (has(obj)) {
        const syncedProps = syncs.get(obj)
        if (!prop) {
          syncedProps.forEach(ln => ln.off()).clear()
        } else if (syncedProps.has(prop)) {
          syncedProps.get(prop).off()
          syncedProps.delete(prop)
        }
        if (!syncedProps.size) syncs.delete(obj)
      }
      return obj
    }

    sync.text = new Proxy(
      (prop, valid) => sync(new Text(), 'textContent', prop),
      {
        get: (fn, prop) => fn(prop)
      }
    )

    sync.template = (strings, ...keys) => flatten(
      keys.reduce(
          (prev, cur, i) => [prev, sync.text(cur), strings[i + 1]],
          strings[0]
      ).filter(
        s => !isStr(s) || s.length
      )
    )

    const Async = new Proxy((key, fn) => has(key) ? fn(store.get(key)) : once('set:' + key, fn), {
      get: (_, key) => new Promise(resolve => {
        has(key) ? resolve(store.get(key)) : once('set:' + key, resolve)
      }),
      set: (_, key, val) => val.then(mut.bind(UNDEF, key))
    })

    const validators = new Map()
    const validateProp = key => {
      const valid = store.has(key) && validators.has(key) && validators.get(key)(store.get(key))
      emit('validate:' + key, valid)
      emit('validate', key, valid)
      return valid
    }

    const Validation = new Proxy((key, validator) => {
      if (isNil(validator)) return validateProp(key)
      if (isRegExp(validator)) {
        const regexp = validator
        validator = val => isStr(val) && regexp.test(val)
      }
      if (isFunc(validator)) {
        if (!isBool(validator())) {
          throw new Error(`".${key}": validator invalid`)
        }
        validators.set(key, validator)
      }
    }, {
      get: (_, key) => validateProp(key),
      set: (vd, key, val) => vd(key, val)
    })

    const computed = new Map()
    const compute = new Proxy(function (key, computation) {
      if (isFunc(computation)) computed.set(key, computation)
      else if (isStr(computation)) {
        const args = Array.from(arguments)
        if (args.every(isStr)) {
          const result = {}
          args.forEach(key => {
            result[key] = compute(key)
          })
          return result
        }
      }
      if (computed.has(key)) {
        const computeProp = computed.get(key)
        const result = computeProp(Model)
        if (computeProp.result !== result) {
          emitAsync('compute:' + key, result)
          emitAsync('compute', key, result)
          computeProp.result = result
        }
        return result
      } else {
        if (isObj(key)) each(key, (v, k) => compute(k, v))
      }
    }, {
      get: (fn, key) => fn(key),
      set: (fn, key, computation) => fn(key, computation)
    })

    const toJSON = () => map2json(store)
    const toArray = () => Array.from(store.entries())
    const toJSONArray = () => JSON.stringify(toArray())

    const map = fn => {
      store.forEach((val, key) => {
        const newVal = fn(val, key)
        if (!isNil(newVal) && newVal !== val) {
          store.set(key, val)
        }
      })
    }

    const filter = fn => {
      store.forEach((val, key) => {
        !fn(val, key) && store.delete(key)
      })
    }

    // merge data into the store Map (or Map-like) object
    if (isStr(data)) {
      try { mut(JSON.parse(data), true) } catch (e) {}
    } else if (isDef(data)) {
      mut(data, true)
    }

    const Model = new Proxy(
      Object.assign(
        mut,
        mitter,
        {
          compute,
          async: Async,
          valid: Validation,
          each: fn => {
            store.forEach(fn)
            return Model
          },
          has,
          del,
          map,
          filter,
          store,
          sync,
          syncs,
          toJSON,
          toArray,
          toJSONArray
        }
      ),
      {
        get: (o, key) => Reflect.has(o, key) ? o[key] : key === 'size' ? store.size : mut(key),
        set: (_, key, val) => isPromise(val) ? Async(key, val) : mut(key, val),
        delete: (_, key) => del(key)
      }
    )
    Models(Model, true)
    return Model
  }

  const rilti = {
    isArr,
    isNil,
    isDef,
    isObj,
    isFunc,
    isBool,
    isStr,
    isNum,
    isArrlike,
    isNodeList,
    isNode,
    isPrimitive,
    isPromise,
    isRenderable,
    isRegExp,
    isInput,
    isEmpty,
    isEl,
    attributeObserver,
    flatten,
    curry,
    components,
    component,
    run,
    render,
    runAsync,
    query,
    queryAsync,
    queryAll,
    queryEach,
    on,
    once,
    emitter,
    each,
    svg,
    fastdom,
    dom,
    domfn,
    html,
    directive,
    directives,
    prime,
    map2json,
    model,
    Mounted,
    Unmounted,
    Created,
    ProxiedNodes,
    $
  }

  typeof define === 'function' && define.amd ? define([], () => rilti) : typeof module === 'object' && module.exports ? module.exports = rilti : this.rilti = rilti
}
