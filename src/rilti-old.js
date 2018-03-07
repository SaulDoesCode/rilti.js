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
  const REMOUNT = 'remount'
  const UNMOUNT = 'unmount'
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

  // all the is this that related stuff
  const isArr = Array.isArray
  const isEqual = curry((match, Case) => match === Case || (isFunc(Case) && Case(match)))
  const matchCases = method => (...cases) => match => cases[method](isEqual(match))
  const some = matchCases('some')
  const all = matchCases('every')
  const isNil = o => o === UNDEF || o === NULL
  const isDef = o => o !== UNDEF || o !== NULL
  const isObj = o => o && o.constructor === Object
  const isFunc = o => typeof o === 'function'
  const isBool = o => typeof o === 'boolean'
  const isStr = o => typeof o === 'string'
  const isNum = o => typeof o === 'number' && !isNaN(o)
  const isNull = o => o === NULL
  const isPromise = o => typeof o === 'object' && 'then' in o
  const isPrimitive = some(isStr, isBool, isNum)
  const isIterable = o => !isNil(o) && typeof o[Symbol.iterator] === 'function'
  const isInt = o => isNum(o) && o % 1 === 0
  const isEmpty = o => !o || !((isObj(o) ? $keys(o) : o).length || o.size)
  const isEl = o => o instanceof Element
  const isNode = o => o instanceof Node
  const isArrlike = o => o && (isArr(o) || (!isFunc(o) && o.length % 1 === 0))
  const isNodeList = (o, arr = true) => o instanceof NodeList || (arr && isArrlike(o) && Array.from(o).every(isNode))
  const isMap = o => o && o instanceof Map
  const isSet = o => o && o instanceof Set
  const isRegExp = o => o && o instanceof RegExp
  const isInput = o => o && (o instanceof HTMLInputElement || o instanceof HTMLTextAreaElement)
  const isRenderable = some(isStr, isBool, isNum, isNode, isNodeList, o => isArr(o) && o.every(n => isRenderable(n)))

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

  const each = (iterable, fn, useYield) => {
    if (isNil(iterable)) return

    if (isObj(iterable)) {
      for (const key in iterable) fn(iterable[key], key, iterable)
    } else if (iterable.length) {
      let i = 0
      while (i !== iterable.length) fn(iterable[i], i++, iterable)
    } else if (iterable.forEach) {
      iterable.forEach(fn)
    } else if (isInt(iterable)) {
      if (useYield) yieldloop(iterable, fn)
      else {
        let i = 0
        while (i !== iterable) fn(i++, iterable)
      }
    } else if (isIterable(iterable)) {
      for (const [key, value] of iterable) fn(value, key, iterable)
    }
    return iterable
  }

  const flatten = (arr, result = [], encaptulate = true) => {
    if (encaptulate && !isArr(arr)) return [arr]
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
    isNodeList(descendant) ? Array.from(descendant).every(n => isMounted(n)) : parent === descendant || !!(parent.compareDocumentPosition(descendant) & 16)
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

  const infinifyFN = (fn, reflect = true, ctx = fn) => $proxy(fn, {
    get: (_, key) => (reflect && Reflect.get(fn, key)) || fn.bind(ctx, key)
  })

  const notifier = (host = {}) => {
    const listeners = listMap()
    // extract listener functions from object and arm them
    const listenMulti = (obj, one) => each(obj, (fn, name) => {
      obj[name] = listen(name, fn, one)
    })
    // arm listener
    const listen = (name, fn, one = false) => {
      if (isObj(name)) return listenMulti(name, one)

      const ln = extend(args => {
        fn.call(ln, ...args, ln)
        ln.one && ln.off()
        return ln
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

    const on = infinifyFN((name, fn) => listen(name, fn), false)
    const once = infinifyFN((name, fn) => listen(name, fn, true), false)

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
    map.forEach((val, key) => {
      obj[key] = val
    })
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
      try { mut(JSON.parse(data), true) } catch (e) {}
    } else if (!isNil(data)) {
      mut(data, true)
    }

    const syncs = $map()
    const sync = $proxy((obj, key, prop = key, valid) => {
      const isinput = isInput(obj)
      if (isinput) [prop, key] = [key, 'value']
      if (!syncs.has(obj)) syncs.set(obj, $map())

      syncs
      .get(obj)
      .set(
        prop,
        on(
          (valid ? 'validate' : 'set') + ':' + prop,
          val => { obj[key] = val }
        )
      )

      if (!valid && isinput) {
        var stop = EventManager(
          false,
          obj,
          'input',
          e => {
            mut(prop, obj[key].trim())
            if (validators.has(prop)) {
              validateProp(prop)
            }
          }
        ).off
      }

      if (valid) {
        obj[key] = validateProp(prop)
      } else if (has(prop)) {
        obj[key] = mut(prop)
      }
      once('delete:' + prop, () => {
        stop && stop()
        sync.stop(obj, prop)
      })
      return obj
    }, {
      get: (fn, prop) => Reflect.get(fn, prop) || (
         (obj, key = prop, valid) => isNil(obj) ? sync.text(prop) : fn(obj, key, prop, valid)
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

    sync.text = $proxy((options, prop, valid) => {
      if (isStr(options)) [prop, options] = [options, UNDEF]
      if (!valid && prop.includes('valid:')) {
        valid = true
        prop = prop.substr(6)
      }
      return sync(text(options), 'textContent', prop, valid)
    }, {
      get: (fn, key) => fn(UNDEF, key)
    })

    sync.template = (strings, ...keys) => (
     flatten(
       strings.map((str, i) => [
         str,
         sync.text[keys[i]]
       ])
     )
    )

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
    // if (isStr(once)) once = once === 'once'
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
      root.addEventListener('DOMContentLoaded', fn)
    }
  }

  const prime = (...nodes) => flatten(
    nodes.map(n => {
      if (isFunc(n)) return n
      if (n instanceof NodeList) return Array.from(n)
      if (isArr(n)) return prime(...n)
      if (isStr(n)) {
        let nl = Array.from(doc.createRange().createContextualFragment(n).childNodes)
        if (nl.length === 1) nl = nl[0]
        if (nl) return nl
      } else if (isPrimitive(n)) return new Text(n)
      if (isNode(n)) {
        return n
      } else if (isDef(n)) {
        throw new Error(`illegal renderable: ${n}`)
      }
    })
  )

  const attach = (host, connector, ...renderables) => {
    if (isStr(host)) {
      dom(host).then(h => attach(h, connector, ...renderables))
      return
    }
    (renderables = prime(renderables)).forEach(n => {
      if (isFunc(n)) {
        attach(host, connector, n())
      } else if (isNode(host)) {
        CR(n, isComponent(n))
        host[connector](n)
        MNT(n)
      } else if (isArr(host)) {
        host.push(n)
      }
    })
    return renderables
  }

  const frag = input => (
    isStr(input) ? doc.createRange().createContextualFragment(input) : doc.createDocumentFragment()
  )

  const emit = (node, type, detail) => {
    node.dispatchEvent(new CustomEvent(type, {detail}))
    return node
  }

  const domfn = {
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
      if (isArr(node) || isSet(node)) return each(node, n => domfn.Class(n, c, state))
      if (isObj(c)) {
        each(c, (state, className) => {
          domfn.Class(
            node,
            className,
            isBool(state) ? state : !node.classList.contains(className)
          )
        })
      } else {
        if (isStr(c)) c = c.split(' ')
        if (isArr(c)) {
          each(c, cl => {
            node.classList[(isBool(state) ? state : !node.classList.contains(cl)) ? 'add' : 'remove'](cl)
          })
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
        if (isNil(val)) return node.getAttribute(attr)
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
    prime,
    append: curry((node, ...children) => render(children, node), 2),
    prepend: curry((node, ...children) => render(children, node, 'prepend'), 2),
    appendTo: curry((node, host) => attach(host, 'append', node)),
    prependTo: curry((node, host) => attach(host, 'prepend', node)),
    remove (node, after) {
      if (isArr(node) || isSet(node)) return each(node, n => domfn.remove(n, after))
      if (isInt(after)) setTimeout(() => domfn.remove(node), after)
      else if (isMounted(node)) node.remove()
      else if (isNodeList(node)) each(node, n => domfn.remove(n))
      return node
    }
  }

  const mutate = domfn.mutate = (node, options, assignArbitrary = true) => {
    if (isArr(node)) return node.map(n => mutate(n, options, assignArbitrary))
    return each(options, (args, name) => {
      if (name === 'html' || name === 'text') {
        node[name === 'html' ? 'innerHTML' : 'textContent'] = args
      } else if (name === 'children' || name === 'inner') {
        node.innerHTML = ''
        render(args, node)
      } else if (name === 'sync') {
        options[name] = args(node)
      } else {
        if (!isArr(args)) args = [args]
        if (name in domfn) {
          const result = domfn[name](node, ...args)
          if (result !== node) options[name] = result
        } else if (name === 'class' || name === 'className') {
          domfn.Class(node, ...args)
        } else {
          let mode = name.substr(0, 4)
          const isOnce = mode === 'once'
          if (!isOnce) mode = name.substr(0, 2)
          const isOn = mode === 'on'
          if (isOnce || isOn) {
            let type = name.substr(isOnce ? 4 : 2)
            const evtfn = EventManager(isOnce)
            if (!options[mode]) options[mode] = {}
            if (type.length) {
              if (type[0] === '_') type = type.replace('_', '')
              options[mode][type] = evtfn(node, type, ...args)
            } else {
              options[mode][type] = evtfn(node, ...args)
            }
          } else if (assignArbitrary || name in node) {
            isFunc(node[name]) ? node[name](...args) : node[name] = args[0]
          }
        }
      }
    })
  }

  const assimilateProps = (el, props) => {
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

  const assimilateMethods = (el, methods) => {
    for (const name in methods) {
      $define(el, name, {
        value: methods[name].bind(el, el)
      })
    }
  }

  const mutateSet = set => (n, state) => (
    set[isBool(state) ? state ? 'add' : 'delete' : 'has'](n)
  )

  const Created = mutateSet($weakset())
  const Mounted = mutateSet($weakset())
  const Unmounted = mutateSet($weakset())

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

    const {create, mount, remount, unmount, props, methods, attr} = config

    if (!Created(el)) {
      methods && assimilateMethods(el, methods)
      props && assimilateProps(el, props)
      Created(el, true)
      create && create(el)
      attr && each(attr, (cfg, name) => handleAttribute(name, el, cfg))
      afterProps && assimilateProps(el, afterProps)
      emit(el, CREATE)
      remount && on.remount(el, remount.bind(el, el))
    }
    if (!Mounted(el) && stage === MOUNT) {
      if (Unmounted(el)) {
        remount && remount.call(el, el)
        emit(el, REMOUNT)
      } else {
        Mounted(el, true)
        mount && mount.call(el, el)
        emit(el, stage)
      }
    } else if (stage === UNMOUNT) {
      Mounted(el, false)
      Unmounted(el, true)
      unmount && unmount.call(el, el)
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
        const isFN = isFunc(toggle)
        if (isFN) toggle = toggle.bind(el, el)
        set = state => {
          domfn.attrToggle(el, name, state)
          isFN && toggle(state)
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
  const extract = (obj, path, fn) => {
    const result = path
    .replace(/\[(\w+)\]/g, '.$1')
    .replace(/^\./, '')
    .split('.')
    .reduce((xs, x) => xs && isDef(xs[x]) ? xs[x] : UNDEF, obj)
    if (result !== UNDEF) return fn ? fn(result) : result
  }
/*
  extract.or = (obj, ...paths) => {
    if (isNil(obj)) return
    const fn = paths[paths.length - 1]
    const hasfn = isFunc(fn)
    if (hasfn) paths.pop()
    let result
    let path
    for (path of paths) if (isDef(result = extract(obj, path))) break
    if (isDef(result)) return hasfn ? fn(result, path) : result
  }
*/

  const checkAttr = (
    name,
    el,
    oldValue,
    attr = directives.get(name) || extract(componentConf(el), 'attr.' + name)
  ) => attr && handleAttribute(name, el, attr, oldValue)

  // node lifecycle event dispatchers
  const CR = (n, iscomponent) => !Created(n) && !iscomponent && emit(n, CREATE)

  const MNT = n => {
    if (!Mounted(n)) {
      if (Unmounted(n)) {
        Unmounted(n, false)
        emit(n, REMOUNT)
      } else if (isComponent(n)) {
        updateComponent(n, MOUNT)
      } else {
        Mounted(n, true)
        emit(n, MOUNT)
      }
    }
  }

  const UNMNT = n => {
    Mounted(n, false)
    Unmounted(n, true)
    emit(n, UNMOUNT)
  }

  const render = (
    node,
    host = 'body',
    connector = 'appendChild'
  ) => attach(host, connector, node)

  const create = (tag, options, ...children) => {
    const el = isNode(tag) ? tag : doc.createElement(tag)
    const iscomponent = isComponent(tag)
    if (iscomponent) var componentHandled

    if (isFunc(options)) {
      options(el)
      options = UNDEF
    }
    if (el.nodeType !== 3) {
      if (isRenderable(options)) children.unshift(options)
      if (children.length) render(children, el)
    }

    if (isObj(options)) {
      mutate(el, options, false)
      if (options.props && !iscomponent) assimilateProps(el, options.props)
      options.methods && assimilateMethods(el, options.methods)
      const cycle = options.lifecycle || options.cycle
      if (cycle) {
        const {mount, create, remount, unmount} = cycle
        once.create(el, e => {
          Created(el, true)
          create && create.call(el, el)
        })
        mount && once.mount(el, mount.bind(el, el))

        cycle[UNMOUNT] = unmount && on.unmount(el, unmount.bind(el, el))
        cycle[REMOUNT] = remount && on.remount(el, remount.bind(el, el))
      }

      if (iscomponent) {
        updateComponent(el, UNDEF, extract(options, 'props'))
        componentHandled = true
      }

      const renderHost = options.$ || options.render
      if (renderHost) render(el, renderHost)
      else if (options.renderAfter) {
        attach(options.renderAfter, 'after', el)
      } else if (options.renderBefore) {
        attach(options.renderBefore, 'before', el)
      }
    }

    iscomponent ? !componentHandled && updateComponent(el, UNDEF) : CR(el)
    return el
  }

  const text = (options, txt = '') => {
    if (isPrimitive(options)) [txt, options] = [options, UNDEF]
    return create(new Text(txt), options)
  }

  const svg = (...args) => create(
    doc.createElementNS('http://www.w3.org/2000/svg', 'svg'),
    ...args
  )

  const body = (...args) => {
    args.length && run(() => domfn.append(doc.body, args))
    return args.length > 1 ? args : args[0]
  }

  const html = (...args) => {
    const renderables = prime(args)
    return renderables.length < 2 ? renderables[0] : renderables
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
    {create, query, queryAll, queryEach, text, svg, frag, body, html, prime}
  ), {
    // gotta get the d
    get: (d, key) => Reflect.get(d, key) || create.bind(UNDEF, key),
    set (d, key, val) {
      d[key] = val
    }
  })

  const MountNodes = n => updateComponent(n, MOUNT) || MNT(n)
  const UnmountNodes = n => updateComponent(n, UNMOUNT) || UNMNT(n)

  new MutationObserver(muts => muts.forEach(
    ({addedNodes, removedNodes, target, attributeName, oldValue}) => {
      addedNodes.length && addedNodes.forEach(MountNodes)
      removedNodes.length && removedNodes.forEach(UnmountNodes)
      attributeName && checkAttr(attributeName, target, oldValue)
    })
  ).observe(
    doc,
    {attributes: true, attributeOldValue: true, childList: true, subtree: true}
  )

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
    each,
    extend,
    extract,
    flatten,
    listMap,
    mutate,
    model,
    notifier,
    on,
    once,
    yieldloop,
    render,
    route,
    run,
    runAsync,
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
