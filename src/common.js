/* global Node NodeList Element SVGElement HTMLInputElement HTMLTextAreaElement */
export const ProxyNodeSymbol = Symbol('Proxy Node')

export const isProxyNode = o => isFunc(o) && o[ProxyNodeSymbol] === true

export const isComponent = el => el != null && el.tagName != null && el.tagName.includes('-')

export const isArr = Array.isArray

export const isNil = o => o == null

export const isDef = o => o != null

export const isFunc = o => o instanceof Function

export const isBool = o => typeof o === 'boolean'

export const isObj = o => o != null && o.constructor === Object

export const isStr = o => typeof o === 'string'

export const isNum = o => typeof o === 'number' && !isNaN(o)

export const isInt = o => isNum(o) && o % 1 === 0

export const isArrlike = o => o != null && (isArr(o) || (
  !(o instanceof Function || o instanceof Node) &&
  o.length % 1 === 0
))

export const isNode = o => o instanceof Node

export const isNodeList = (o, arr = true) => o instanceof NodeList || (arr && allare(o, isNode))

export const isPrimitive = o => {
  o = typeof o
  return o === 'string' || o === 'number' || o === 'boolean'
}

export const isEl = o => o instanceof Element

export const isPromise = o => typeof o === 'object' && isFunc(o.then)

export const isRegExp = o => o instanceof RegExp

export const isEmpty = o => isNil(o) || !((isObj(o) ? Object.keys(o) : o).length || o.size)

export const isMounted = (child, parent = document) => isNodeList(child)
  ? Array.from(child).every(n => isMounted(n))
  : parent === child || !!(parent.compareDocumentPosition(child) & 16)

export const isSvg = o => {
  if (isProxyNode(o)) o = o()
  return o instanceof SVGElement
}

export const isInput = (o, contentEditable) => {
  if (isProxyNode(o)) o = o()
  return o instanceof HTMLInputElement || o instanceof HTMLTextAreaElement || (
    !!contentEditable &&
    o instanceof Element &&
    o.getAttribute('contenteditable') === 'true'
  )
}

export const isRenderable = o => o instanceof Node ||
  isProxyNode(o) || isPrimitive(o) || allare(o, isRenderable)

/*
* allare checks whether all items in an array are like a given param
* it's similar to array.includes but allows functions
*/
export const allare = (arr, like) => {
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
export const compose = (...fns) => fns.reduce((a, b) => (...args) => a(b(...args)))

/*
* curry a function
* and optionally
* set the arity or pre bound arguments
*/
export const curry = (fn, arity = fn.length, ...args) => arity <= args.length
  ? fn(...args) : curry.bind(null, fn, arity, ...args)

export const assign = Object.assign

export const clone = (host, empty) =>
  assign(empty ? Object.create(null) : {}, host)

/*
* flatten recursively spreads out nested arrays
* to make the entire array one dimentional
* @example flatten([1, [2, [3]], 4, [5]]) -> [1, 2, 3, 4, 5]
* @example flatten(x) -> [x]
*/
export const flatten = (arr, result = [], encaptulate = true) => {
  if (encaptulate && !isArr(arr)) return [arr]
  for (let i = 0; i < arr.length; i++) {
    isArr(arr[i]) ? flatten(arr[i], result) : result.push(arr[i])
  }
  return result
}

/*
* runAsync runs a function asynchronously
*/
export let runAsync = (fn, ...args) => window.requestIdleCallback(fn.bind(undefined, ...args))

if (!window.requestIdleCallback) {
  runAsync = (fn, ...args) => setTimeout(fn, 0, ...args)
}

/*
* run runs a function on DOMContentLoaded or asynchronously
* if document.body is present and loaded
*/
export const run = function () {
  if (document.body || document.readyState === 'complete') {
    runAsync.apply(undefined, arguments)
  } else {
    window.addEventListener('DOMContentLoaded',
      e => runAsync.apply(undefined, arguments),
      {once: true}
    )
  }
}

/*
*
* DOM Query Selector Functions
*
*/
export const query = (selector, host = document) => isNode(selector) ? selector : query(host).querySelector(selector)

export const queryAsync = (selector, host) => new Promise((resolve, reject) => {
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

/*
*  queryAll(selector String|Node, host = document String|Node)
*  it returns an array of elements matching a selector,
*  a nicer querySelectorAll essentially.
*/
export const queryAll = (selector, host = document) => Array.from(query(host).querySelectorAll(selector))

export const queryEach = (selector, fn, host = document) => {
  if (!isFunc(fn)) [fn, host] = [host, document]
  return each(queryAll(selector, host), fn)
}

/*
* each iterates over arrays, objects, integers,
* and anything implementing .forEach
*/
export const each = (iterable, fn) => {
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
export const infinify = (fn, reflect) => new Proxy(fn, {
  get: reflect === true
    ? (fn, key) => key in fn ? Reflect.get(fn, key) : fn.bind(null, key)
    : (fn, key) => fn.bind(null, key)
})

/*
* mutateSet is an abstraction over Set and WeakSet
* it combines all basic Set ops into a single function
*/
export const mutateSet = set => (n, state) =>
  set[state == null ? 'has' : state ? 'add' : 'delete'](n)

export const copyprop = (host, obj, key) => {
  Object.defineProperty(host, key, Object.getOwnPropertyDescriptor(obj, key))
  return host
}

/*
* merge(host Object|Array, target Object|Array)
* merge objects together deeply.
* it copies prop descriptions instead of raw values.
*/
export const merge = (host, target) => {
  if (isArr(host) && isArr(target)) {
    for (const val of target) if (!host.includes(val)) host.push(val)
  } else if (merge.able(host) && merge.able(target)) {
    for (const key in target) {
      if (key in host) {
        const old = host[key]
        const val = target[key]
        if (merge.able(old) && merge.able(val)) {
          merge(old, val)
        } else if (val != null) {
          copyprop(host, target, key)
        }
      } else {
        copyprop(host, target, key)
      }
    }
  }
  return host
}

merge.able = o => isArr(o) ||
  (o != null && typeof o === 'object' && !isFunc(o.then))
