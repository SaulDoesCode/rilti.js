/**
* rilti.js
* @repo github.com/SaulDoesCode/rilti.js
* @author Saul van der Walt
* @licence MIT
**/
{
  /* global Node NodeList Element CustomEvent location MutationObserver Text */
  const {assign, keys: Keys, defineProperty: Def, getOwnPropertyDescriptor: OwnDesc} = Object
  const root = window
  const doc = document
  const undef = void 0
  const NULL = null
  const funcConstruct = Obj => (...args) => new Obj(...args)
  const $map = funcConstruct(Map)
  const $set = funcConstruct(Set)
  const $weakset = funcConstruct(WeakSet)
  const $proxy = funcConstruct(Proxy)
  const $promise = funcConstruct(Promise)

  const curry = (fn, arity = fn.length, ...args) => (
    arity <= args.length ? fn(...args) : curry.bind(undef, fn, arity, ...args)
  )

  const not = fn => (...args) => !fn(...args)

  // all the is this that related stuff
  const {isArray: isArr, prototype: ArrProto} = Array
  const isEqual = curry((match, Case) => match === Case || (isFunc(Case) && Case(match)))
  const matchCases = method => (...cases) => match => cases[method](isEqual(match))
  const some = matchCases('some')
  const all = matchCases('every')
  const isDef = o => o !== undef && o !== NULL
  const isPromise = o => typeof o === 'object' && 'then' in o
  const isFunc = o => o instanceof Function
  const isObj = o => o && o.constructor === Object
  const isStr = o => o && o.constructor === String
  const isBool = o => o === true || o === false
  const isNum = o => typeof o === 'number'
  const isNil = o => o === undef || o === NULL
  const isNull = o => o === NULL
  const isPrimitive = some(isStr, isBool, isNum)
  const isIterator = o => o && o.toString().includes('Iterator')
  const isInt = o => isNum(o) && o % 1 === 0
  const isArrlike = o => o && !isFunc(o) && o.length % 1 === 0
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
    keys.length && keys.forEach(key => {
      if (!safe || (safe && !(key in host))) Def(host, key, OwnDesc(obj, key))
    })
    return host
  }

  const runAsync = (fn, ...args) => Promise.resolve(fn).then(f => f(...args))

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
    if (isNil(iterable)) return
    else if ('forEach' in iterable) {
      iterable.forEach(func)
    } else if (isArrlike(iterable)) {
      ArrProto.forEach.call(iterable, func)
    } else if (isObj(iterable)) {
      for (const key in iterable) func(iterable[key], key, iterable)
    } else if (isInt(iterable)) {
      yieldloop(iterable, func)
    } else if (iterable.entries || isIterator(iterable)) {
      for (const [key, value] of iterable) func(key, value, iterable)
    }
    return iterable
  }

  const flatten = (arr, result = []) => {
    for (const value of arr) {
      isArr(value) ? flatten(value, result) : result.push(value)
    }
    return result
  }

  const compose = (...fns) => fns.reduce((f, g) => (...args) => f(g(...args)))

  const query = (selector, element = doc) => ( // return if node else query dom
    isNode(selector) ? selector : query(element).querySelector(selector)
  )
  const queryAll = (selector, element = doc) => (
    Array.from(query(element).querySelectorAll(selector))
  )
  const queryEach = (selector, func, element = doc) => {
    if (!isFunc(func)) [func, element] = [element, doc]
    return each(queryAll(selector, element), func)
  }

  const isMounted = (descendant, parent = doc) => (
    parent === descendant || Boolean(parent.compareDocumentPosition(descendant) & 16)
  )

  const listMap = (map = $map()) => Object.assign(
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
      return fn.bind(undef, key)
    }
  })

  const notifier = (host = {}) => {
    const listeners = listMap()
    // extract listener functions from object and arm them
    const listenMulti = (obj, justonce) => each(obj, (fn, name) => {
      obj[name] = listen(justonce, name, fn)
    })
    // arm listener
    const listen = (name, fn, justonce = false) => {
      if (isObj(name)) return listenMulti(name, justonce)
      const ln = (...data) => fn(...data)
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

    const emit = infinifyFN((name, ...data) => {
      listeners.each(name, ln => {
        runAsync(ln, ...data)
        ln.once && ln.off()
      })
    }, false)

    return extend(host, {emit, on, once, listen, listeners})
  }

  const map2json = (map, obj = {}) => {
    each(map, (val, key) => { obj[key] = val })
    return JSON.stringify(obj)
  }

  const model = (data = {}, mitter = notifier(), store = $map()) => {
    const {emit, on, once} = mitter

    const del = key => {
      store.delete(key)
      emit('delete', key)
      emit('delete:' + key)
    }

    const has = key => store.has(key)

    const mut = (key, val, silent) => {
      if (isObj(key)) {
        each(key, (v, k) => mut(k, v, val))
        return mut
      }
      const oldval = store.get(key)
      if (isDef(val) && val !== oldval) {
        store.set(key, val)
        if (!silent) {
          emit('set', key, val)
          emit('set:' + key, val)
        }
        return mut
      }
      if (!silent) {
        emit('get', key)
        emit('get:' + key)
      }
      return oldval
    }
    // merge data into the store Map (or Map-like) object
    mut(data)

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
        if (!prop) syncedProps.forEach(ln => ln.off()).clear()
        else if (syncedProps.has(prop)) {
          syncedProps.get(prop).off()
          syncedProps.delete(prop)
        }
        if (!syncedProps.size) syncs.delete(obj)
      }
      return obj
    }

    const Async = $proxy((key, fn) => has(key) ? fn(store.get(key)) : once('set:' + key, fn), {
      get: (_, key) => $promise(resolve => {
        has(key) ? resolve(store.get(key)) : once('set:' + key, resolve)
      }),
      set (_, key, val) {
        val.then(mut.bind(undef, key))
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

    return $proxy(
      extend(mut,
        extend(
          mitter,
          {
            each: store.forEach.bind(store),
            has,
            store,
            sync,
            syncs,
            del,
            toJSON
          }
        )
      ),
      {
        get (o, key) {
          if (Reflect.has(o, key)) return Reflect.get(o, key)
          if (key === 'async') return Async
          else if (key === 'valid') return Validation
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
    if (!isFunc(handle)) return EventManager.bind(undef, once, target, type)

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
      once: () => add(true),
      off: () => remove()
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

  const isReady = () => doc.readyState === 'complete' || !!doc.body

  const loadStack = $set()
  once.DOMContentLoaded(root, e => each(loadStack, runAsync).clear())

  const run = fn => isReady() ? runAsync(fn) : loadStack.add(fn)

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
    node.dispatchEvent(new CustomEvent(type, detail ? {detail} : undef))
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
      if (isObj(styles)) each(styles, (p, key) => { node.style[key] = p })
      else if (isStr(styles)) node.style[styles] = prop
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
    attrToggle: curry((node, name, state = !node.hasAttribute(name), val = node.getAttribute(name) || state) => {
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
    removeNodes: (...nodes) => each(nodes, n => isMounted(n) && n.remove())
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
  const component = (tag, config) => {
    if (!tag.includes('-')) return err(tag + ' is un-hyphenated')
    components.set(tag, config)
    run(() => queryEach(tag, updateComponent))
  }

  const componentConf = tag => components.get(tag && tag.tagName ? getTag(tag) : tag)

  const updateComponent = (element, config, stage) => {
    const name = getTag(element)
    if (!components.has(name)) return
    else if (isStr(config)) [stage, config] = [config, components.get(name)]
    else if (!isObj(config)) config = components.get(name)

    const {create, mount, destroy, props, methods, attr} = config

    if (!Created(element)) {
      if (props) {
        const oldProps = {}
        Keys(props).forEach(prop => {
          const elValue = element[prop]
          if (!isNil(elValue)) oldProps[prop] = elValue
        })
        extend(element, props)
        !isEmpty(oldProps) && once(
          'create',
          element,
          () => each(oldProps, (val, prop) => { element[prop] = val })
        )
      }
      methods && extend(element, methods)
      Created(element, true)
      create && create(element)
      emit(element, 'create')
    }
    if (!Mounted(element) && stage === 'mount') {
      attr && each(attr, (cfg, name) => handleAttribute(name, element, cfg))
      Mounted(element, true)
      emit(element, stage)
      if (mount) mount(element)
    } else if (stage === 'destroy') {
      Mounted(element, false)
      emit(element, stage)
      destroy && destroy(element)
    }

    return element
  }

  const handleAttribute = (name, el, {init, update, destroy}, oldValue, val = el.getAttribute(name)) => {
    const nameInit = name + '_init'
    const hasAttr = el.hasAttribute(name)
    if (isPrimitive(val)) {
      if (hasAttr && !el[nameInit]) {
        el[nameInit] = true
        init && init(el, val)
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
  .reduce((xs, x) => xs && xs[x] ? xs[x] : undef, obj)

  const checkAttr = (
    name,
    el,
    oldValue,
    attr = directives.get(name) || extract(componentConf(el), 'attr.' + name)
  ) => attr && handleAttribute(name, el, attr, oldValue)

  // node lifecycle event dispatchers
  const CR = n => !(Created(n) && isComponent(n)) && emit(n, 'create')

  const MNT = n => {
    if (!Mounted(n) && !isComponent(n)) {
      Mounted(n, true)
      emit(n, 'mount')
    }
  }

  const DST = n => {
    if (!isComponent(n)) {
      Mounted(n, false)
      emit(n, 'destroy')
    }
  }

  const render = (node, host = 'body', connector = 'appendChild') => {
    CR(node)
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
      errs => err('render fault:', errs)
    )
    return node
  }

  const asimilateProps = (el, props) => Keys(props).forEach(prop => {
    prop in el ? el[prop] = props[prop] : Def(el, prop, OwnDesc(props, prop))
  })

  const create = (tag, options, ...children) => {
    const el = isNode(tag) ? tag : doc.createElement(tag)

    if (isRenderable(options)) children.unshift(options)
    if (children.length && el.nodeName !== '#text') domfn.append(el, children)

    if (isObj(options)) {
      if (options.attr) domfn.attr(el, options.attr)
      if (options.css) domfn.css(el, options.css)
      if (options.class || options.className) {
        el.className += options.class || options.className
      }
      if (options.id) el.id = options.id
      if (options.src) el.src = options.src
      if (options.href) el.href = options.href
      if (options.props) asimilateProps(el, options.props)
      if (options.methods) extend(el, options.methods)
      if (options.once) once(el, options.once)
      if (options.on) on(el, options.on)
      if (options.lifecycle || options.cycle) {
        const {mount, destroy, create} = options.lifecycle || options.cycle
        once(el, 'create', e => {
          Created(el, true)
          create && create.call(el, el)
        })

        if (mount) {
          var mountListener = once(el, 'mount', mount.bind(el, el))
        }

        if (mountListener || destroy) {
          on(el, 'destroy', e => {
            destroy && destroy.call(el, el)
            mountListener && mountListener.on()
          })
        }
      }
      const {renderBefore, renderAfter, render: rendr} = options
      if (renderBefore) render(el, renderBefore, 'before')
      else if (renderAfter) render(el, renderAfter, 'after')
      else if (rendr) render(el, rendr)
    }

    (isComponent(tag) ? updateComponent : CR)(el)
    return el
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
        reject([400, selector])
      }
    }),
    {create, query, queryAll, queryEach, html, text, frag}
  ), {
    get: (d, key) => key in d ? d[key] : create.bind(undef, key), // get the d
    set: (d, key, val) => (d[key] = val)
  })

  new MutationObserver(muts => {
    for (const {addedNodes, removedNodes, target, attributeName, oldValue} of muts) {
      if (attributeName) checkAttr(attributeName, target, oldValue)
      if (addedNodes.length) for (const n of addedNodes) updateComponent(n, 'mount') || MNT(n)
      if (removedNodes.length) for (const n of removedNodes) updateComponent(n, 'destroy') || DST(n)
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
    each,
    extend,
    extract,
    flatten,
    not,
    notifier,
    model,
    on,
    once,
    timeout,
    yieldloop,
    render,
    route,
    run,
    runAsync,
    listMap,
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
