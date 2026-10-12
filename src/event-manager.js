/* global Node NodeList */
import { assign, isObj, isArr, isStr, curry, queryAll } from './common.js'
import $ from './proxy-node.js'

// attach on/off helpers to a collection of listener handles
// without clobbering the handles themselves
const manage = (result, handles) => Object.defineProperties(result, {
  off: {
    configurable: true,
    value: () => {
      for (const h of handles) h()
      return result
    }
  },
  on: {
    configurable: true,
    value: mode => {
      for (const h of handles) h.on(mode)
      return result
    }
  }
})

const listen = function (once, target, type, fn, options = false) {
  if (isStr(target)) target = queryAll(target)
  if (target instanceof NodeList) target = Array.from(target)
  if (isArr(target) && target.length === 1) target = target[0]

  if (isArr(target) ? !target.length : !target.addEventListener) {
    throw new Error('nil/empty event target(s)')
  }

  const typeobj = isObj(type)
  if (type == null || !(typeobj || isStr(type))) {
    throw new TypeError('cannot listen to nil or invalid event type')
  }

  if (isArr(target)) {
    const handles = target.map(t => listen(once, t, type, fn, options))
    return manage(handles, handles)
  }

  if (typeobj) {
    // never mutate the caller's object, it is often shared (component configs)
    const handles = {}
    for (const name of Object.keys(type)) {
      handles[name] = listen(once, target, name, type[name], options)
    }
    return manage(handles, Object.values(handles))
  }

  if (target instanceof Node && !(options && options.proxy)) target = $(target)

  let wrapper
  if (typeof fn === 'string' && options instanceof Function) {
    // delegation: on.click(host, '.selector', handler, options)
    const matcher = fn
    fn = options
    options = arguments[5]
    if (options == null) options = false
    wrapper = function (event) {
      const t = event.target
      const match = t != null && t !== this && t.closest instanceof Function
        ? t.closest(matcher)
        : null
      if (match != null && match !== this && (!this.contains || this.contains(match))) {
        if (off.once) off()
        fn.call(this, event, target, match)
      }
    }
  } else {
    wrapper = function (event) {
      if (off.once) off()
      fn.call(this, event, target)
    }
  }

  const on = mode => {
    if (mode != null && mode !== off.once) off.once = !!mode
    target.addEventListener(type, wrapper, options)
    off.ison = true
    return off
  }

  const off = assign(() => {
    target.removeEventListener(type, wrapper, options)
    off.ison = false
    return off
  }, { target, on, once })
  off.off = off

  return on()
}

const infinifyListen = {
  get: (ln, type) => (tgt, fn, opts) => ln(tgt, type, fn, opts)
}

export const on = new Proxy(listen.bind(null, false), infinifyListen)
export const once = new Proxy(listen.bind(null, true), infinifyListen)
export const EventManager = curry(listen, 3)
