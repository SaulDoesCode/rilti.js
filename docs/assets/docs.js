{ /* global rilti hljs */
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
        span(desc)
      ),
      rtabs({
        class: 'example-tab',
        props: {
          tabs: {
            demo: div({
              class: 'demo-box',
              cycle: {create: code}
            },
              dom['style'](style)
            ),
            code: example.src({code}),
            style: example.src({code: style, language: 'css'})
          }
        }
      })
    )
    exampleSection.appendChild(exmpl)
  }

  example.src = ({code, options = {}, language = 'javascript'}) => pre(
    options,
    dom.code({
      class: `${language}`
    },
      () => {
        if (isFunc(code)) {
          code = code.toString().trim().replace('demo => {', '').slice(0, -1)
        }
        return html(hljs.highlight(language, code.trim()).value)
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
    view: exampleSection,
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


example(
'Click Counting Button',
'A simple button that counts up on every click',
demo => {
const {dom: {button}, model} = rilti
const m = model({clicks: 0})

button({
  render: demo,
  class: 'counter',
  on_click: e => ++m.clicks
},
  'clicks: ', m.sync.text.clicks
)
},
`.counter {
  outline: none;
  margin: 10px;
  padding: 6px;
  border-radius: 2px;
  border: 1px solid hsl(39, 82%, 65%);
  background: #fff;
  min-width: 100px;
  font-size: 1.2em;
  color: hsl(39, 82%, 65%);
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0,0,0,.1);
  transition: all 120ms ease;
}
.counter:hover, .counter:active {
  background: hsl(39, 82%, 65%);
  text-shadow: 0 2px 3px rgba(0,0,0,.1);
  color: #fff;
}`
)
}
