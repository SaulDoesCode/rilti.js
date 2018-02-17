{ /* global rilti */
  const {
    component,
    model,
    each,
    extract,
    isArr,
    isObj,
    isNil,
    isStr,
    isMounted,
    dom: {header, article, span, html},
    domfn: {Class, hasClass}
  } = rilti

  component('rilti-tabs', {
    methods: {
      disable (el, name, disabled) {
        const tab = extract(el, `tabs.${name}.title`)
        if (tab) {
          tab.disabled = isNil(disabled) ? !tab.disabled : disabled
        }
      },
      build (el, {name, view, disabled = false}) {
        return {
          name,
          view: article(isStr(view) ? html(view) : view),
          title: span({
            props: {
              accessors: {
                disabled: {
                  set: (el, disabled) => Class(el, {disabled}),
                  get: el => hasClass(el, 'disabled')
                }
              }
            },
            class: {disabled},
            onclick: e => Reflect.set(el, 'active', name),
            get active () { return el.active === name },
            set active (state) {
              if (state) {
                el.active = name
                return
              }
              let chosen = false
              el.model.each((tab, title) => {
                if (title !== name && !chosen) {
                  el.active = title
                  chosen = true
                }
              })
            }
          },
            name
          )
        }
      },
      make (el, {name, view, disabled = false, active}) {
        el.model(name, el.build({name, view, disabled}))
        if (active) {
          el.model.on('active:' + name, active)
          const tab = el.model(name)
          if (tab.active) active(tab)
        }
        return el
      }
    },
    attr: {
      active: {
        prop: true,
        update (el, val, oldVal) {
          const tab = el.model(val)
          const oldtab = el.model(oldVal)
          if (oldtab) {
            Class(oldtab.title, 'active', false)
            oldtab.view.remove()
          }
          if (tab) {
            Class(tab.title, 'active', true)
            el.head.after(tab.view)
            el.model.emitSync.active(val, tab)
            el.model.emitSync('active:' + val, tab)
          }
        }
      }
    },
    create (el) {
      el.model = model()

      const whenReady = fn => {
        el.ready && el.head ? fn(el.head) : el.model.once.ready(fn)
      }

      const updateTabs = (name, tab) => {
        !isMounted(tab.title, el) && whenReady(head => {
          head.appendChild(tab.title)
        })
        if (el.model.size && !el.active) {
          el.active = el.model.toArray()[0][0]
        }
      }
      el.model.on.set(updateTabs)
    },
    mount (el) {
      if (!el.tabs) {
        el.children.length && each(el.children, template => {
          el.make({
            disabled: template.hasAttribute('disabled'),
            name: template.getAttribute('name'),
            view: template.content
          })
        })
      }

      el.innerHTML = ''
      el.appendChild(el.head = header())
      if (el.header) {
        el.head.prepend(el.header)
        delete el.header
      }
      el.ready = true
      el.model.emit.ready(el.head)

      if (isObj(el.tabs)) el.tabs = Object.entries(el.tabs)
      if (isArr(el.tabs)) {
        el.tabs.map(
          ([
            name,
            view,
            disabled = false
          ]) => !isNil(view) && el.model(
            name,
            el.build({name, view, disabled})
          )
        )
      }
      Reflect.deleteProperty(el, 'tabs')
    }
  })
}
