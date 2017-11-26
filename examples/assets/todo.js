{
  const {dom,domfn,on,once,model,component,run} = rilti
  const {div,span,a,aside,article,header,input,main,p,b,html} = dom
  const {attrToggle, css, emit} = domfn
  const tickBox = dom['tick-box']

  var todos = model(JSON.parse(localStorage.getItem('todos') || '{}'))
  todos.on.set(() => {
    localStorage.setItem('todos', todos.toJSON())
  })

  component('tick-box', {
    props: {
      set ticked(val) {
        val = Boolean(val)
        if (val !== this.ticked) {
          attrToggle(this, 'ticked', val)
          emit(this, 'ticked', val)
        }
      },
      get ticked() {
        return this.hasAttribute('ticked') && this.getAttribute('ticked') !== 'false'
      }
    },
    attr: {
      ticked: {
        init(el, val) { el.ticked = val },
        destroy(el) { el.ticked = false },
        update(el, val) {
          if (val === 'false' || val !== 'true') {
            el.removeAttribute('ticked')
            emit(el, 'ticked', false)
          }
        }
      }
    },
    create(el) {
      on.click(el, () => el.ticked = !el.ticked)
    }
  })

  component('todo-item', {
    props: {
      get state() {
        return this.tick_el.ticked
      },
      set state(val) {
        if (val !== this.state) {
          this.tick_el.ticked = val
          this.update()
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

      el.update = () => {
        const {txt, state, oldtxt} = el
        if (txt && txt !== 'add todo text') {
          if (txt !== oldtxt) {
            todos.del(oldtxt)
            el.oldtxt = txt
          }
          todos[txt] = state
        }
        attrToggle(el, 'state', state)
      }

      el.txt_el = span({
        attr: { contenteditable: true },
        on: { input: el.update }
      })

      el.tick_el = tickBox({
        on: { ticked: el.update }
      })

    },
    mount(el) {
      el.oldtxt = el.textContent || 'add todo text'
      if (!el.txt) {
        el.txt_el.textContent = el.oldtxt
      }
      el.innerHTML = ''
      el.append(el.txt_el, el.tick_el)
    },
    destroy({txt}) {
      todos.del(txt)
    }
  })

  todos.each((val, key) => {
    dom['todo-item']({
      render: 'todo-list',
      props: { state: val }
    }, key)
  })
}
