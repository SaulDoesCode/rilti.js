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
  const $proxy = funcConstruct(Proxy)
  const $promise = funcConstruct(Promise)

  const curry = (
    fn,
    arity = fn.length,
    next = (...args) => (...more) => ((more.length + args.length) >= arity ? fn : next)(...args.concat(more))
  ) => next() // love this

  const not = fn => (...args) => !fn(...args)
  // all the is this that related stuff
  const {isArray: isArr, prototype: ArrProto} = Array
  const isEqual = curry((match, Case) => match === Case || (isFunc(Case) && Case(match)))
  const matchCases = method => (...cases) => match => cases[method](isEqual(match))
  const some = matchCases('some')
  const all = matchCases('every')
  const isFunc = o => o && o instanceof Function
  const isObj = o => o && o.constructor === Object
  const isPromise = o => o && o.constructor === Promise
  const isBool = o => o === true || o === false
  const isDef = o => o !== undef && o !== NULL
  const isNil = o => o === undef || o === NULL
  const isNull = o => o === NULL
  const isNum = o => typeof o === 'number'
  const isStr = o => typeof o === 'string'
  const isPrimitive = some(isStr, isBool, isNum)
  const isIterator = o => o && o.toString().includes('Iterator')
  const isInt = o => isNum(o) && o % 1 === 0
  const isArrlike = o => !isFunc(o) && isInt(o.length)
  const isEmpty = o => !o || !((isObj(o) ? Keys(o) : isNum(o.length) && o).length || o.size)
  const isEl = o => o && o instanceof Element
  const isNode = o => o && o instanceof Node
  const isNodeList = o => o && (o instanceof NodeList || (isArrlike(o) && ArrProto.every.call(o, isNode)))
  const isMap = o => o && o instanceof Map
  const isSet = o => o && o instanceof Set
  const isInput = o => isEl(o) && 'INPUT TEXTAREA'.includes(o.tagName)
  const isRenderable = some(isNode, isArrlike, isPrimitive)

  const err = console.error.bind(console)

  const extend = (host = {}, obj, safe = false, keys = Keys(obj)) => {
    if (keys.length) {
      each(keys, key => {
        if (!safe || (safe && !(key in host))) {
          Def(host, key, OwnDesc(obj, key))
        }
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
    if (!isNil(iterable)) {
      if (iterable.forEach) iterable.forEach(func)
      else if (isArrlike(iterable)) ArrProto.forEach.call(iterable, func)
      else if (isObj(iterable)) {
        for (let key in iterable) {
          func(iterable[key], key, iterable)
        }
      } else if (isInt(iterable)) yieldloop(iterable, func)
      else if (iterable.entries || isIterator(iterable)) {
        for (const [key, value] of iterable) {
          func(key, value, iterable)
        }
      }
    }
    return iterable
  }

  const flatReduceFn = (arr, toFlatten) => arr.concat(isArr(toFlatten) ? flatten(toFlatten) : toFlatten)
  const flatten = arr => isArrlike(arr) ? ArrProto.reduce.call(arr, flatReduceFn, []) : [arr]

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

    const armln = (name, fn) => {
      fn.off = () => {
        listeners.del(name, fn)
        return fn
      }
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
      for (const key in obj) {
        obj[key] = fn(obj[key])
      }
    }

    const emit = infinifyFN((name, ...vals) => {
      listeners.each(name, ln => ln(...vals))
    }, false)

    const emitAsync = infinifyFN((name, ...vals) => {
      runAsync(listeners.each, name, ln => runAsync(ln, ...vals))
    }, false)

    return extend(host, {emit, emitAsync, on, once, listen, listeners})
  }

  const map2json = (map, obj = {}) => {
    each(map, (val, key) => {
      obj[key] = val
    })
    return JSON.stringify(obj)
  }

  const model = (data = {}, store = $map()) => {
    const mitter = notifier()
    const {emit, emitAsync, on, once} = mitter

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
      if (val !== undef && val !== oldval) {
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
    runAsync(mut, data)

    const syncs = $map()
    const sync = (obj, key, prop = key) => {
      if (!syncs.has(obj)) syncs.set(obj, $map())
      syncs.get(obj).set(prop, on('set:' + prop, val => {
        obj[key] = val
      }))
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

    const Async = $proxy((key, fn) => {
      has(key) ? fn(store.get(key)) : once('set:' + key, fn)
    }, {
      get: (_, key) => $promise(resolve => {
        has(key) ? resolve(store.get(key)) : once('set:' + key, resolve)
      }),
      set (_, key, val) {
        val.then(mut.bind(null, key))
      }
    })

    const validators = $map()
    const validateProp = key => {
      const valid = store.has(key) && validators.has(key) && validators.get(key)(store.get(key))
      emitAsync('validate:' + key, valid)
      emitAsync('validate', key, valid)
      return valid
    }

    const Validation = $proxy((key, validator) => {
      if (validator === undefined) return validateProp(key)
      if (validator instanceof RegExp) {
        const regexp = validator
        validator = val => typeof val === 'string' && regexp.test(val)
      }
      if (validator instanceof Function) {
        validators.set(key, validator)
      }
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
          if (isPromise(val)) {
            return (Async[key] = val)
          }
          return mut(key, val)
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

  const isReady = () => doc.readyState === 'complete' || isNode(doc.body)

  const LoadStack = $set()
  once.DOMContentLoaded(root, () => each(LoadStack, fn => runAsync(fn)).clear())

  const run = fn => isReady() ? runAsync(fn) : LoadStack.add(fn)

  const html = input => (
    isFunc(input) ? html(input()) : isNode(input) ? input : doc.createRange().createContextualFragment(input)
  )

  const frag = inner => isPrimitive(inner) ? html(inner) : doc.createDocumentFragment()

  const emit = (node, type, detail) => {
    node.dispatchEvent(isStr(type) ? new CustomEvent(type, {detail}) : type)
    return node
  }

  // vpend - virtual append, add nodes and get them as a document fragment
  const vpend = (args, dfrag = frag()) => {
    each(flatten(args), arg => {
      const child = html(arg)
      dfrag.appendChild(child)
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
      if (isObj(styles)) {
        each(styles, (p, key) => {
          node.style[key] = p
        })
      } else if(isStr(prop)) {
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
      if (!node.attributes) return node
      if (isObj(attr)) {
        each(attr, (v, a) => {
          node.setAttribute(a, v)
        })
      } else if (isStr(attr)) {
        if (!isPrimitive(val)) return node.getAttribute(attr)
        node.setAttribute(attr, val)
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
    attrToggle: curry((node, name, state = !node.hasAttribute(name), val = node.getAttribute(name) || state) => {
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

  const getTag = el => (el.tagName || '').toLowerCase()
  const isComponent = el => components.has(getTag(el))
  const ifComponent = (el, fn, elseFn) => {
    const tag = getTag(el)
    const cp = components.get(tag)
    return cp ? fn(cp, tag) : elseFn && elseFn(el, tag)
  }

  const components = $map()
  const component = (tag, config) => {
    if (!tag.includes('-')) return err(tag + ' is un-hyphenated')
    components.set(tag, config)
    run(() => {
      queryEach(tag, el => updateComponent(tag, el))
    })
  }

  const updateComponent = (name, element, stage, config = components.get(name)) => {
    if (!config) return
    const {create, mount, destroy, props, methods, attr} = config

    if (!element.Created) {
      if (props) {
        const oldProps = {}
        each(Keys(props), prop => {
          const elValue = element[prop]
          if (!isNil(elValue)) {
            oldProps[prop] = elValue
          }
        })
        extend(element, props)
        if (!isEmpty(oldProps)) {
          once.create(element, () => {
            each(oldProps, (val, prop) => {
              element[prop] = val
            })
          })
        }
      }
      if (methods) extend(element, methods)
      element.Created = true
      if (create) create(element)
      emit(element, 'create')
    }
    if (!element.Mounted && stage === 'mount') {
      if (attr) {
        each(attr, (cfg, name) => {
          if (element.hasAttribute(name)) {
            handleAttribute(name, element, cfg)
          }
        })
      }
      element.Mounted = true
      emit(element, stage)
      if (mount) mount(element)
    } else if (stage === 'destroy') {
      element.Mounted = false
      emit(element, stage)
      if (destroy) destroy(element)
    }

    return element
  }

  const handleAttribute = (name, el, {init, update, destroy}, oldValue, val = el.getAttribute(name)) => {
    const nameInit = name + '_init'
    const hasAttr = el.hasAttribute(name)
    if (isPrimitive(val)) {
      if (hasAttr && !el[nameInit]) {
        el[nameInit] = true
        if (init) init(el, val)
      } else if (update && val !== oldValue) {
        update(el, val, oldValue)
      }
    } else if (!hasAttr) {
      el[nameInit] = false
      if (destroy) destroy(el, val, oldValue)
    }
  }

  const directives = $map()

  const checkAttr = (name, el, oldValue) => {
    if (directives.has(name)) return handleAttribute(name, el, directives.get(name), oldValue)
    ifComponent(el, config => {
      if (config.attr && config.attr[name]) {
        handleAttribute(name, el, config.attr[name], oldValue)
      }
    })
  }

  const directive = (name, stages) => {
    directives.set(name, stages)
    run(() => {
      queryEach(`[${name}]`, checkAttr.bind(NULL, name))
    })
  }

  // node lifecycle event dispatchers
  const CR = n => {
    if (!n.Created && !isComponent(n)) emit(n, 'create')
    return n
  }

  const MNT = n => {
    if (!n.Mounted && !isComponent(n)) {
      n.Mounted = true
      emit(n, 'mount')
    }
    return n
  }

  const DST = n => {
    if (!isComponent(n)) {
      n.Mounted = false
      emit(n, 'destroy')
    }
    return n
  }

  const render = (node, host = 'body', connector = 'appendChild') => {
    CR(node)
    dom(host)
    .then(
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

  const asimilateProps = (el, props) => {
    each(Keys(props), prop => {
      if (prop in el) {
        el[prop] = props[prop]
      } else {
        Def(el, prop, OwnDesc(props, prop))
      }
    })
  }

  const create = (tag, options, ...children) => {
    const el = isNode(tag) ? tag : doc.createElement(tag)

    if (isRenderable(options)) children.unshift(options)
    if (children.length && el.nodeName !== '#text') domfn.append(el, children)

    if (isObj(options)) {
      if (options.attr) domfn.attr(el, options.attr)
      if (options.css) domfn.css(el, options.css)
      if (options.class || options.className) {
        el.className = options.class || options.className
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
        once.create(el, () => {
          el.Created = true
          if (create) create.call(el, el)
        })

        if (mount) {
          var mountListener = once.mount(el, mount.bind(el, el))
        }

        if (mountListener || destroy) {
          on.destroy(el, () => {
            if (destroy) destroy.call(el, el)
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

    return ifComponent(
      el,
      (config, tag) => updateComponent(tag, el, NULL, config),
      CR
    )
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
    get: (d, key) => key in d ? d[key] : create.bind(NULL, key), // get the d
    set: (d, key, val) => (d[key] = val)
  })

  new MutationObserver(muts => {
    for (const {addedNodes, removedNodes, target, attributeName, oldValue} of muts) {
      if (attributeName) {
        checkAttr(attributeName, target, oldValue)
      }
      if (addedNodes.length) {
        for (const n of addedNodes) {
          ifComponent(n, (config, tag) => updateComponent(tag, n, 'mount', config), MNT)
        }
      }
      if (removedNodes.length) {
        for (const n of removedNodes) {
          ifComponent(n, (config, tag) => updateComponent(tag, n, 'destroy', config), DST)
        }
      }
    }
  })
  .observe(doc, {attributes: true, childList: true, subtree: true})

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
