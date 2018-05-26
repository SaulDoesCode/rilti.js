{ /* global rilti */
  const {directive, runAsync, $, isRenderable, isProxyNode, isFunc, isStr, on, render} = rilti

  const routes = new Map()
  routes.viewBinds = new Map()
  routes.activeBinds = new Map()

  const route = (name, consumer) => {
    if (name[0] !== '#') name = '#' + name

    if (isRenderable(consumer)) {
      if (consumer.tagName === 'TEMPLATE') {
        const template = consumer
        consumer = Array.from(consumer.content.childNodes)
        template.remove()
      }
      if (routes.has(name)) {
        routes.get(name).view = consumer
      } else {
        routes.set(name, {name, view: consumer})
      }
    } else if (isFunc(consumer)) {
      if (!routes.has(name)) routes.set(name, {name, consumers: new Set()})
      routes.get(name).consumers.add(consumer)
    }
    runAsync(() => route.activate())
  }
  route.viewbind = (name, host) => {
    if (!isStr(name) && !host) [host, name] = [name, false]
    if (host.tagName === 'TEMPLATE') return
    if (!isProxyNode(host)) host = $(host)
    const viewbind = (route, active) => {
      host.textContent = ''
      if ('view' in route && active) render(route.view, host)
    }
    viewbind.revoke = () => {
      if (name) {
        routes.get(name).consumers.delete(viewbind)
        routes.viewBinds.delete(host)
      } else if (routes.activeBinds.has(host)) {
        routes.activeBinds.delete(host)
      }
    }
    if (name) {
      route(name, viewbind)
      routes.viewBinds.set(host, viewbind)
    } else {
      routes.activeBinds.set(host, viewbind)
    }
    route.activate()
    return viewbind
  }
  route.revoke = name => {
    const route = routes.get(name)
    if (route) {
      if (route.consumers && route.consumers.size) {
        route.consumers.forEach(consumer => {
          if (consumer.revoke) consumer.revoke()
        })
        route.consumers.clear()
      }
      route.view = undefined
      route.consumers = undefined
      route.name = undefined
      routes.delete(name)
    }
  }

  route.activate = (name = window.location.hash || '#') => {
    if (name[0] !== '#') name = '#' + name
    if (!routes.has(name) || name === routes.active) return
    if (name !== window.location.hash || '#') window.location.hash = name
    const route = routes.get(name)
    if (route && route.consumers && route.consumers.size) {
      route.consumers.forEach(consume => consume(route, true, name))
    }
    if (routes.activeBinds.size) {
      routes.activeBinds.forEach(bind => bind(route, true, name))
    }
    if (routes.active !== undefined) {
      const oldroute = routes.get(routes.active)
      if (oldroute.consumers && oldroute.consumers.size) {
        oldroute.consumers.forEach(consumer => {
          consumer(oldroute, false, routes.active)
        })
      }
    }
    routes.active = name
  }

  const removeVbindRoute = el => {
    const vbind = routes.viewBinds.get(el)
    if (vbind) vbind.revoke()
  }

  directive('route', {
    init (el, val) {
      el.tagName === 'TEMPLATE' ? route(val, el) : route.viewbind(val, el)
    },
    update (el, val) {
      removeVbindRoute(el)
      route.viewbind(val, el)
    },
    remove: removeVbindRoute
  })

  directive('route-active', {
    init: el => route.viewbind(el),
    remove: removeVbindRoute
  })

  on.hashchange(window, e => route.activate())
}
