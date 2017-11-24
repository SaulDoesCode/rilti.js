/**
* rilti.js
* @repo github.com/SaulDoesCode/rilti.js
* @author Saul van der Walt
* @licence MIT
**/
{
  /* global Node NodeList Element CustomEvent location MutationObserver */
  const root = window
  const doc = document
  const undef = void 0
  const NULL = null
  const assign = Object.assign
  const Keys = Object.keys
  const Def = Object.defineProperty
  const OwnDesc = Object.getOwnPropertyDescriptor
  const funcConstruct = obj => (...args) => new obj(...args)
  const $map = funcConstruct(Map)
  const $set = funcConstruct(Set)
  const $proxy = funcConstruct(Proxy)
  const $promise = funcConstruct(Promise)

  const curry = (
    fn,
    arity = fn.length,
    next = (...args) => (...more) => ((more.length + args.length) >= arity ? fn : next)(...args.concat(more))
  ) => next() // love this

  const some = (...cases) => match => cases.some(Case => match === Case || (isFunc(Case) && Case(match)))
  const arrMeth = (meth, val, ...args) => Array.prototype[meth].apply(val, args)
  const arrEach = curry(arrMeth, 2)('forEach')
  const not = fn => (...args) => !fn(...args)
  // all the is this that stuff
  const isArr = Array.isArray
  const isArrlike = o => o && !(o instanceof Function) && isNum(o.length)
  const isBool = o => o === true || o === false
  const isDef = o => o !== undef && o !== NULL
  const isNil = o => o === undef || o === NULL
  const isNull = o => o === NULL
  const isNum = o => typeof o === 'number'
  const isStr = o => typeof o === 'string'
  const isFunc = o => o && o instanceof Function
  const isObj = o => o && o.constructor === Object
  const isPromise = o => o && o.constructor === Promise
  const isPrimitive = some(isStr, isBool, isNum)
  const isIterator = o => o && o.toString().includes('Iterator')
  const isInt = o => isNum(o) && o % 1 === 0
  const isEmpty = o => !o || !((isObj(o) ? Keys(o) : isNum(o.length) && o).length || o.size)
  const isEl = o => o && o instanceof Element
  const isNode = o => o && o instanceof Node
  const isNodeList = o => o && (o instanceof NodeList || (isArrlike(o) && arrMeth('every', o, isNode)))
  const isMap = o => o && o instanceof Map
  const isSet = o => o && o instanceof Set
  const isInput = o => isEl(o) && 'INPUT TEXTAREA'.includes(o.tagName)
  const isEq = curry((o1, ...vals) => vals.every(isFunc(o1) ? i => o1(i) : i => o1 === i), 2)
  const isRenderable = some(isNode, isArrlike, isPrimitive)

  const err = console.error.bind(console)

  const extend = (host = {}, obj, safe = false, keys = Keys(obj)) => {
    if (keys.length) {
      each(keys, key => {
        if (!safe || (safe && !(key in host))) Def(host, key, OwnDesc(obj, key))
      })
    }
    return host
  }

  const runAsync = (fn, ...args) => $promise((resolve, reject) => {
    try {
      resolve(fn(...args))
    } catch (e) {
      reject(e)
    }
  })

  const timeout = (fn, ms = 1000, current) => assign(fn, {
    ms,
    start () {
      current = setTimeout(() => {
        fn()
        fn.ran = true
      }, ms)
      return fn
    },
    stop (run = false) {
      if (run) fn()
      clearTimeout(current)
      return fn
    }
  })

  const yieldloop = (
    count,
    fn,
    done,
    chunksize = ~~(count / 10) || 1,
    i = -1, // this is awkward, but hey it works right, right?!?!? meh...
    chunk = () => {
      const end = Math.min(i + chunksize, count)
      while (i < end) fn(++i)
      i < count ? runAsync(chunk) : isFunc(done) && done()
    }
  ) => chunk()

  const each = (iterable, func) => {
    if (!isNil(iterable)) {
      if (iterable.forEach) iterable.forEach(func)
      else if (isArrlike(iterable)) arrEach(iterable, func)
      else if (isObj(iterable)) for (let key in iterable) func(iterable[key], key, iterable)
      else if (isInt(iterable)) yieldloop(iterable, func)
      else if (iterable.entries || isIterator(iterable)) {
        for (const [key, value] of iterable) func(key, value, iterable)
      }
    }
    return iterable
  }

  const flatten = arr => (
    isArrlike(arr) ?
    arrMeth(
      'reduce',
      arr,
      (flat, toFlatten) => (
        flat.concat(isArr(toFlatten) ? flatten(toFlatten) : toFlatten)
      ),
      []
    ) :
    [arr]
  )

  const compose = (...fns) => fns.reduce((f, g) => (...args) => f(g(...args)))

  const query = (selector, element = doc) => (
    // return if node else query dom
    isNode(selector) ? selector : query(element).querySelector(selector)
  )
  const queryAll = (selector, element = doc) => Array.from(query(element).querySelectorAll(selector))
  const queryEach = (selector, func, element = doc) => {
    if (!isFunc(func)) [func, element] = [element, doc]
    return each(queryAll(selector, element), func)
  }

  const isMounted = (descendant, parent = doc) => (
    parent === descendant || Boolean(parent.compareDocumentPosition(descendant) & 16)
  )

  const EventManager = curry((once, target, type, handle, options = false) => {
    if (isStr(target)) target = query(target)
    if (!target.addEventListener) return err('EventManager: target invalid')
    if (isObj(type)) return each(type, (fn, name) => EventManager(once, target, name, fn, options))
    if (!isFunc(handle)) return EventManager.bind(undef, once, target, type)

    handle = handle.bind(target)

    const handler = evt => {
      handle(evt, target)
      if (once) remove()
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
      type,
      reseat (newTarget, shouldRemoveOriginal) {
        if (shouldRemoveOriginal) remove()
        return EventManager(once, newTarget, type, handle, options)
      },
      on: add,
      once: () => add(true),
      off: () => remove()
    }

    return add(once)
  }, 3)

  const eventListenerTypeProxy = {
    get: (fn, type) => (target, handle, options = false) => fn(target, type, handle, options)
  }
  const once = $proxy(EventManager(true), eventListenerTypeProxy)
  const on = $proxy(EventManager(false), eventListenerTypeProxy)

  const listMap = (store = $map(), lm = {
    get: name => store.get(name),
    set (name, val) {
      (store.has(name) ? store : store.set(name, $set())).get(name).add(val)
      return lm
    },
    del (name, val) {
      if (store.has(name) && store.get(name).delete(val).size < 1) store.delete(name)
      return lm
    },
    has (name, val) {
      const nameExists = store.has(name)
      return val === undefined || !nameExists ? nameExists : store.get(name).has(val)
    },
    each (name, fn) {
      if (lm.has(name)) store.get(name).forEach(fn)
      return lm
    }
  }) => lm

  const infinifyFN = (fn, reflect = true) => $proxy(fn, {
    get (_, key) {
      if (reflect && Reflect.has(fn, key)) return Reflect.get(fn, key)
      return fn.bind(null, key)
    }
  })

  const notifier = (host = {}) => {
    const listeners = listMap()

    const armln = (name, fn) => {
      fn.off = () => listeners.del(name, fn)
      fn.once = () => {
        fn.off()
        return once(name, fn)
      }
      fn.on = () => {
        fn.off()
        return on(name, fn)
      }
      return fn
    }

    const listenMulti = (obj, fn) => {
      for (let key in obj) {
        obj[key] = fn(obj[key])
      }
    }

    const on = infinifyFN((name, fn) => {
      if (isObj(name)) return listenMulti(name, on)
      listeners.set(name, fn)
      return armln(name, fn)
    })

    const once = infinifyFN((name, fn) => {
      if (isObj(name)) return listenMulti(name, once)
      const ln = (...vals) => {
        listeners.del(name, ln)
        return fn(...vals)
      }
      listeners.set(name, ln)
      return armln(name, ln)
    })

    const listen = (justonce, name, fn) => (justonce ? once : on)(name, fn)

    const emit = infinifyFN((name, ...vals) => {
      listeners.each(name, ln => ln(...vals))
    }, false)

    const emitAsync = infinifyFN((name, ...vals) => {
      runAsync(listeners.each, name, ln => runAsync(ln, ...vals))
    }, false)

    return extend(host, {emit,emitAsync,on,once,listen,listeners})
  }


  const route = notifier((hash, fn) => {
    if (!route.active) {
      on.hashchange(root, () => {
        const h = location.hash
        route.emit(route.hastype(h) ? h : 'default', h)
      })
      route.active = true
    }
    if (isFunc(hash)) [fn, hash] = [hash, 'default'] // the ol' swopperoo ...and thank the javascript gods for destructuring
    if (hash !== 'default' && !hash.includes('#/')) hash = '#/' + hash
    if (location.hash === hash || hash === 'default') fn(location.hash)
    return route.on(hash, fn)
  })

  const isReady = () => doc.readyState === 'complete' || isNode(doc.body)

  const LoadStack = $set()
  once.DOMContentLoaded(root, () => each(LoadStack, fn => runAsync(fn)).clear())

  const run = fn => isReady() ? runAsync(fn) : LoadStack.add(fn)

  const html = input => (
    isFunc(input) ? html(input()) : isNode(input) ? input : doc.createRange().createContextualFragment(input)
  )

  const frag = inner => isPrimitive(inner) ? html(inner) : doc.createDocumentFragment()

  const emit = (node, type, detail = NULL) => {
    node.dispatchEvent(isStr(type) ? new CustomEvent(type, {detail}) : type)
    return node
  }

  // vpend - virtual append, add nodes and get them as a document fragment
  const vpend = (args, dfrag = frag()) => {
    each(flatten(args), arg => dfrag.appendChild(MNT(html(arg))))
    return dfrag
  }

  const domfn = {
    replace (node, newnode) {
      node.replaceWith(newnode)
      return newnode
    },
    css: curry((node, styles, prop) => {
      if (isObj(styles)) {
        each(styles, (p, key) => {
          node.style[key] = p
        })
      } else if (isEq(isStr, styles, prop)) {
        node.style[styles] = prop
      }
      return node
    }, 2),
    Class: curry((node, c, state = !node.classList.contains(c)) => {
      if (!isObj(c)) {
        const mode = state ? 'add' : 'remove'
        c.includes(' ') ? each(c.split(' '), cls => node.classList[mode](cls)) : node.classList[mode](c)
      } else each(c, (mode, cls) => node.classList[mode ? 'add' : 'remove'](cls))
      return node
    }, 2),
    hasClass: curry((node, name) => node.classList.contains(name)),
    attr: curry((node, attr, val) => {
      if (node.attributes) {
        if (isObj(attr)) {
          each(attr, (v, a) => {
            node.setAttribute(a, v)
            checkAttr(a, node)
          })
        } else if (isStr(attr)) {
          if (!isPrimitive(val)) return node.getAttribute(attr)
          node.setAttribute(attr, val)
          checkAttr(attr, node)
        }
      }
      return node
    }, 2),
    rmAttr (node, attr) {
      node.removeAttribute(attr)
      return node
    },
    hasAttr: (node, attr) => node.hasAttribute(attr),
    getAttr: (node, attr) => node.getAttribute(attr),
    setAttr: (node, attr, val = '') => node.setAttribute(attr, val),
    attrToggle: curry((node, name, state = !node.hasAttribute(name), val = node.getAttribute(name) || '') => {
      node[state ? 'setAttribute' : 'removeAttribute'](name, val)
      return node
    }, 2),
    emit,
    append: curry((node, ...args) => {
      dom(node).then(n => n.appendChild(vpend(args)))
      return node
    }, 2),
    prepend: curry((node, ...args) => {
      dom(node).then(n => n.prepend(vpend(args)))
      return node
    }, 2),
    appendTo: curry((node, val) => {
      dom(val).then(v => v.appendChild(node))
      return node
    }),
    prependTo: curry((node, val) => {
      dom(val).then(v => v.prepend(node))
      return node
    }),
    remove (node, after) {
      if (isInt(after)) return timeout(() => isMounted(node) && node.remove(), after).start()
      else if (isMounted(node)) node.remove()
      return node
    },
    removeNodes: (...nodes) => each(nodes, n => isMounted(n) && n.remove())
  }

  const components = $map()
  const component = (tag, config) => {
    if (!tag.includes('-')) return err(tag + ' is un-hyphenated')
    components.set(tag, config)
    run(() => {
      queryEach(tag, el => updateComponent(tag, el))
    })
  }

  const updateComponent = (name, element, stage) => {
    if (!components.has(name)) return

    const {create, mount, destroy, props, methods, attr} = components.get(name)
    if (!element.Created) {
      if (props) extend(element, props)
      if (methods) extend(element, methods)
      element.Created = true
      emit(element, 'create')
      if (create) create(element)
    }
    if (!element.Mounted && stage === 'mount') {
      if (attr) {
        each(attr, (config, name) => {
          if (!config.init) return err('component.attr must have an init method')
          if (element.hasAttribute(name)) {
            handleAttribute(name, element, config)
          }
        })
      }
      element.Mounted = true
      emit(element, 'mount')
      if (mount) mount(element)
    } else if (stage === 'destroy') {
      element.Mounted = false
      emit(element, 'destroy')
      if (destroy) destroy(element)
    }
  }

  const handleAttribute = (name, el, {init, update, destroy}, oldValue, val = el.getAttribute(name)) => {
    if (isPrimitive(val)) {
      if (!el[name + '_init']) {
        init(dirInit(el, name), val)
      } else if (update && val !== oldValue) {
        update(el, val, oldValue)
      }
    } else if (destroy) {
      el[name + '_init'] = false
      destroy(el, val, oldValue)
    }
  }

  const directives = $map()
  const dirInit = (el, name) => {
    el[name + '_init'] = true
    return el
  }

  const checkAttr = (name, el, oldValue) => {
    if (!directives.has(name)) {
      const tag = el.tagName.toLowerCase()
      const {attr: {[name]: config}} = components.get(tag) || {}
      if (config) {
        handleAttribute(name, el, config, oldValue)
      }
      return
    }
    handleAttribute(name, el, directives.get(name), oldValue)
  }

  const directive = (name, stages) => {
    directives.set(name, stages)
    run(() => {
      queryEach(`[${name}]`, checkAttr.bind(NULL, name))
    })
  }

  // node lifecycle event distributers
  const CR = n => (!n.Created && emit(n, 'create'), n)
  const MNT = n => {
    if (!n.Mounted) {
      runAsync(() => {
        n.Mounted = true
        emit(n, 'mount')
      })
    }
    return n
  }
  const DST = n => {
    n.Mounted = false
    return emit(n, 'destroy')
  }

  const render = (node, host = 'body', connector = 'appendChild') => {
    CR(node)
    dom(host).then(
      h => {
        if (connector === 'after' || connector === 'before' && !isMounted(h)) {
          once.mount(h, () => h[connector](MNT(node)))
        } else {
          h[connector](MNT(node))
        }
      },
      errs => err('render fault:', errs)
    )
    return node
  }

  const create = (tag, options, ...children) => {
    const el = isNode(tag) ? tag : doc.createElement(tag)

    if (isRenderable(options)) children.unshift(options)
    if (children.length && el.nodeName !== '#text') domfn.append(el, children)

    if (isObj(options)) {
      if (options.attr) domfn.attr(el, options.attr)
      if (options.css) domfn.css(el, options.css)
      if (options.className) el.className = options.class
      else if (options.class) el.className = options.class
      if (options.id) el.id = options.id
      if (options.src) el.src = options.src
      if (options.href) el.href = options.href
      if (options.props) {
        each(Keys(options.props), prop => {
          el[prop] ? el[prop] = options.props[prop] : Def(el, prop, OwnDesc(options.props, prop))
        })
      }
      if (options.methods) extend(el, options.methods)
      if (options.once) once(el, options.once)
      if (options.on) on(el, options.on)
      if (options.lifecycle) {
        const {mount, destroy, create} = options.lifecycle
        if (create) {
          once.create(el, () => {
            el.Created = true
            create(el)
          })
        }

        if (mount) {
          var mountListener = once.mount(el, mount.bind(el, el))
        }

        if (mountListener || destroy) {
          on.destroy(el, () => {
            if (destroy) destroy(el)
            if (mountListener) mountListener.on()
          })
        }
      }
      if (options.run) run(options.run.bind(el, el))
      const {renderBefore, renderAfter, render: rendr} = options
      if (renderBefore) render(el, renderBefore, 'before')
      else if (renderAfter) render(el, renderAfter, 'after')
      else if (rendr) render(el, rendr)
    }

    if (components.has(tag)) {
      updateComponent(tag, el)
      return el
    }
    return CR(el)
  }

  const text = (options, txt) => {
    if (isStr(options)) [txt, options] = [options, {}]
    return create(new Text(txt), options)
  }

  // find a node independent of DOMContentLoaded state using a promise
  const dom = $proxy( // ah Proxy, the audacious old browser breaker :P
  extend(
    (selector, element = doc) => $promise((resolve, reject) => {
      if (isNode(selector)) resolve(selector)
      else if (selector === 'head') resolve(doc.head)
      else if (isStr(selector)) {
        run(() => {
          const temp = selector === 'body' ? doc.body : query(selector, element)
          isNode(temp) ? resolve(temp) : reject([404, selector])
        })
      } else {
        reject([403, selector])
      }
    }),
    {create, query, queryAll, queryEach, html, text, frag}
  ), {
    get: (d, key) => key in d ? d[key] : create.bind(NULL, key), // get the d
    set: (d, key, val) => (d[key] = val)
  })

  new MutationObserver(muts => {
    for (const {addedNodes:added, removedNodes:removed, target, attributeName, oldValue} of muts) {
      if (attributeName) checkAttr(attributeName, target, oldValue)

      if (added.length) for (let n of added) {
        const tag = (n.tagName || '').toLowerCase()
        if (components.has(tag)) {
          updateComponent(tag, n, 'mount')
        } else {
          MNT(n)
        }
      }
      if (removed.length) for (let n of removed) {
        const tag = (n.tagName || '').toLowerCase()
        if (components.has(tag)) {
          updateComponent(tag, n, 'destroy')
        } else {
          DST(n)
        }
      }

    }
  })
  .observe(doc, {attributes: true, childList: true, subtree: true})

  // I'm really sorry but I don't believe in module loaders, besides who calls their library rilti?
  root.rilti = {
    some,
    curry,
    compose,
    component,
    components,
    dom,
    domfn,
    directive,
    directives,
    each,
    extend,
    flatten,
    not,
    notifier,
    on,
    once,
    timeout,
    yieldloop,
    render,
    route,
    run,
    runAsync,
    isMounted,
    isDef,
    isNil,
    isPromise,
    isPrimitive,
    isNull,
    isFunc,
    isStr,
    isBool,
    isNum,
    isInt,
    isIterator,
    isObj,
    isArr,
    isArrlike,
    isEmpty,
    isEl,
    isEq,
    isNode,
    isNodeList,
    isInput,
    isMap,
    isSet
  }
}
