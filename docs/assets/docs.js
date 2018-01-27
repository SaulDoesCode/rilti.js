{
  /* global rilti Prism */
  const {dom, domfn: {Class}, component, on, model} = rilti
  const {h2, header, nav, article, section, main, div, span, p, pre, code, html} = dom

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
      if (hub.activeView) {
        return {name: hub.activeSection, view: hub.activeView}
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

  const docView = section({class: 'doc-view'})
  display.view('docs', docView)

  const doc = (name, {short, intake, demo}) => {
    const demoCode = demo.toString().trim().slice(7).trim().slice(0, -1).trim()
    article({
      render: docView,
      class: 'doc'
    },
      header(
        div(name),
        pre(code(intake))
      ),
      section(
        p(short),
        pre({
          class: 'language-javascript'
        },
          code(html(Prism.highlight(demoCode, Prism.languages.javascript)))
        ),
        demo()
      )
    )
  }

  doc('component', {
    intake: '(tagName String, conf Object) -> dom[tagName] func',
    short: 'define behaviours and characteristics of custom elements',
    demo: el => {
const todoItem = component('todo-item', {
  props: {
    set done (state) {
      if (state === this.done) return
      this.setAttribute('done', state)
    },
    get done () { return this.getAttribute('done') === 'true' }
  },
  mount (el) {
    on.click(el, e => { el.done = !el.done })
    el.prepend(span())
  }
})

return todoItem('Write more docs')
    }
  })
}
