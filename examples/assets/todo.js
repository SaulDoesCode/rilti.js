{ /* global rilti localStorage location */
  const {dom: {article, div, span, section, nav, button, input}, isDef} = rilti

  const store = rilti.model(localStorage.getItem('todos'))
  const Stats = () => {
    let done = 0
    store.each((d, val) => d && done++)
    return {all: store.size, done, undone: (store.size - done) || 0}
  }
  const save = () => {
    localStorage.setItem('todos', store.toJSON())
    store.emit.stats(Stats())
  }
  store.on.set(save); store.on.delete(save)

  const filters = ['all', 'done', 'undone']
  const statFilters = filters.map(filter => {
    const populate = stats => { display.txt = `${filter}: ${stats[filter]} ` }
    const display = span({
      attr: {filter},
      onclick (e) { location.hash = filter }
    })
    populate(Stats())
    store.on.stats(populate)
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

  const stats = div({class: 'stats'}, statFilters)

  const todo = {
    new: (val, done) => article({
      render: todo.list,
      class: 'todo-item',
      props: {
        accessors: {
          val (el, v) {
            if (val === v || !isDef(v)) return val
            store.del(val)
            store(val = v, done)
          },
          done (el, d) {
            if (done === d || !isDef(d)) return done
            store(val, el.toggle.checked = done = d)
            el.attrToggle('done', done)
          }
        }
      },
      cycle: {
        create (el) {
          store(val, done)
          el.attrToggle('done', done)
        },
        unmount: el => store.del(val)
      }
    },
    el => button({onclick: e => el.remove()}, '❌'),
    el => span({
      attr: {contenteditable: true},
      oninput (e, {txt}) { el.val = txt.trim() }
    },
    val
    ),
    el => (el.toggle = span({
      class: {toggle: true, checked: done},
      props: {
        accessors: {
          checked (el, checked) {
            if (!isDef(checked)) return el.class.checked
            else el.class({checked})
          }
        }
      },
      onclick (e, toggle) { el.done = toggle.checked = !toggle.checked }
    })
    )),
    maker: nav({
      render: 'body',
      class: 'maker',
      methods: {
        make ({$children: [{clear, txt}]}) {
          if ((txt = txt.trim()).length && !store.has(txt)) {
            todo.new(txt, false)
            clear().blur()
          }
        }
      }
    },
    input({
      onkeydown: ({keyCode}) => keyCode === 13 && todo.maker.make()
    }),
    button({onclick: () => todo.maker.make()}, 'add')
    ),
    list: section({render: 'body', class: 'list'}, stats)
  }

  store.each((done, val) => todo.new(val, done))
}
