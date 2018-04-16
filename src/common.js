export const ModelSymbol = Symbol('Model')
export const ProxyNodeSymbol = Symbol('Proxy Node')
export const ComponentSymbol = Symbol('Component')

export const isModel = o => isDef(o) && o[ModelSymbol] === true

export const isProxyNode = o => isFunc(o) && o[ProxyNodeSymbol] === true

export const isComponent = el => el !== undefined && el[ComponentSymbol] !== undefined

export const isArr = Array.isArray

export const isNil = o => o === undefined || o === null

export const isDef = o => o !== undefined && o !== null

export const isFunc = o => o instanceof Function

export const isBool = o => typeof o === 'boolean'

export const isObj = o => typeof o === 'object' && o.constructor === Object

export const isStr = o => typeof o === 'string'

export const isNum = o => typeof o === 'number' && !isNaN(o)

export const isInt = o => isNum(o) && o % 1 === 0

export const isArrlike = o => isArr(o) || o instanceof window.NodeList || (isDef(o) && !(isFunc(o) || isNode(o)) && o.length % 1 === 0)

export const isNodeList = (o, arr = true) => o instanceof window.NodeList || (arr && allare(o, isNode))

export const isNode = o => o instanceof window.Node

export const isPrimitive = o => {
  o = typeof o
  return o === 'string' || o === 'number' || o === 'boolean'
}

export const isEl = o => o instanceof window.Element

export const isPromise = o => typeof o === 'object' && isFunc(o.then)

export const isRegExp = o => o instanceof RegExp

export const isEmpty = o => isNil(o) || !((isObj(o) ? Object.keys(o) : o).length || o.size)

export const isMounted = (descendant, parent = document) => (
  isNodeList(descendant) ? Array.from(descendant).every(n => isMounted(n)) : parent === descendant || !!(parent.compareDocumentPosition(descendant) & 16)
)

export const isSvg = o => {
  if (isProxyNode(o)) o = o()
  return o instanceof window.SVGElement
}

export const isInput = o => {
  if (isProxyNode(o)) o = o()
  return o instanceof window.HTMLInputElement || o instanceof window.HTMLTextAreaElement
}

export const isRenderable = o => o instanceof window.Node || isProxyNode(o) || isPrimitive(o) || allare(o, isRenderable)

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

export const curry = (fn, arity = fn.length, ...args) =>
  arity <= args.length ? fn(...args) : curry.bind(undefined, fn, arity, ...args)

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

export const runAsync = (fn, ...args) => setTimeout(fn, 0, ...args)

/*
* run runs a function on DOMContentLoaded or asynchronously
* if document.body is present and loaded
*/

export const run = fn => {
  if (document.body || document.readyState === 'complete') {
    setTimeout(fn, 0)
  } else {
    window.addEventListener('DOMContentLoaded', fn)
  }
}

/*
*
* DOM Query Functions
*
*/

export const query = (selector, host = document) =>
  isNode(selector) ? selector : query(host).querySelector(selector)

export const queryAsync = (selector, host) => new Promise((resolve, reject) => {
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

export const queryAll = (selector, host = document) => (
  Array.from(query(host).querySelectorAll(selector))
)

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

export const infinify = (fn, reflect = false) => new Proxy(fn, {
  get: (fn, key) =>
    reflect && key in fn ? Reflect.get(fn, key) : fn.bind(undefined, key)
})

/*
* mutateSet is an abstraction over Set and WeakSet
* it combines all basic Set ops into a single function
*/

export const mutateSet = set => (n, state) =>
  set[state === undefined ? 'has' : state ? 'add' : 'delete'](n)
