{
  /* global rilti Prism */
  const {dom, domfn: {attr, Class}, component, on, once, model} = rilti
  const {h2, h4, header, nav, article, section, main, div, span, p, pre, code, html} = dom

  var hub = model()

  const activeSectionTxt = span('domfn')
  hub.sync(activeSectionTxt, 'textContent', 'activeSection')

  const menu = nav({
    class: 'nav-bar'
  })

  header({
    render: 'body',
    id: 'site-header'
  },
    h2('rilti.js - ', activeSectionTxt),
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
        view.btn = span({
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

  const overview = article(`a future forward front-end framework with elm-like ideas about architecture`)
  display.view('overview', overview)

  const docViews = dom['doc-views']()
  display.view('docs', docViews)

  const doc = (name, {short, intake, demo}) => {
    const demoCode = demo.toString().trim().slice(9).trim().slice(0, -1).trim()
    const demoSection = div({class: 'demo'})
    demo(demoSection)
    dom['doc-view']({
      render: docViews,
      id: name
    },
      header(
        div(span(name), pre(code(intake))),
        p(short),
        demoSection
      ),
      section(
        pre({
          class: 'language-javascript'
        },
          code(html(Prism.highlight(demoCode, Prism.languages.javascript)))
        )
      )
    )
  }

  doc('.component', {
    intake: '(tagName String, conf Object) -> dom[tagName] func',
    short: 'define behaviours and characteristics of custom elements',
    demo: demo => {
const todoItem = component('todo-item', {
  props: {
    set done (state) {
      attr(this, 'done', state)
    },
    get done () {
      return attr(this, 'done') === 'true'
    }
  },
  mount (el) {
    const content = span(el.textContent)
    const toggleEdit = contenteditable => {
      attr(content, {contenteditable})
    }

    on.dblclick(content, e => toggleEdit(true))
    on.blur(content, e => toggleEdit())

    const toggle = span({class: 'toggle'})
    on.click(toggle, e => el.done = !el.done)

    el.innerHTML = ''
    el.append(toggle, content)
  }
})

todoItem({render: demo}, 'Write more docs')
    }
  })
}
