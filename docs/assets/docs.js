{
  const {dom, domfn: {Class}, on, component, model, route} = rilti
  const {h2, header, footer, nav, aside, section, main, div, span} = dom

  var hub = model()

  const activeSectionTxt = span('domfn')
  hub.sync(activeSectionTxt, 'textContent', 'activeSection')

  const menu = nav({
    class: 'nav-bar'
  })

  header({
    render: 'body'
  },
    h2('rilti: ', activeSectionTxt),
    menu
  )

  const display = {
    host: main({
      render: 'body',
      class: 'display'
    }),
    get active () {
      if (hub.activeView) return {
        name: hub.activeSection,
        view: hub.activeView
      }
    },
    set active ({name: activeSection, view: activeView}) {
      hub({activeSection, activeView})
    },
    views: new Map(),
    view (name, view, activate = true) {
      if (view) {
        view.btn = div({
          render: menu,
          class: 'nav-btn',
          on: { click: e => display.view(name) }
        },
          name
        )
        display.views.set(name, view)
      }
      const lastActive = display.active
      if (!activate || (lastActive && lastActive.name === name)) return
      view = display.views.get(name)
      display.host.innerHTML = ''
      display.host.appendChild(view)
      if (lastActive) {
        display.lastActive = lastActive
        Class(lastActive.view.btn, 'active', false)
      }
      Class(view.btn, 'active', true)
      display.active = {name, view}
      hub.emit['view:' + name]()
    }
  }

  display.view('docs', section({
    class: 'docs-view'
  },
    `docs view`
  ))
}
