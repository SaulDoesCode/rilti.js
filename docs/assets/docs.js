{ /* global rilti Prism */
  const {dom, domfn: {attr, Class, mutate}, each, component, on, model, isFunc} = rilti
  const {body, h2, h4, header, nav, article, section, main, div, span, p, pre, html} = dom

  const rtabs = dom['rilti-tabs']

  var hub = model()

  const exampleSection = section({id: 'examples'})

  var example = (name, desc, code, style) => {
    const exmpl = article(
      {class: 'example'},
      header(
        div(name),
        p(desc)
      ),
      rtabs({
        class: 'example-tab',
        props: {
          tabs: [
            ['demo', [dom['style'](style), code(rilti)]],
            ['code', example.src({code})],
            ['style', example.src({code: style, langauge: 'css'})]
          ]
        }
      })
    )
    exampleSection.appendChild(exmpl)
  }

  example.src = ({code, options = {}, language = 'javascript'}) => pre(
    Object.assign({class: 'language-' + language}, options),
    dom.code(
      {class: 'language-' + language},
      () => {
        if (isFunc(code)) code = code.toString()
        const markup = Prism.highlight(code.trim(), Prism.languages[language])
        return html(markup)
      }
    )
  )

  const tabs = rtabs({
    id: 'page-nav',
    render: 'body',
    props: {header: h2('rilti.js')}
  })

  tabs
  .make({
    name: 'examples',
    view: [
      h2('Live rilti examples'),
      exampleSection
    ],
    active (tab) {
      console.log(tab)
    }
  })
  .make({
    name: 'overview',
    view: `rilti, the future forward frontend framework`
  })
  .make({
    name: 'docs',
    view: 'Where the documentation will eventually live.'
  })
}

example(
'Click Counting Button',
'A simple button that counts up every time you click on it.',
({dom: {button}, model} = rilti) => {
  const m = model({clicks: 0})

  return button({
    class: 'counter',
    on_click: e => ++m.clicks
  },
    'clicks: ', m.sync.text.clicks
  )
},
`
.counter {
  outline: none;
  margin: 10px;
  padding: 6px;
  border-radius: 2px;
  border: 1px solid crimson;
  background: #fff;
  min-width: 100px;
  font-size: 1.2em;
  color: crimson;
  cursor: pointer;
  transition: all 120ms ease;
}
.counter:hover, .counter:active {
  background: crimson;
  text-shadow: 0 2px 3px rgba(0,0,0,.12);
  color: #fff;
}`
)
