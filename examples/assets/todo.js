{ /* global localStorage rilti */
  const {dom, domfn: {attr, emit, mutate}, on, model, component} = rilti
  const {span, aside, button, header, input} = dom

  const todos = model(localStorage.getItem('todos'))

  const todoCount = () => {
    const all = todos.size
    let done = 0
    todos.each(val => val && done++)
    return {all, done, undone: all - done}
  }

  const updateStorage = () => {
    localStorage.setItem('todos', todos.toJSONArray())
    todos.emit.update(todoCount())
  }
  todos.on.set(updateStorage)
  todos.on.delete(updateStorage)

  const tickBox = component('tick-box', {
    create (el) {
      on.click(el, e => {
        el.ticked = !el.ticked
      })
    },
    attr: {
      ticked: {
        prop: { bool: true },
        update (el) { emit(el, 'ticked', el.ticked) }
      }
    }
  })

  component('todo-list', {
    create (el) {
      const tdMaker = header({render: el})

      const todoSubmit = (txt = tdInput.value.trim(), state = false) => {
        if (!(txt && txt.length)) return
        dom['todo-item']({render: el, attr: {state}}, txt)
        todos.emit.newTodo()
      }

      todos.each((val, key) => todoSubmit(key, val))

      const tdInput = input({
        render: tdMaker,
        attr: {type: 'text'},
        on_keydown: ({keyCode}) => keyCode === 13 && todoSubmit()
      })

      todos.on.newTodo(() => {
        tdInput.value = ''
      })

      button({
        render: tdMaker,
        class: 'green-btn',
        on_click: e => todoSubmit()
      },
        'add todo'
      )

      const setMode = mode => () => {
        attr(el, {mode})
        localStorage.setItem('todo-mode', mode)
      }

      const [allCount, doneCount, undoneCount] = ['all', 'done', 'undone']
      .map(mode => span({ on_click: setMode(mode) }))

      const populateCounts = ({all, done, undone} = todoCount()) => {
        allCount.textContent = 'all: ' + all
        doneCount.textContent = 'done: ' + done
        undoneCount.textContent = 'undone: ' + undone
      }

      setMode(localStorage.getItem('todo-mode') || 'all')()
      populateCounts()
      todos.on.update(populateCounts)

      aside({renderAfter: tdMaker}, allCount, doneCount, undoneCount)
    }
  })

  component('todo-item', {
    props: {
      accessors: {
        txt (el, val) {
          if (val === undefined) return el.txt_el ? el.txt_el.textContent.trim() : ''
          if (val !== el.txt) {
            if (el.txt_el) {
              el.txt_el.textContent = val = ('' + val).trim()
              el.update()
            } else {
              on.mount(el, e => { el.txt = val })
            }
          }
        }
      }
    },
    methods: {
      del (el) {
        el.remove()
        todos.del([el.txt, el.oldtxt], true)
        updateStorage()
      },
      update (el) {
        const {txt, state, oldtxt} = el
        if (txt && txt !== 'add todo text') {
          if (txt !== oldtxt) {
            todos.del(oldtxt)
            el.oldtxt = txt
          }
          todos(txt, state)
        }
        el.tick_el.ticked = state
      }
    },
    create (el) {
      el.del_el = span({class: 'delete-todo', on_click: el.del}, '✕')

      el.txt_el = span({
        class: 'txt',
        attr: {contenteditable: true},
        on_input: el.update
      })

      el.tick_el = tickBox({
        on_ticked (e, {ticked}) { el.state = ticked }
      })
    },
    mount (el) {
      el.oldtxt = el.textContent || 'add todo text'
      if (!el.txt) {
        el.txt_el.textContent = el.oldtxt
      }
      mutate(el, {children: [el.del_el, el.txt_el, el.tick_el]})
    },
    destroy (el) { el.del() },
    attr: {
      state: {
        prop: { bool: true },
        update: el => el.update()
      }
    }
  })
}
