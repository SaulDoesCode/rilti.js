{ /* global rilti */
  const {component, dom: {prime, header, section, div, h2}, domfn: {mutate, Class, emit}, isFunc, each, model} = rilti
  component('tab-component', {
    props: {
      accessors: {
        active: {
          get: ({controller: {active}}) => active,
          async set (el, name) {
            const M = el.model
            await M.async.ready
            if (M.active !== name && M.views.has(name)) {
              const view = M.views(name)
              M.active = name
              M.activeView = view
              emit(el, 'active', view)
              M.emit.active(name, view)
              M.emit['active:' + name](view)
            }
          }
        },
        activeView: ({model: {active, views}}) => views(active)
      }
    },
    create (el) {
      el.model = model({
        views: model(),
        head: header({$: el}),
        view: section({$: el})
      })
    },
    mount (el) {
      const M = el.model
      const V = M.views
      each(el.tabs, (tab, name) => {
        const active = tab.active
        const view = prime(tab.view || tab)
        V(name, view)
        isFunc(active) && M.on['active:' + name](active)

        div({
          $: M.head,
          onclick () { el.active = name }
        },
          name
        )
      })
      delete el.tabs

      if (el.heading) {
        M.head.prepend(
          el.heading = h2(el.heading)
        )
      }

      M.on.active((name, view) => {
        mutate(M.view, {inner: view})
        mutate(el, {attr: {active: name}})
        each(M.head.children, n => {
          Class(n, 'active', n.textContent === name)
        })
      })
      M.ready = true
    }
  })
}
