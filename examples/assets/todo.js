{
  const {dom,domfn,on,once,model,component,run} = rilti
  const {div,span,a,aside,article,header,input,main,p,b,html} = dom
  const {attrToggle, css, emit} = domfn

  var todos = model(JSON.parse(localStorage.getItem('todos') || '{}'))
  todos.on.set(() => {
    localStorage.setItem('todos', todos.toJSON())
  })

  component('tick-box', {
    props: {
      set ticked(val) {
        val = Boolean(val)
        if (val != this.ticked) {
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
        init(el, val) {
          el.ticked = val
        },
        update(el, val) {
          el.ticked = val
        },
        destroy(el) {
          el.ticked = false
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
          todos.del(this.txt)
          this.txt_el.textContent = (''+val).trim()
          this.update()
        }
      },
      get txt() {
        return this.txt_el ? this.txt_el.textContent.trim() : ''
      }
    },
    create(el) {

      el.update = () => {
        const {txt, state} = el
        if (txt && txt !== 'add todo text') {
          todos[txt] = state
        }
        attrToggle(el, 'state', state)
      }

      let txt = el.textContent || 'add todo text'
      el.txt_el = span({
        attr: {
          contenteditable: true
        },
        on: {
          input() {
            todos.del(txt)
            el.update()
            txt = el.txt
          }
        }
      })

      el.tick_el = dom['tick-box']()
      on.ticked(el.tick_el, el.update)
    },
    mount(el) {
      const txt = el.txt || el.textContent || 'add todo text'
      el.innerHTML = ''
      const {txt_el, tick_el} = el
      txt_el.textContent = txt
      el.append(txt_el, tick_el)
    },
    destroy({txt}) {
      todos.del(txt)
    }
  })

  todos.each((val, key) => {
    dom['todo-item']({
      render: 'todo-list',
      props: {
        state: val
      }
    },
      key
    )
  })

}
