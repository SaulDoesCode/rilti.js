{ /* global rilti */
  const {component, dom: {header, section, div, h2}, isFunc, each, model, prime} = rilti
  component('tab-component', {
    props: {
      model: el => model({
        views: model(),
        head: header({$: el}),
        view: section({$: el})
      }),
      accessors: {
        activeView: ({model: {active, views}}) => views(active),
        active: {
          get: ({model: {active}}) => active,
          set (el, name) {
            const M = el.model
            M.async.ready.then(() => {
              if (M.active !== name && M.views.has(name)) {
                const view = M.views(name)
                M.active = name
                M.activeView = view
                el.emit('active', view)
                M.emit.active(name, view)
                M.emit['active:' + name](view)
              }
            })
          }
        }
      }
    },
    mount (el) {
      const M = el.model
      const V = M.views
      each(el.tabs, (tab, name) => {
        const active = tab.active
        const view = prime(tab.view || tab)
        V(name, view)
        isFunc(active) && M.on['active:' + name](active)

        div({$: M.head, onclick () { el.active = name }}, name)
      })
      delete el.tabs

      el.heading && M.head.prepend(
        el.heading = h2(el.heading)
      )

      M.on.active((name, view) => {
        M.view.children = view
        el.attr.active = name
        each(M.head.$children, n => n.class('active', n.txt === name))
      })
      M.ready = true
    }
  })
}
