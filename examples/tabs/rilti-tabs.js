{ /* global rilti */
  const {
    component,
    model,
    each,
    extract,
    isNil,
    dom: {header, article, span, html},
    domfn: {mutate, Class, hasClass}
  } = rilti

  component('rilti-tabs', {
    methods: {
      disable (el, name, disabled) {
        const tab = extract(el, `tabs.${name}.title`)
        if (tab) {
          tab.disabled = isNil(disabled) ? !tab.disabled : disabled
        }
      }
    },
    attr: {
      active: {
        prop: true,
        update (el, val, oldVal) {
          const tab = el.tabs(val)
          const oldtab = el.tabs(oldVal)
          if (oldtab) {
            Class(oldtab.title, 'active', false)
            oldtab.view.remove()
          }
          if (tab) {
            Class(tab.title, 'active', true)
            el.head.after(tab.view)
          }
        }
      }
    },
    mount (el) {
      if (!el.tabs && el.children.length) {
        el.tabs = []
        each(el.children, template => {
          el.tabs.push([
            template.getAttribute('name'),
            template.content,
            template.hasAttribute('disabled')
          ])
        })
      }

      el.innerHTML = ''
      el.appendChild(el.head = header())

      el.tabs = model(
        el.tabs.map(
          ([
            name,
            view = '',
            disabled = false
          ]) => [name, {
            name,
            view: article(html(view)),
            title: span({
              props: {
                accessors: {
                  disabled: {
                    set: (el, disabled) => Class(el, {disabled}),
                    get: el => hasClass(el, 'disabled')
                  }
                }
              },
              render: el.head,
              class: {disabled},
              on_click () { el.active = name }
            },
              name
            )
          }]
        )
      )

      if (!el.active) el.active = el.tabs.toArray()[0][0]
    }
  })
}
