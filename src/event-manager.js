/* global Node NodeList */
import {clone, assign, isObj, isArr, isStr, curry, queryAll} from './common.js'
import $ from './proxy-node.js'

const listen = function (once, target, type, fn, options = false) {
  if (isStr(target)) target = queryAll(target)
  if ((isArr(target) || target instanceof NodeList) && target.length === 1) {
    target = target[0]
  }

  if (isArr(target) ? !target.length : !target.addEventListener) {
    throw new Error('nil/empty event target(s)')
  }

  let typeobj = isObj(type)
  if (type == null || !(typeobj || isStr(type))) {
    throw new TypeError('cannot listen to nil or invalid event type')
  }

  if (isArr(target)) {
    for (let i = 0; i < target.length; i++) {
      target[i] = listen(once, target[i], typeobj ? clone(type) : type, fn, options)
    }
    target.off = () => {
      for (const h of target) h()
      return target
    }
    target.on = mode => {
      for (const h of target) h.on(mode)
      return target
    }
    return target
  }

  if (typeobj) {
    for (const name in type) {
      type[name] = listen(once, target, name, type[name], options)
    }
    return type
  }

  if (target instanceof Node && !options.proxy) target = $(target)

  let wrapper
  if (typeof fn === 'string' && options instanceof Function) {
    let matcher = fn
    fn = options
    options = arguments[5]
    if (options == null) options = false
    wrapper = function (event) {
      if (
        event.target != null &&
        event.target !== this &&
        event.target.matches(matcher)
      ) {
        fn.call(this, event, target)
        if (off.once) off()
      }
    }
  } else {
    wrapper = function (event) {
      fn.call(this, event, target)
      if (off.once) off()
    }
  }

  const on = mode => {
    if (mode != null && mode !== off.once) off.once = !!mode
    target.addEventListener(type, wrapper, options)
    off.ison = true
    return off
  }

  const off = assign(() => {
    target.removeEventListener(type, wrapper)
    off.ison = false
    return off
  }, {target, on, once})
  off.off = off

  return on()
}

const infinifyListen = {
  get: (ln, type) => (tgt, fn, opts) => ln(tgt, type, fn, opts)
}

export const on = new Proxy(listen.bind(null, false), infinifyListen)
export const once = new Proxy(listen.bind(null, true), infinifyListen)
export const EventManager = curry(listen, 3)
