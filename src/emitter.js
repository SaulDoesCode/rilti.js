import {infinify} from './common.js'

export default (host = {}, listeners = new Map()) => Object.assign(host, {
  listeners,
  emit: infinify((event, ...data) => {
    if (listeners.has(event)) {
      for (const h of listeners.get(event)) {
        h.apply(undefined, data)
      }
    }
  }),
  emitAsync: infinify((event, ...data) => setTimeout(() => {
    if (listeners.has(event)) {
      for (const h of listeners.get(event)) {
        setTimeout(h, 0, ...data)
      }
    }
  }, 0), false),
  on: infinify((event, handler) => {
    if (!listeners.has(event)) listeners.set(event, new Set())
    listeners.get(event).add(handler)
    const manager = () => host.off(event, handler)
    manager.off = manager
    manager.on = () => {
      manager()
      return host.on(event, handler)
    }
    manager.once = () => {
      manager()
      return host.once(event, handler)
    }
    return manager
  }),
  once: infinify((event, handler) => host.on(event, function h () {
    handler(...arguments)
    host.off(event, h)
  })),
  off: infinify((event, handler) => {
    if (listeners.has(event)) {
      // ls = listener Set
      const ls = listeners.get(event)
      ls.delete(handler)
      if (!ls.size) listeners.delete(event)
    }
  })
})
