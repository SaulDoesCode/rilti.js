{ /* global rilti localStorage location */
  const {article, div, span, section, nav, button, input} = rilti.dom

  const store = new Map(JSON.parse(localStorage.getItem('todos') || '[]'))
  const stats = () => {
    let done = 0
    store.forEach(d => d && done++)
    return {all: store.size, done, undone: (store.size - done) || 0}
  }
  stats.populators = new Set()
  const save = () => {
    localStorage.setItem('todos', JSON.stringify(Array.from(store.entries())))
    const currentStats = stats()
    stats.populators.forEach(populate => populate(currentStats))
  }

  const filters = 'all done undone'.split(' ')
  const statFilters = filters.map(filter => {
    const populate = stats => { display.txt = `${filter}: ${stats[filter]} ` }
    const display = span({attr: {filter},
      onclick (e) { location.hash = filter }
    })
    populate(stats())
    stats.populators.add(populate)
    return display
  })
  const setFilter = () => {
    const hash = location.hash.substr(1)
    const filter = (filters.includes(hash) && hash) || (location.hash = 'all')
    todo.list.attr({filter})
    statFilters.forEach(f => { f.class.active = f.attr.filter === filter })
  }
  window.onhashchange = setFilter
  rilti.run(setFilter)

  const todo = {
    new: (val, done) => article.todo_item({
      render: todo.list,
      props: {
        accessors: {
          val (el, v) {
            if (val === v || v == null) return val
            store.delete(val)
            store.set(val = v, done)
            save()
          },
          done (el, d) {
            if (done === d || d == null) return done
            store.set(val, el.toggle.checked = done = d)
            save()
            el.attrToggle('done', done)
          }
        }
      },
      cycle: {
        create (el) {
          store.set(val, done)
          save()
          el.attrToggle('done', done)
        },
        unmount (el) {
          store.delete(val)
          save()
        }
      }
    },
    el => [
      button({onclick: e => el.remove()}, 'X'),
      span({attr: {contenteditable: true},
        oninput (e, {txt}) { el.val = txt.trim() }
      }, val),
      (el.toggle = span.toggle({
        class: {checked: done},
        props: {
          accessors: {
            checked: (el, checked) => checked == null
              ? el.class.checked : el.class({checked})
          }
        },
        onclick (e, toggle) { el.done = toggle.checked = !toggle.checked }
      }))
    ]
    ),
    maker: nav.maker({
      render: 'body',
      methods: {
        make ({$children: [{clear, txt}]}) {
          if ((txt = txt.trim()).length && !store.has(txt)) {
            todo.new(txt, false)
            clear().blur()
          }
        }
      }
    },
    input({onkeydown: ({keyCode}) => keyCode === 13 && todo.maker.make()}),
    button({onclick: () => todo.maker.make()}, 'add')
    ),
    list: section.list({$: 'body'}, div.stats(statFilters))
  }

  store.forEach((done, val) => todo.new(val, done))
}
