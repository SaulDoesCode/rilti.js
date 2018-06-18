/* global Node */
import {isObj, isArr, isStr, curry, queryAll} from './common.js'
import $ from './proxy-node.js'

const listen = (once, target, type, fn, options = false) => {
  if (isStr(target) && (target = queryAll(target)).length === 1) {
    target = target[0]
  }

  if (!target.addEventListener || (isArr(target) && !target.length)) {
    throw new Error('nil/empty event target(s)')
  }

  let typeobj = isObj(type)
  if (type == null || !(typeobj || isStr(type))) {
    throw new TypeError('cannot listen to nil or invalid event type')
  }

  if (isArr(target)) {
    for (let i = 0; i < target.length; i++) {
      target[i] = listen(
        once, target, typeobj ? Object.assign({}, type) : type, fn, options
      )
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

  function wrapper () {
    fn.call(this, ...arguments, target)
    if (off.once) off()
  }

  const on = mode => {
    if (mode != null && mode !== off.once) off.once = !!mode
    target.addEventListener(type, wrapper, options)
    off.ison = true
    return off
  }
  const off = Object.assign(() => {
    target.removeEventListener(type, wrapper)
    off.ison = false
  }, {target, listen: on, once})
  off.off = off

  return on()
}

const infinifyListen = {
  get: (ln, type) => (tgt, fn, opts) => ln(tgt, type, fn, opts)
}

export const on = new Proxy(listen.bind(null, false), infinifyListen)
export const once = new Proxy(listen.bind(null, true), infinifyListen)
export const EventManager = curry(listen, 3)
