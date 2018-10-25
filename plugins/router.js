{ /* global rilti location */
  const { directive, emitter, run, isRenderable, isFunc } = rilti

  const route = emitter((route, view) => {
    if (view == null) return
    if (route[0] !== '#') route = '#' + route

    if (view.tagName === 'TEMPLATE') {
      view.remove()
      view = [...view.content.childNodes]
    }

    if (isRenderable(view)) {
      views[route] = isFunc(view) ? view() : view
    }
  })
  const views = route.views = Object.create(null)
  route.hash = () => location.hash.substr(1)

  directive('route-link', {
    init (el, val) {
      el.routeLink = route.on.change(() => {
        el.class['active-route'] = location.hash === (el.href = '#' + el.attr['route-link'])
      })
      el.class['active-route'] = location.hash === (el.href = '#' + val)
    },
    remove: (el, val) => el.routeLink.off()
  })

  directive('route', {
    init (el, val) {
      if (el.tagName === 'TEMPLATE') {
        route(val, el)
      } else {
        el.routeHandler = route.on.change((view, hash) => {
          if (hash === el.attr.route) el.html = view
          else el.textContent = ''
        })
      }
    },
    remove (el, val) {
      if (el.routeHandler) {
        el.routeHandler.off()
        el.textContent = ''
      }
    }
  })

  directive('route-active', {
    init (el, val) {
      el.routeHandler = route.on.change((view, hash) => {
        el.attr['route-active'] = hash
        el.html = view
      })
    },
    remove (el, val) {
      el.routeHandler.off()
      el.textContent = ''
    }
  })

  rilti.route = route
  route.handle = () => {
    const view = route.views[location.hash]
    if (view == null) return
    route.active = view
    const hash = route.hash()
    route.emit.change(view, hash, route)
    route.emit[hash](view, route)
  }

  window.onhashchange = route.handle
  run(() => route.handle())
}
