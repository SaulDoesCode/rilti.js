/**
* rilti.js
* @repo github.com/SaulDoesCode/rilti.js
* @author Saul van der Walt
* @licence MIT
**/
{ /* global Node NodeList Element CustomEvent location MutationObserver Text HTMLInputElement HTMLTextAreaElement */
  const {assign, keys: $keys, defineProperty: $define, getOwnPropertyDescriptor: $getDescriptor} = Object
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
  ].map(Obj => (...args) => new Obj(...args))

  const curry = (fn, arity = fn.length, ...args) => (
    arity <= args.length ? fn(...args) : curry.bind(UNDEF, fn, arity, ...args)
  )

  /*
    Don't know what to do with this yet
    const intervener = curry((intermediate, fn, ctx) => {
      const IisFN = isFunc(intermediate)
      return (...args) => IisFN ? intermediate(fn.apply(ctx, args)) : fn.apply(ctx, args)
    }, 2)
  */

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
  const isEmpty = o => !o || !((isObj(o) ? $keys(o) : o).length || o.size)
  const isEl = o => o && o instanceof Element
  const isNode = o => o && o instanceof Node
  const isNodeList = o => o && (o instanceof NodeList || (isArrlike(o) && ArrProto.every.call(o, isNode)))
  const isMap = o => o && o instanceof Map
  const isSet = o => o && o instanceof Set
  const isRegExp = o => o && o instanceof RegExp
  const isInput = o => o && (o instanceof HTMLInputElement || o instanceof HTMLTextAreaElement)
  const isRenderable = some(isNode, isArrlike, isPrimitive)

  const err = console.error.bind(console)

  const extend = (host = {}, obj, safe = false, keys = $keys(obj)) => {
    keys.forEach(key => {
      if (!safe || (safe && !(key in host))) $define(host, key, $getDescriptor(obj, key))
    })
    return host
  }

  const runAsync = (fn, ...args) => setTimeout(fn, 0, ...args)

  const timeout = (fn, ms = 1000, current) => assign(fn, {
    ms,
    start () {
      current = setTimeout(fn, fn.ms, UNDEF)
      return fn
    },
    stop (run = false) {
      if (run) fn()
      clearTimeout(current)
      return fn
    }
  })

  const debounce = (fn, wait = 0) => {
    let bounce
    return function () {
      clearTimeout(bounce)
      bounce = setTimeout(fn.bind(this), wait, ...arguments)
    }
  }

  const throttle = (fn, wait) => {
    let throttling
    let lastFn
    let lastTime
    return function () {
      const ctx = this
      const args = arguments
      if (!throttling) {
        fn.apply(ctx, args)
        lastTime = Date.now()
        throttling = true
      } else {
        clearTimeout(lastFn)
        lastFn = setTimeout(() => {
          if (Date.now() - lastTime >= wait) {
            fn.apply(ctx, args)
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
    i = 0,
    chunk = () => {
      const end = Math.min(i + chunksize, count)
      while (i < end) fn(i++)
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
    each(arr, val => {
      isArr(val) ? flatten(val, result) : result.push(val)
    })
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
    parent === descendant || !!(parent.compareDocumentPosition(descendant) & 16)
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
      each (key, fn) {
        map.has(key) && map.get(key).forEach(fn)
      }
    }
  )

  const infinifyFN = (fn, reflect = true) => $proxy(fn, {
    get: (_, key) => (reflect && Reflect.get(fn, key)) || fn.bind(fn, key)
  })

  const notifier = (host = {}) => {
    const listeners = listMap()
    // extract listener functions from object and arm them
    const listenMulti = (obj, one) => each(
      obj,
      (fn, name) => (obj[name] = listen(name, fn, one))
    )
    // arm listener
    const listen = (name, fn, one = false) => {
      if (isObj(name)) return listenMulti(name, one)

      const ln = extend(args => {
        fn.apply(ln, args)
        ln.one && ln.off()
      }, {
        get armed () { return listeners.has(name, ln) },
        set armed (state) {
          state ? !ln.armed && listeners(name, ln) : listeners.del(name, ln)
        },
        mode: (one = false, armed = true) => assign(ln, {one, armed}),
        off: () => assign(ln, {armed: false}),
        on: () => ln.mode(),
        once: () => ln.mode(true)
      })

      return ln.mode(one)
    }

    const on = infinifyFN((name, fn) => listen(name, fn))
    const once = infinifyFN((name, fn) => listen(name, fn, true))

    const emitSync = infinifyFN(
      (name, ...data) => listeners.each(name, ln => ln(data)),
      false
    )

    const emit = infinifyFN(
      (name, ...data) => listeners.each(name, ln => setTimeout(ln, 0, data)),
      false
    )

    return extend(host, {emit, emitSync, on, once, listen, listeners})
  }

  const map2json = (map, obj = {}) => {
    map.forEach((val, key) => Reflect.set(obj, key, val))
    return JSON.stringify(obj)
  }

  const model = (data, mitter = notifier(), store = $map()) => {
    const {emitSync, emit, on, once} = mitter

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
    const sync = $proxy((obj, key, prop = key) => {
      if (isInput(obj)) return sync.input(obj, prop)
      if (!syncs.has(obj)) syncs.set(obj, $map())

      syncs
      .get(obj)
      .set(
        prop,
        on('set:' + prop, val => { obj[key] = val })
      )

      if (has(prop)) obj[key] = mut(prop)
      once('delete:' + prop, () => sync.stop(obj, prop))
      return obj
    }, {
      get: (fn, prop) => Reflect.get(fn, prop) || (
         (obj, key = prop) => fn(obj, key, prop)
      )
    })

    sync.stop = (obj, prop) => {
      if (has(obj)) {
        const syncedProps = syncs.get(obj)
        if (!prop) {
          each(syncedProps, ln => ln.off()).clear()
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

    sync.input = (input, prop) => {
      if (!syncs.has(input)) syncs.set(input, $map())
      syncs
      .get(input)
      .set(
        prop,
        on('set:' + prop, val => {
          if (input.value !== val) input.value = val
        })
      )

      if (has(prop)) input.value = mut(prop)

      const stop = EventManager(
        false,
        input,
        'input',
        () => mut(prop, input.value.trim())
      ).off

      once('delete:' + prop, () => {
        stop()
        sync.stop(input, prop)
      })

      return input
    }

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
        get: (o, key) => Reflect.get(o, key) || mut(key),
        set: (_, key, val) =>
          isPromise(val) ? (Async[key] = val) : mut(key, val),
        delete: (_, key) => del(key)
      }
    )
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
      reseat (newTarget, removeOriginal) {
        if (removeOriginal) remove()
        return EventManager(once, newTarget, type, handle, options)
      },
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
  const once = $proxy(EventManager(true), EMPC)
  const on = $proxy(EventManager(false), EMPC)

  const route = notifier((hash, fn) => {
    if (!route.active) {
      on.hashchange(root, () => {
        const h = location.hash
        route.emit(route.listeners.has(h) ? h : 'default', h)
      })
      route.active = true
    }
    // the ol' swopperoo ...and thank the javascript gods for destructuring
    if (isFunc(hash)) [fn, hash] = [hash, 'default']
    if (hash !== 'default' && !hash.includes('#/')) hash = '#/' + hash
    if (location.hash === hash || hash === 'default') fn(location.hash)
    return route.on(hash, fn)
  })

  const run = fn => {
    if (doc.readyState === 'complete' || doc.body) {
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
      } else {
        if (isStr(c)) c = c.split(' ')
        if (isArr(c)) {
          each(c, cl => node.classList[state ? 'add' : 'remove'](cl))
        }
      }
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
    removeNodes () {
      return each(arguments, n => isMounted(n) && n.remove())
    },
    mutate (node, options, assignArbitrary = true) {
      if (isArr(node)) return node.map(n => domfn.mutate(n, options, assignArbitrary))
      if (options) {
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
            if (isRenderable(args)) domfn.append(node, args)
          } else if (name === 'text') {
            node.textContent = args
          } else if (name === 'html') {
            node.innerHTML = args
          } else if (assignArbitrary || name in node) {
            if (isFunc(node[name])) {
              argsIsArr ? node[name](...args) : node[name](args)
            } else {
              node[name] = args
            }
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
          $define(el, key, {
            set: set.bind(el, el),
            get: get.bind(el, el)
          })
        })
      } else {
        $define(el, prop, $getDescriptor(props, prop))
      }
    }
  }

  const asimilateMethods = (el, methods) => {
    for (const name in methods) {
      $define(el, name, {
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

  const componentConf = tag => components.get(
    tag && tag.tagName ? getTag(tag) : tag
  )

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

    if (isPrimitive(val)) {
      if (!initiated && hasAttr) {
        el[nameInit] = true
        if (init) {
          if (Mounted(el)) {
            init(el, val)
          } else {
            once.mount(el, () => init(el, el.getAttribute(name)))
          }
        }
      } else if (update && val !== oldValue) {
        update(el, val, oldValue)
      }
    } else if (!hasAttr) {
      el[nameInit] = false
      destroy && destroy(el, val, oldValue)
    }

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
      $define(el, name, {set, get})
      if (!Mounted(el)) once.mount(el, e => handleAttribute(name, el, cfg))
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
  const extract = (obj, path) => (!isNil(obj) || UNDEF) && path
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

  const defaultConnector = 'appendChild'

  const render = (node, host = 'body', connector = defaultConnector) => {
    if (!isComponent(node)) CR(node)
    dom(host).then(
      h => {
        if (!isMounted(h) && connector !== defaultConnector) {
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
      const {renderBefore: rbefore, renderAfter: rafter, render: r} = options
      if (r) render(el, r)
      else if (rbefore) render(el, rbefore, 'before')
      else if (rafter) render(el, rafter, 'after')
    }

    iscomponent ? updateComponent(el, UNDEF, extract(options, 'props')) : CR(el)
    return el
  }

  const text = (options, txt) => {
    if (isStr(options)) [txt, options] = [options, {}]
    return create(new Text(txt), options)
  }

  const body = (...args) => {
    args.length && run(() => domfn.append(doc.body, args))
    return args.length > 1 ? args : args[0]
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
    {create, query, queryAll, queryEach, html, text, frag, body}
  ), {
    // gotta get the d
    get: (d, key) => Reflect.get(d, key) || create.bind(UNDEF, key),
    set: (d, key, val) => Reflect.set(d, key, val)
  })

  const MountNodes = n => updateComponent(n, MOUNT) || MNT(n)
  const DestroyNodes = n => updateComponent(n, DESTROY) || DST(n)

  new MutationObserver(muts => muts.forEach(
    ({addedNodes, removedNodes, target, attributeName, oldValue}) => {
      addedNodes.length && addedNodes.forEach(MountNodes)
      removedNodes.length && removedNodes.forEach(DestroyNodes)
      attributeName && checkAttr(attributeName, target, oldValue)
    })
  ).observe(
    doc,
    {attributes: true, attributeOldValue: true, childList: true, subtree: true}
  )

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
