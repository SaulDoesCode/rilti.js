{ /* global localStorage rilti */
  const {dom, domfn: {attr, emit, mutate}, on, notifier, component} = rilti
  const {span, aside, button, header, input} = dom

  const todos = notifier(new Map(JSON.parse(localStorage.getItem('todos') || '[]')))

  const strBool = str => (
    str === true || str === false ? str : str !== 'false'
  )

  const tickBox = component('tick-box', {
    props: {
      get ticked () { return strBool(attr(this, 'ticked')) },
      set ticked (ticked) { attr(this, {ticked}) }
    },
    create (el) {
      on.click(el, e => { el.ticked = !el.ticked })
    },
    attr: {
      ticked: {
        update (el) { emit(el, 'ticked', el.ticked) }
      }
    }
  })

  const todoCount = () => {
    const all = todos.size
    let done = 0
    todos.forEach(val => val && done++)
    return {all, done, undone: all - done}
  }

  const updateStorage = () => {
    localStorage.setItem('todos', JSON.stringify(Array.from(todos.entries())))
    todos.emit.update(todoCount())
  }
  todos.on.set(updateStorage)
  todos.on.delete(updateStorage)

  component('todo-list', {
    create (el) {
      const tdMaker = header({render: el})

      const todoSubmit = (txt = tdInput.value.trim(), state = false) => {
        if (!(txt && txt.length)) return
        dom['todo-item']({render: el, attr: {state}}, txt)
        todos.emit.newTodo()
      }

      todos.forEach((val, key) => todoSubmit(key, val))

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
      get state () { return strBool(attr(this, 'state')) },
      set state (state) { attr(this, {state}) },
      set txt (val) {
        if (val !== this.txt) {
          if (this.txt_el) {
            this.txt_el.textContent = val = ('' + val).trim()
            this.update()
          } else {
            on.mount(this, e => (this.txt = val))
          }
        }
      },
      get txt () {
        return this.txt_el ? this.txt_el.textContent.trim() : ''
      }
    },
    create (el) {
      el.del = () => {
        el.remove()
        todos.delete(el.txt)
        todos.delete(el.oldtxt)
        updateStorage()
      }
      el.update = () => {
        const {txt, state, oldtxt} = el
        if (txt && txt !== 'add todo text') {
          if (txt !== oldtxt) {
            todos.delete(oldtxt)
            el.oldtxt = txt
          }
          todos.set(txt, state)
          updateStorage()
        }
        el.tick_el.ticked = state
      }

      el.del_el = span({class: 'delete-todo', on_click: el.del}, '✕')

      el.txt_el = span({
        class: 'txt',
        attr: {contenteditable: true},
        on_input: el.update
      })

      el.tick_el = tickBox({
        attr: {ticked: el.state},
        on_ticked () {
          el.state = el.tick_el.ticked
        }
      })
    },
    mount (el) {
      el.oldtxt = el.textContent || 'add todo text'
      if (!el.txt) {
        el.txt_el.textContent = el.oldtxt
      }
      mutate(el, {children: [el.del_el, el.txt_el, el.tick_el]})
      el.update()
    },
    destroy (el) { el.del() },
    attr: {
      state: {
        update (el) { el.update() }
      }
    }
  })
}
