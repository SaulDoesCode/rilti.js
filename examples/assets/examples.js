{
  /* global rilti Prism */
  const {dom, run, isFunc} = rilti
  const {pre, code, section, article, footer, header, html} = dom

  const highlight = source => pre({
    class: 'language-javascript code-toolbar'
  },
    code({
      class: 'language-javascript'
    },
      html(
        Prism.highlight(
          isFunc(source) ? source.toString().trim() : source.trim(),
          Prism.languages.javascript
        )
      )
    )
  )

  const makeExample = ({title, func, example}) => {
    section({
      render: 'body',
      class: 'box',
      attr: {example}
    },
      header(title),
      article({
        class: 'box-body',
        cycle: { mount: func }
      }),
      footer(
        highlight(func)
      )
    )
  }

const dbFunc = container => {
  const {dom: {label, input}, model} = rilti
  const M = model({txt: 'type something...'})

  const display = label({render: container})
  M.sync(display, 'innerText', 'txt')

  input({
    render: container,
    attr: {
      type: 'text',
      value: M.txt
    },
    on: {
      input (e, element) { M.txt = element.value.trim() }
    }
  })
}

  makeExample({
    title: 'Data binding',
    example: 'databinding',
    func: dbFunc
  })

const modelEventsFunc = container => {
  const {dom: {span, button}, model} = rilti
  const M = model()

  const counter = (countType, count, render) => span({
    render,
    class: 'counter',
    props: {
      countType,
      set count (val) {
        this.textContent = `
          ${this.countType} count: ${count = val}`
      },
      get count () { return count }
    },
    cycle: {
      create (counter) { counter.count = count }
    }
  })

  const clickCounter = counter('click', 0, container)

  M.on.countUpdate(count => {
    clickCounter.count = count
  })

  button({
    render: container,
    props: { clicks: 0 },
    on: {
      click () {
        M.emit.countUpdate(++this.clicks)
      }
    }
  },
    `emit countUpdate`
  )
}

  makeExample({
    title: 'Model Events: click counter',
    example: 'model-events',
    func: modelEventsFunc
  })
}
