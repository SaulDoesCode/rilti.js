{
  /* global rilti Prism */
  const {dom, isFunc} = rilti
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

const dbFunc = demo => {
  const {dom: {label, input}, model} = rilti
  const m = model({msg: 'type something...'})

  demo.append(
    m.sync.msg(
      input({attr: {type: 'text'}})
    ),
    label(m.sync.text.msg)
    // ^- text-node child synced to M.txt
  )
}

  makeExample({
    title: 'Data binding',
    example: 'databinding',
    func: dbFunc
  })

const modelEventsFunc = demo => {
  const {dom: {button}, model} = rilti
  const m = model({clicks: 0})

  button({
    render: demo,
    on_click: e => ++m.clicks
  },
    'clicks: ',
    m.sync.text.clicks
  )
}

  makeExample({
    title: 'Model Events: click counter',
    example: 'model-events',
    func: modelEventsFunc
  })
}
