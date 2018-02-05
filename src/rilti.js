/**
* rilti.js
* @repo github.com/SaulDoesCode/rilti.js
* @author Saul van der Walt
* @licence MIT
**/
{ /* global Node NodeList Element CustomEvent location MutationObserver Text */
  const {assign, keys: Keys, defineProperty: Def, getOwnPropertyDescriptor: OwnDesc} = Object
  const root = window
  const doc = document
  const UNDEF = undefined
  const NULL = null
  const CREATE = 'create'
  const MOUNT = 'mount'
  const DESTROY = 'destroy'
  const [
    $map,
    $set,
    $weakset,
    $proxy,
    $promise
  ] = [
    Map,
    Set,
    WeakSet,
    Proxy,
    Promise
  ].map(Obj => (...args) => Reflect.construct(Obj, args))

  const curry = (fn, arity = fn.length, ...args) => (
    arity <= args.length ? fn(...args) : curry.bind(UNDEF, fn, arity, ...args)
  )

  const not = fn => (...args) => !fn(...args)

  // all the is this that related stuff
  const {isArray: isArr, prototype: ArrProto} = Array
  const isEqual = curry((match, Case) => match === Case || (isFunc(Case) && Case(match)))
  const matchCases = method => (...cases) => match => cases[method](isEqual(match))
  const some = matchCases('some')
  const all = matchCases('every')
  const isDef = o => o !== UNDEF && o !== NULL
  const isPromise = o => typeof o === 'object' && 'then' in o
  const isFunc = o => o instanceof Function
  const isObj = o => o && o.constructor === Object
  const isStr = o => o && o.constructor === String
  const isBool = o => o === true || o === false
  const isNum = o => typeof o === 'number'
  const isNil = o => o === UNDEF || o === NULL
  const isNull = o => o === NULL
  const isPrimitive = some(isStr, isBool, isNum)
  const isIterable = o => !isNil(o) && typeof o[Symbol.iterator] === 'function'
  const isInt = o => isNum(o) && o % 1 === 0
  const isArrlike = o => o && (isArr(o) || (!isFunc(o) && o.length % 1 === 0))
  const isEmpty = o => !o || !((isObj(o) ? Keys(o) : isNum(o.length) && o).length || o.size)
  const isEl = o => o && o instanceof Element
  const isNode = o => o && o instanceof Node
  const isNodeList = o => o && (o instanceof NodeList || (isArrlike(o) && ArrProto.every.call(o, isNode)))
  const isMap = o => o && o instanceof Map
  const isSet = o => o && o instanceof Set
  const isRegExp = o => o && o instanceof RegExp
  const isInput = o => isEl(o) && 'INPUT TEXTAREA'.includes(o.tagName)
  const isRenderable = some(isNode, isArrlike, isPrimitive)

  const err = console.error.bind(console)

  const extend = (host = {}, obj, safe = false, keys = Keys(obj)) => {
    for (const key of keys) {
      if (!safe || (safe && !(key in host))) Def(host, key, OwnDesc(obj, key))
    }
    return host
  }

  const runAsync = (fn, ...args) => setTimeout(fn, 0, ...args)

  const timeout = (fn, ms = 1000, current) => assign(fn, {
    ms,
    start () {
      current = setTimeout(() => fn(), fn.ms)
      return fn
    },
    stop (run = false) {
      if (run) fn()
      clearTimeout(current)
      return fn
    }
  })

  const debounce = (fn, wait = 0) => {
    let inDebounce
    return function () {
      const context = this
      const args = arguments
      clearTimeout(inDebounce)
      inDebounce = setTimeout(() => fn.apply(context, args), wait)
    }
  }

  const throttle = (fn, wait) => {
    let inThrottle
    let lastFn
    let lastTime
    return function () {
      const context = this
      const args = arguments
      if (!inThrottle) {
        fn.apply(context, args)
        lastTime = Date.now()
        inThrottle = true
      } else {
        clearTimeout(lastFn)
        lastFn = setTimeout(() => {
          if (Date.now() - lastTime >= wait) {
            fn.apply(context, args)
            lastTime = Date.now()
          }
        }, wait - (Date.now() - lastTime))
      }
    }
  }

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

  const each = (iterable, fn) => {
    if (isNil(iterable)) return

    if (isObj(iterable)) {
      for (const key in iterable) fn(iterable[key], key, iterable)
    } else if (iterable.length) {
      let i = 0
      while (i !== iterable.length) fn(iterable[i], i++, iterable)
    } else if (iterable.forEach) {
      iterable.forEach(fn)
    } else if (isInt(iterable)) {
      yieldloop(iterable, fn)
    } else if (isIterable(iterable)) {
      for (const [key, value] of iterable) fn(value, key, iterable)
    }
    return iterable
  }

  const flatten = (arr, result = []) => {
    if (!isArr(arr)) return [arr]
    for (const value of arr) {
      isArr(value) ? flatten(value, result) : result.push(value)
    }
    return result
  }

  const compose = (...fns) => fns.reduce((f, g) => (...args) => f(g(...args)))

  const query = (selector, host = doc) => ( // return if node else query dom
    isNode(selector) ? selector : query(host).querySelector(selector)
  )
  const queryAll = (selector, host = doc) => (
    Array.from(query(host).querySelectorAll(selector))
  )
  const queryEach = (selector, fn, host = doc) => {
    if (!isFunc(fn)) [fn, host] = [host, doc]
    return each(queryAll(selector, host), fn)
  }

  const isMounted = (descendant, parent = doc) => (
    parent === descendant || Boolean(parent.compareDocumentPosition(descendant) & 16)
  )

  const listMap = (map = $map()) => assign(
    (key, val) => (
      isDef(val) ? (map.has(key) ? map : map.set(key, $set())).get(key).add(val) : map.get(key)
    ),
    {
      map,
      del (key, val) {
        map.has(key) && map.get(key).delete(val).size < 1 && map.delete(key)
      },
      has: (key, val, list = map.get(key)) => isDef(val) ? list && list.has(val) : !!list,
      each (key, fn) { map.has(key) && map.get(key).forEach(fn) }
    }
  )

  const infinifyFN = (fn, reflect = true) => $proxy(fn, {
    get (_, key) {
      if (reflect && Reflect.has(fn, key)) return Reflect.get(fn, key)
      return fn.bind(fn, key)
    }
  })

  const notifier = (host = {}) => {
    const listeners = listMap()
    // extract listener fntions from object and arm them
    const listenMulti = (obj, justonce) => each(obj, (fn, name) => {
      obj[name] = listen(justonce, name, fn)
    })
    // arm listener
    const listen = (name, fn, justonce = false) => {
      if (isObj(name)) return listenMulti(name, justonce)
      const ln = args => fn.apply(UNDEF, args)
      const setln = state => {
        listeners.del(name, ln)
        ln.once = state
        listeners(name, ln)
        return ln
      }
      ln.off = () => {
        listeners.del(name, ln)
        return ln
      }
      ln.on = () => setln(false)
      ln.once = () => setln(true)
      return setln(justonce)
    }

    const on = infinifyFN((name, fn) => listen(name, fn))
    const once = infinifyFN((name, fn) => listen(name, fn, true))

    const emitSynchronously = synchronously => infinifyFN((name, ...data) => {
      listeners.each(name, ln => {
        ln.once && ln.off()
        synchronously ? ln(data) : setTimeout(ln, 0, data)
      })
    }, false)

    const emit = emitSynchronously()
    const emitSync = emitSynchronously(true)

    return extend(host, {emit, emitSync, on, once, listen, listeners})
  }

  const map2json = (map, obj = {}) => {
    map.forEach((val, key) => {
      obj[key] = val
    })
    return JSON.stringify(obj)
  }

  const model = (data, mitter = notifier(), store = $map()) => {
    const {emitSync, emit, on, once} = mitter

    const del = (key, silent) => {
      if (isArr(key)) {
        key.forEach(k => {
          del(k, silent)
        })
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
        each(key, (v, k) => {
          isNil(v) ? del(k, val) : mut(k, v, val)
        })
      } else if (isArr(key)) {
        key.forEach(([k, v]) => mut(k, v, val))
      } else {
        const oldval = store.get(key)
        if (isDef(val) && val !== oldval) {
          store.set(key, val)
          if (!silent) {
            emitSync('set', key, val)
            emitSync('set:' + key, val)
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
    // merge data into the store Map (or Map-like) object
    if (isStr(data)) {
      try {
        mut(JSON.parse(data), true)
      } catch (e) {}
    } else if (!isNil(data)) {
      mut(data, true)
    }

    const syncs = $map()
    const sync = (obj, key, prop = key) => {
      if (!syncs.has(obj)) syncs.set(obj, $map())
      syncs.get(obj).set(prop, on('set:' + prop, val => { obj[key] = val }))
      if (has(prop)) obj[key] = mut(prop)
      return obj
    }
    sync.stop = (obj, prop) => {
      if (has(obj)) {
        const syncedProps = syncs.get(obj)
        if (!prop) {
          each(syncedProps, ln => {
            ln.off()
          }).clear()
        } else if (syncedProps.has(prop)) {
          syncedProps.get(prop).off()
          syncedProps.delete(prop)
        }
        if (!syncedProps.size) syncs.delete(obj)
      }
      return obj
    }
    sync.text = $proxy((options, prop) => {
      if (isStr(options)) [prop, options] = [options, '']
      return sync(text(), 'textContent', prop)
    }, {
      get: (fn, key) => fn(key)
    })

    const Async = $proxy((key, fn) => has(key) ? fn(store.get(key)) : once('set:' + key, fn), {
      get: (_, key) => $promise(resolve => {
        has(key) ? resolve(store.get(key)) : once('set:' + key, resolve)
      }),
      set (_, key, val) {
        val.then(mut.bind(UNDEF, key))
      }
    })

    const validators = $map()
    const validateProp = key => {
      const valid = store.has(key) && validators.has(key) && validators.get(key)(store.get(key))
      emit('validate:' + key, valid)
      emit('validate', key, valid)
      return valid
    }

    const Validation = $proxy((key, validator) => {
      if (isNil(validator)) return validateProp(key)
      if (isRegExp(validator)) {
        const regexp = validator
        validator = val => isStr(val) && regexp.test(val)
      }
      if (isFunc(validator)) validators.set(key, validator)
    }, {
      get: (_, key) => validateProp(key),
      set: (vd, key, val) => vd(key, val)
    })

    const toJSON = () => map2json(store)
    const toArray = () => Array.from(store.entries())
    const toJSONArray = () => JSON.stringify(toArray())

    const map = fn => {
      for (const [key, val] of store) {
        const newVal = fn(val, key)
        if (!isNil(newVal) && newVal !== val) {
          store.set(key, val)
        }
      }
    }

    const filter = fn => {
      for (const [key, val] of store) !fn(val, key) && store.delete(key)
    }

    return $proxy(
      extend(mut,
        extend(mitter, {
          async: Async,
          valid: Validation,
          each: store.forEach.bind(store),
          get size () { return store.size },
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
        })
      ),
      {
        get (o, key) {
          if (Reflect.has(o, key)) return Reflect.get(o, key)
          return mut(key)
        },
        set (_, key, val) {
          return isPromise(val) ? (Async[key] = val) : mut(key, val)
        },
        delete: (_, key) => del(key)
      }
    )
  }

  const EventManager = curry((once, target, type, handle, options = false) => {
    if (isStr(target)) target = query(target)
    if (!target.addEventListener) return err('EventManager: target invalid')
    if (isObj(type)) return each(type, (fn, name) => EventManager(once, target, name, fn, options))
    if (!isFunc(handle)) return EventManager.bind(UNDEF, once, target, type)

    handle = handle.bind(target)

    const handler = evt => {
      handle(evt, target)
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
      type,
      reseat (newTarget, shouldRemoveOriginal) {
        if (shouldRemoveOriginal) remove()
        return EventManager(once, newTarget, type, handle, options)
      },
      on: add,
      off: remove,
      once: () => add(true)
    }

    return add(once)
  }, 3)

  const evtlnProxyConf = {
    get: (fn, type) => (target, handle, options = false) => fn(target, type, handle, options)
  }
  const once = $proxy(EventManager(true), evtlnProxyConf)
  const on = $proxy(EventManager(false), evtlnProxyConf)

  const route = notifier((hash, fn) => {
    if (!route.active) {
      on.hashchange(root, () => {
        const h = location.hash
        route.emit(route.listeners.has(h) ? h : 'default', h)
      })
      route.active = true
    }
    if (isFunc(hash)) [fn, hash] = [hash, 'default'] // the ol' swopperoo ...and thank the javascript gods for destructuring
    if (hash !== 'default' && !hash.includes('#/')) hash = '#/' + hash
    if (location.hash === hash || hash === 'default') fn(location.hash)
    return route.on(hash, fn)
  })

  const run = fn => {
    if (doc.readyState === 'complete' || !!doc.body) {
      runAsync(fn)
    } else {
      root.addEventListener('DOMContentLoaded', fn, {once: true})
    }
  }

  const html = input => {
    if (isFunc(input)) input = input()
    return (
      isNode(input) ? input : doc.createRange().createContextualFragment(input)
    )
  }

  const frag = input => (
    isNil(input) ? doc.createDocumentFragment() : html(input)
  )

  const emit = (node, type, detail) => {
    node.dispatchEvent(new CustomEvent(type, {detail}))
  }

  // vpend - virtual append, add nodes and get them as a document fragment
  const vpend = (children, dfrag = frag()) => {
    flatten(children).forEach(child => {
      dfrag.appendChild(child = html(child))
      MNT(child)
    })
    return dfrag
  }

  const domfn = {
    replace (node, newnode) {
      node.replaceWith(newnode)
      return newnode
    },
    css: curry((node, styles, prop) => {
      if (isObj(styles)) each(styles, (p, key) => domfn.css(node, key, p))
      else if (isStr(styles)) {
        if (styles.slice(0, 2) === '--') {
          node.style.setProperty(styles, prop)
        } else {
          node.style[styles] = prop
        }
      }
      return node
    }, 2),
    Class: curry((node, c, state = !node.classList.contains(c)) => {
      if (isObj(c)) {
        each(c, (state, className) => domfn.Class(node, className, state))
      }
      if (isStr(c)) c = c.split(' ')
      if (isArr(c)) each(c, cls => node.classList[state ? 'add' : 'remove'](cls))
      return node
    }, 2),
    hasClass: curry((node, name) => node.classList.contains(name)),
    attr: curry((node, attr, val) => {
      if (isObj(attr)) {
        each(attr, (v, a) => {
          node[isNil(v) ? 'removeAttribute' : 'setAttribute'](a, v)
        })
      } else if (isStr(attr)) {
        if (!isPrimitive(val)) return node.getAttribute(attr)
        node.setAttribute(attr, val)
      }
      return node
    }, 2),
    rmAttr (node, ...attrs) {
      attrs.forEach(attr => node.removeAttribute(attr))
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
    append: curry((node, ...children) => {
      children = vpend(children)
      dom(node).then(n => n.appendChild(children))
      return node
    }, 2),
    prepend: curry((node, ...children) => {
      children = vpend(children)
      dom(node).then(n => n.prepend(children))
      return node
    }, 2),
    appendTo: curry((node, host) => {
      dom(host).then(v => v.appendChild(node))
      return node
    }),
    prependTo: curry((node, host) => {
      dom(host).then(v => v.prepend(node))
      return node
    }),
    remove (node, after) {
      if (isInt(after)) return timeout(() => isMounted(node) && node.remove(), after).start()
      else if (isMounted(node)) node.remove()
      return node
    },
    removeNodes: (...nodes) => each(nodes, n => isMounted(n) && n.remove()),
    mutate (node, options, assignArbitrary = true) {
      if (!options) return
      if (isArr(node)) return node.map(n => domfn.mutate(n, options, assignArbitrary))
      for (let name in options) {
        let args = options[name]
        const argsIsArr = isArr(args)
        const classRelated = name === 'class' || name === 'className'
        if (name in domfn || classRelated) {
          if (classRelated) name = 'Class'
          const result = argsIsArr ? domfn[name](node, ...args) : domfn[name](node, args)
          if (result !== node) options[name] = result
        } else if (name.includes('once') || name.includes('on')) {
          const evtfn = EventManager(name.includes('once'))
          if (name.includes('_')) {
            const [evtfnName, type] = name.split('_')
            if (!options[evtfnName]) options[evtfnName] = {}
            options[evtfnName][type] = argsIsArr ? evtfn(node, type, ...args) : evtfn(node, type, args)
          }
          options[name] = argsIsArr ? evtfn(node, ...args) : evtfn(node, args)
        } else if (name === 'children' || name === 'inner') {
          node.innerHTML = ''
          if (isRenderable(args = flatten(args))) domfn.append(node, args)
        } else if (name === 'text') {
          node.textContent = args
        } else if (name === 'html') {
          node.innerHTML = args
        } else if (assignArbitrary || name in node || name === 'src' || name === 'href') {
          if (isFunc(node[name])) {
            argsIsArr ? node[name](...args) : node[name](args)
          } else {
            node[name] = args
          }
        }
      }
      return options
    }
  }

  const asimilateProps = (el, props) => {
    for (const prop in props) {
      if (prop in el) {
        el[prop] = props[prop]
      } else if (prop === 'accessors') {
        each(props[prop], (etters, key) => {
          const {set = etters, get = etters} = etters
          Def(el, key, {
            set: set.bind(el, el),
            get: get.bind(el, el)
          })
        })
      } else {
        Def(el, prop, OwnDesc(props, prop))
      }
    }
  }

  const asimilateMethods = (el, methods) => {
    for (const name in methods) {
      Def(el, name, {
        value: methods[name].bind(el, el)
      })
    }
  }

  const mutateSet = set => (n, state) => (
    set[isBool(state) ? state ? 'add' : 'delete' : 'has'](n)
  )

  const createdNodes = $weakset()
  const Created = mutateSet(createdNodes)

  const mountedNodes = $weakset()
  const Mounted = mutateSet(mountedNodes)

  const getTag = el => (el.tagName || String(el)).toLowerCase()
  const isComponent = el => components.has(getTag(el))

  const components = $map()
  const component = (tagName, config) => {
    if (!tagName.includes('-')) return err(tagName + ' is un-hyphenated')
    components.set(tagName, config)
    run(() => queryEach(tagName, updateComponent))
    return dom[tagName]
  }

  const componentConf = tag => components.get(tag && tag.tagName ? getTag(tag) : tag)

  const updateComponent = (el, config, stage, afterProps = isObj(stage) && stage) => {
    const name = getTag(el)
    if (!components.has(name)) return
    else if (isStr(config)) [stage, config] = [config, components.get(name)]
    else if (!isObj(config)) config = components.get(name)

    const {create, mount, destroy, props, methods, attr} = config

    if (!Created(el)) {
      methods && asimilateMethods(el, methods)
      props && asimilateProps(el, props)
      afterProps && asimilateProps(el, afterProps)
      attr && each(attr, (cfg, name) => handleAttribute(name, el, cfg))
      Created(el, true)
      create && create(el)
      emit(el, CREATE)
    }
    if (!Mounted(el) && stage === MOUNT) {
      Mounted(el, true)
      mount && mount(el)
      emit(el, stage)
    } else if (stage === DESTROY) {
      Mounted(el, false)
      destroy && destroy(el)
      emit(el, stage)
    }

    return el
  }

  const handleAttribute = (name, el, cfg, oldValue, val = el.getAttribute(name)) => {
    let {update, init = update, destroy} = cfg
    if (isFunc(cfg)) {
      init = cfg
      update = cfg
    }
    const nameInit = name + '_init'
    const hasAttr = el.hasAttribute(name)
    const initiated = el[nameInit]

    if (!(name in el) && cfg.prop) {
      let {set, get, bool, toggle} = cfg.prop
      if (toggle) {
        const toggleIsFN = isFunc(toggle)
        if (toggleIsFN) {
          toggle = toggle.bind(el, el)
        }
        set = state => {
          domfn.attrToggle(el, name, state)
          toggleIsFN && toggle(state)
        }
        get = () => el.hasAttribute(name)
      } else {
        set = set ? set.bind(el, el) : v => el.setAttribute(name, v)
        get = get ? get.bind(el, el) : () => el.getAttribute(name)
      }
      if (bool) get = () => el.getAttribute(name) === 'true'
      Def(el, name, {set, get})
    }

    if (isPrimitive(val)) {
      if (!initiated && hasAttr) {
        el[nameInit] = true
        if (init) {
          Mounted(el) ? init(el, val) : once.mount(el, () => update(el, val))
        }
      } else if (update && val !== oldValue) {
        update(el, val, oldValue)
      }
    } else if (!hasAttr) {
      el[nameInit] = false
      destroy && destroy(el, val, oldValue)
    }
  }

  const directives = $map()

  const directive = (name, stages) => {
    directives.set(name, stages)
    run(() => {
      queryEach(`[${name}]`, el => checkAttr(name, el))
    })
  }

  // Thanks A. Sharif, for medium.com/javascript-inside/safely-accessing-deeply-nested-values-in-javascript-99bf72a0855a
  const extract = (obj, path) => path
  .replace(/\[(\w+)\]/g, '.$1')
  .replace(/^\./, '')
  .split('.')
  .reduce((xs, x) => xs && xs[x] ? xs[x] : UNDEF, obj)

  const checkAttr = (
    name,
    el,
    oldValue,
    attr = directives.get(name) || extract(componentConf(el), 'attr.' + name)
  ) => attr && handleAttribute(name, el, attr, oldValue)

  // node lifecycle event dispatchers
  const CR = n => {
    if (!Created(n)) emit(n, CREATE)
  }

  const MNT = n => {
    if (Mounted(n)) return
    if (isComponent(n)) {
      updateComponent(n, MOUNT)
    } else {
      Mounted(n, true)
      emit(n, MOUNT)
    }
  }

  const DST = n => {
    Mounted(n, false)
    emit(n, DESTROY)
  }

  const render = (node, host = 'body', connector = 'appendChild') => {
    if (!isComponent(node)) CR(node)
    dom(host).then(
      h => {
        if (!isMounted(h) && (connector === 'after' || connector === 'before')) {
          once.mount(h, () => {
            h[connector](node)
            MNT(node)
          })
        } else {
          h[connector](node)
          MNT(node)
        }
      },
      errs => err('render fault: ', errs)
    )
    return node
  }

  const create = (tag, options, ...children) => {
    const el = isNode(tag) ? tag : doc.createElement(tag)
    const iscomponent = isComponent(tag)

    if (isRenderable(options)) children.unshift(options)
    if (children.length && el.nodeName !== '#text') {
      domfn.append(el, children)
    }

    if (isObj(options)) {
      domfn.mutate(el, options, false)
      if (options.props && !iscomponent) asimilateProps(el, options.props)
      options.methods && asimilateMethods(el, options.methods)
      if (options.lifecycle || options.cycle) {
        const {mount, destroy, create} = options.lifecycle || options.cycle
        once.create(el, e => {
          Created(el, true)
          create && create.call(el, el)
        })

        if (mount) {
          var mountListener = once.mount(el, mount.bind(el, el))
        }

        (mount || destroy) && on.destroy(el, e => {
          destroy && destroy.call(el, el)
          mountListener && mountListener.on()
        })
      }
      const {renderBefore, renderAfter, render: rndr} = options
      if (rndr) render(el, rndr)
      else if (renderBefore) render(el, renderBefore, 'before')
      else if (renderAfter) render(el, renderAfter, 'after')
    }

    iscomponent ? updateComponent(el, UNDEF, options.props) : CR(el)
    return el
  }

  const text = (options, txt) => {
    if (isStr(options)) [txt, options] = [options, {}]
    return create(new Text(txt), options)
  }

  // find a node independent of DOMContentLoaded state using a promise
  const dom = $proxy( // ah Proxy, the audacious old browser breaker :P
  extend(
    (selector, host = doc) => $promise((resolve, reject) => {
      if (isNode(selector)) resolve(selector)
      else if (selector === 'head') resolve(doc.head)
      else if (isStr(selector)) {
        run(() => {
          const temp = selector === 'body' ? doc.body : query(selector, host)
          isNode(temp) ? resolve(temp) : reject([404, selector])
        })
      } else {
        reject([400, selector])
      }
    }),
    {create, query, queryAll, queryEach, html, text, frag}
  ), {
    get: (d, key) => key in d ? d[key] : create.bind(UNDEF, key), // get the d
    set: (d, key, val) => (d[key] = val)
  })

  new MutationObserver(muts => {
    for (const {addedNodes, removedNodes, target, attributeName, oldValue} of muts) {
      if (attributeName) checkAttr(attributeName, target, oldValue)
      if (addedNodes.length) for (const n of addedNodes) updateComponent(n, MOUNT) || MNT(n)
      if (removedNodes.length) for (const n of removedNodes) updateComponent(n, DESTROY) || DST(n)
    }
  }).observe(doc, {attributes: true, attributeOldValue: true, childList: true, subtree: true})

  // I'm really sorry but I don't believe in module loaders, besides who calls their library rilti?
  root.rilti = {
    all,
    some,
    curry,
    compose,
    component,
    components,
    dom,
    domfn,
    directive,
    directives,
    debounce,
    each,
    extend,
    extract,
    flatten,
    listMap,
    model,
    notifier,
    not,
    on,
    once,
    yieldloop,
    render,
    route,
    run,
    runAsync,
    throttle,
    timeout,
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
    isIterable,
    isRenderable,
    isRegExp,
    isObj,
    isArr,
    isArrlike,
    isEmpty,
    isEl,
    isEqual,
    isNode,
    isNodeList,
    isInput,
    isMap,
    isSet
  }
}
