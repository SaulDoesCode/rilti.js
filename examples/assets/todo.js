{
  const {dom,domfn,on,once,model,component,run} = rilti
  const {div,span,a,aside,article,button,header,input,main,p,b,html} = dom
  const {attr, attrToggle, css, emit} = domfn
  const tickBox = dom['tick-box']

  const strBool = str => {
    if (str === true || str === false) return str
    return str !== 'false'
  }

  component('tick-box', {
    props: {
      get ticked() { return strBool(attr(this, 'ticked')) },
      set ticked(val) {
        if ((val = strBool(val)) !== this.ticked) {
          attr(this, 'ticked', val)
        }
      }
    },
    create: el => on.click(el, () => el.ticked = !el.ticked),
    attr: {
      ticked: {
        update(el) {
          emit(el, 'ticked', el.ticked)
        }
      }
    }
  })

  var todos = model(JSON.parse(localStorage.getItem('todos') || '{}'))
  const updateStorage = () => {
    localStorage.setItem('todos', todos.toJSON())
  }
  todos.on.set(updateStorage)
  todos.on.delete(updateStorage)

  component('todo-list',  {
    create(el) {
      const tdMaker = header({render: el})

      const todoSubmit = (txt = tdInput.value, state = false) => {
        dom['todo-item']({
          render: el,
          attr: {state}
        }, txt)
        todos.emit.newTodo()
      }

      todos.each((val, key) => todoSubmit(key, val))

      const tdInput = input({
        render: tdMaker,
        attr: {
          type: 'text'
        },
        on: {
          keydown({keyCode}) {
            if (keyCode === 13) {
              todoSubmit()
            }
          }
        }
      })

      todos.on.newTodo(() => tdInput.value = '')

      const tdSubmitBtn = button({
        render: tdMaker,
        on: {
          click: () => todoSubmit()
        }
      },
        'add todo'
      )

    }
  })

  component('todo-item', {
    props: {
      get state() { return strBool(attr(this, 'state')) },
      set state(val) {
        if ((val = strBool(val)) !== this.state) {
          attr(this, 'state', val)
        }
      },
      set txt(val)  {
        if (val !== this.txt) {
          if (this.txt_el) {
            this.txt_el.textContent = val = (''+val).trim()
            this.update()
          } else {
            on.mount(this, () => this.txt = val)
          }
        }
      },
      get txt() {
        return this.txt_el ? this.txt_el.textContent.trim() : ''
      }
    },
    create(el) {

      el.del = () => {
        el.remove()
        todos.del(el.txt)
        todos.del(el.oldtxt)
      }
      el.update = () => {
        const {txt, state, oldtxt} = el
        if (txt && txt !== 'add todo text') {
          if (txt !== oldtxt) {
            todos.del(oldtxt)
            el.oldtxt = txt
          }
          todos[txt] = state
        }
        el.tick_el.ticked = state
      }

      el.del_el = span({
        class: 'delete-todo',
        on: { click: el.del }
      }, '✕')

      el.txt_el = span({
        class: 'txt',
        attr: { contenteditable: true },
        on: { input: el.update }
      })

      el.tick_el = tickBox({
        attr: { ticked: el.state },
        on: {
          ticked() {
            el.state = el.tick_el.ticked
          }
        }
      })

    },
    mount(el) {
      el.oldtxt = el.textContent || 'add todo text'
      if (!el.txt) {
        el.txt_el.textContent = el.oldtxt
      }
      el.innerHTML = ''
      el.append(el.del_el, el.txt_el, el.tick_el)
      el.update()
    },
    destroy(el) {
      el.del()
    },
    attr: {
      state: {
        update(el) { el.update() }
      }
    }
  })

}
