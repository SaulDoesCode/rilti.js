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
  const Keys = Object.keys
  const Def = Object.defineProperty
  const OwnDesc = Object.getOwnPropertyDescriptor

  const curry = (
    fn,
    arity = fn.length,
    next = (...memory) => (...more) => ((more.length + memory.length) >= arity ? fn : next)(...memory.concat(more))
  ) => next() // love this

  // irony: the case of Case does not match the case of match
  const caseMatch = (...cases) => match => cases.some(Case => match === Case || (isFunc(Case) && Case(match)))
  const arrMeth = (meth, val, ...args) => Array.prototype[meth].apply(val, args)
  const arrEach = curry(arrMeth, 2)('forEach')
  const not = fn => (...args) => !fn(...args)
  // all the is this that stuff
  const isArr = Array.isArray
  const isArrlike = o => o && !(o instanceof Function) && isNum(o.length)
  const isBool = o => o === true || o === false
  const isDef = o => o !== undef && o !== NULL
  const isNil = o => o === undef || o === NULL || o === 0
  const isNull = o => o === NULL
  const isNum = o => typeof o === 'number'
  const isStr = o => typeof o === 'string'
  const isFunc = o => o && o instanceof Function
  const isObj = o => o && o.constructor === Object
  const isPromise = o => o && o.constructor === Promise
  const isPrimitive = caseMatch(isStr, isBool, isNum)
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

  const err = console.error.bind(console)

  const extend = (host = {}, obj, safe = false, keys = Keys(obj)) => {
    if (keys.length) {
      each(keys, key => {
        if (!safe || (safe && !(key in host))) Def(host, key, OwnDesc(obj, key))
      })
    }
    return host
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
      i < count ? setTimeout(chunk, 0) : isFunc(done) && done()
    }) => chunk()

  const each = (iterable, func, i = 0) => {
    if (!isNil(iterable)) {
      if (iterable.forEach) iterable.forEach(func)
      else if (iterable.length > 0) arrEach(iterable, func)
      else if (isObj(iterable)) for (i in iterable) func(iterable[i], i, iterable)
      else if (isInt(iterable)) yieldloop(iterable, func)
      else if ((iterable.entries || isIterator(iterable))) for (const [key, value] of iterable) func(key, value, iterable)
    }
    return iterable
  }

  const flatten = arr => isArrlike(arr) ? arrMeth('reduce', arr, (flat, toFlatten) => flat.concat(isArr(toFlatten) ? flatten(toFlatten) : toFlatten), []) : [arr]

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

  const isMounted = (descendant, parent = doc) => parent === descendant || Boolean(parent.compareDocumentPosition(descendant) & 16)

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
      on: () => add(),
      once: () => add(true),
      off: () => remove()
    }

    return add(once)
  }, 3)

  const once = EventManager(true)
  const on = EventManager(false)

  const deleteHandle = (handles, type, handle) => {
    if (handles.has(type) && handles.get(type).delete(handle).size < 1) handles.delete(type)
    return handle
  }
  const addHandle = (handles, type, handle) => {
    (handles.has(type) ? handles : handles.set(type, new Set())).get(type).add(handle)
    return handle
  }

  const handleMaker = (handles, one = false) => (type, handle) => {
    if (one) {
      const original = handle
      handle = (arg, arg1, arg2) => {
        original(arg, arg1, arg2)
        deleteHandle(handles, type, handle)
      }
    }
    return addHandle(handles, type, extend(handle, {
      type,
      off: () => deleteHandle(handles, type, handle),
      on: () => addHandle(handles, type, handle.off())
    }))
  }

  const notifier = (host = {}) => {
    const handles = new Map()

    const addHandlers = mode => (type, handle) => {
      if (!isStr(type)) {
        return each(type, (hndl, htype) => {
          if (isFunc(hndl)) type[htype] = mode(htype, hndl)
        })
      } else if (isFunc(handle)) return mode(type, handle)
    }

    return extend(host, {
      on: addHandlers(handleMaker(handles)),
      once: addHandlers(handleMaker(handles, true)),
      off: curry(deleteHandle)(handles),
      has: key => Reflect.has(host, key),
      hastype: type => handles.has(isFunc(type) ? type.type : type),
      hashandle: (handle, type = handle.type) => handles.has(type) && handles.get(type).has(handle),
      emit (type, arg, arg1, arg2) {
        if (handles.has(type)) {
          setTimeout(() => {
            handles.get(type).forEach(handle => {
              handle(arg, arg1, arg2)
            })
          }, 0)
        }
        return host
      }
    })
  }

  const route = notifier((hash, fn) => {
    if (!route.active) {
      on(root, 'hashchange', () => {
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

  const LoadStack = new Set()
  once(root, 'DOMContentLoaded', () => each(LoadStack, fn => setTimeout(fn, 0)).clear())

  const run = fn => isReady() ? setTimeout(fn, 0) : LoadStack.add(fn)

  const html = input => isFunc(input) ? html(input()) : isNode(input) ? input : doc.createRange().createContextualFragment(input)

  const frag = inner => isPrimitive(inner) ? html(inner) : doc.createDocumentFragment()

  const emit = curry((node, type, detail) => {
    node.dispatchEvent(!isStr(type) ? type : new CustomEvent(type, detail === undef ? undef : {detail}))
    return node
  }, 2)

  const mounted = new Set()
  // node lifecycle event distributers
  const CR = n => emit(n, 'create')
  const MNT = node => {
    if (!mounted.has(node)) setTimeout(() => mounted.add(emit(node, 'mount')), 0)
    return node
  }
  const DST = node => {
    mounted.delete(node)
    return emit(node, 'destroy')
  }

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
      if (isNum(after)) setTimeout(() => node.remove(), after)
      else node.remove()
      return node
    }
  }

  const directives = new Map()
  const dirInit = (el, name) => {
    el[name + '_init'] = true
    return el
  }

  const checkAttr = (name, el, oldValue) => {
    if (directives.has(name)) {
      const val = el.getAttribute(name)
      const {init, update, destroy} = directives.get(name)
      if (isPrimitive(val)) {
        if (!el[name + '_init']) {
          init(dirInit(el, name), val)
        } else if (update && val !== oldValue) {
          update(el, val, oldValue)
        }
      } else if (destroy) {
        destroy(el, val, oldValue)
      }
    }
  }

  const directive = (name, stages) => {
    directives.set(name, stages)
    run(() => {
      queryEach(`[${name}]`, el => {
        checkAttr(name, el)
      })
    })
  }

  const render = (node, host, connector = 'appendChild') => {
    CR(node)
    dom(host).then(
      h => {
        if (connector === 'after' || connector === 'before' && !isMounted(h)) {
          once(h, 'mount', () => h[connector](MNT(node)))
        } else {
          h[connector](MNT(node))
        }
      },
      errs => err('render fault:', errs)
    )
    return node
  }

  const isRenderable = caseMatch(isNode, isArrlike, isPrimitive)

  const create = (tag, options, ...children) => {
    const el = isNode(tag) ? tag : doc.createElement(tag)

    if (isRenderable(options)) children.unshift(options)
    if(children.length && el.nodeName !== '#text') domfn.append(el, children)

    if (isObj(options)) {
      if ('attr' in options) domfn.attr(el, options.attr)
      if (options.css) domfn.css(el, options.css)
      if (options.class) el.className = options.class
      if (options.id) el.id = options.id
      if (options.props) {
        each(Keys(options.props), prop => {
          if (prop in el) el[prop] = options.props[prop]
          else Def(el, prop, OwnDesc(options.props, prop))
        })
      }
      if (options.methods) extend(el, options.methods)
      if (options.once) once(el, options.once)
      if (options.on) on(el, options.on)
      if (options.lifecycle) {
        const {mount, destroy, create} = options.lifecycle
        on(el, 'destroy', () => {
          if (destroy) destroy(el)
          if (mount) once(el, 'mount', () => mount(el))
        })
        if (mount) once(el, 'mount', () => mount(el))
        if (create) once(el, 'create', () => create(el))
      }
      if (options.run) run(options.run.bind(el, el))
      if (options.render) render(el, options.render)
      else if (options.renderBefore) render(el, options.renderBefore, 'before')
      else if (options.renderAfter) render(el, options.renderAfter, 'after')
    }
    return CR(el)
  }

  const text = (options, txt) => {
    if (isStr(options)) [txt, options] = [options, {}]
    const node = new Text(txt)
    return create(node, options)
  }

  // find a node independent of DOMContentLoaded state using a promise
  const dom = new Proxy( // ah Proxy, the audacious old browser breaker :P
  extend(
    (selector, element = doc) => new Promise((resolve, reject) => {
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
    get: (d, key) => key in d ? d[key] : create.bind(undef, key), // get the d
    set: (d, key, val) => (d[key] = val)
  })

  new MutationObserver(muts => each(muts, ({addedNodes, removedNodes, target, attributeName, oldValue}) => {
    if (addedNodes.length) arrEach(addedNodes, MNT)
    if (removedNodes.length) arrEach(removedNodes, DST)
    if (attributeName && attributeName !== 'style') checkAttr(attributeName, target, oldValue)
  })).observe(doc, {attributes: true, childList: true, subtree: true})

  // I'm really sorry but I don't believe in module loaders, besides who calls their library rilti?
  root.rilti = {
    dom,
    domfn,
    notifier,
    compose,
    caseMatch,
    not,
    yieldloop,
    on,
    once,
    directive,
    directives,
    extend,
    route,
    render,
    run,
    curry,
    each,
    flatten,
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
