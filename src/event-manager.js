import {curry, query, isFunc, isEl, isObj, isStr} from './common.js'
import $ from './proxy-node.js'

export const EventManager = curry((once, target, type, handle, options = false) => {
  if (isStr(target)) target = query(target)
  if (isObj(type)) {
    for (const name in type) {
      type[name] = EventManager(once, target, name, type[name], options)
    }
    return type
  }
  if (!isFunc(handle)) return EventManager.bind(undefined, once, target, type)

  handle = handle.bind(target)
  const proxiedTarget = isEl(target) ? $(target) : target

  const handler = evt => {
    handle(evt, proxiedTarget)
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
    on: add,
    off: remove,
    once: add.bind(undefined, true),
    emit (type, detail) {
      target.dispatchEvent(new window.CustomEvent(type, {detail}))
      return manager
    }
  }

  return add(once)
}, 3)

// Event Manager Proxy Configuration
const EMPC = {
  get: (fn, type) => (tgt, hndl, opts) => fn(tgt, type, hndl, opts)
}
export const once = new Proxy(EventManager(true), EMPC)
export const on = new Proxy(EventManager(false), EMPC)
