{ /* global rilti hljs */
  const {dom, domfn: {attr, Class, mutate}, each, on, model, isFunc} = rilti
  const {h2, style, header, article, section, div, span, p, pre, html} = dom

  const rtabs = dom['rilti-tabs']

  var hub = model()

  const exampleSection = section({id: 'examples'})

  var example = (name, desc, code, css, styleSrc = css ? example.src({code: css, language: 'css'}) : undefined) => {
    const exmpl = article(
      {class: 'example'},
      header(div(name), span(desc)),
      rtabs({
        class: 'example-tab',
        props: {
          tabs: {
            demo: div(
              {class: 'demo-box ' + name.toLowerCase().replace(/\s/g, '-'), cycle: {create: code}},
              css ? style(css) : ''
            ),
            code: example.src({code}),
            style: styleSrc
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
'counts up on every click',
demo => {
const {dom: {button}, model} = rilti
const m = model({clicks: 0})

button({
  render: demo,
  onclick: e => ++m.clicks
},
  'clicks: ', m.sync.text.clicks
)
},
`.click-counting-button > button {
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
.click-counting-button > button:hover,
.click-counting-button > button:active {
  background: hsl(39, 82%, 65%);
  text-shadow: 0 2px 3px rgba(0,0,0,.1);
  color: #fff;
}`
)

example(
'Databinding',
'databinding with `.model.sync`',
demo => {
const {dom: {input, label}, model} = rilti
const m = model({msg: 'type something'})

const edit = m.sync.msg(input())

demo.append(
  label(m.sync.text.msg),
  edit
)
},
`.databinding > *:not(style) {
  display: block;
  text-align: left;
  margin: 5px auto;
  width: 280px;
}`
)

example(
'Lifecycles',
'handle creation, mounting & destruction',
demo => {
const {dom: {div}, render, once} = rilti

div({
  cycle: {
    create (el) {
      console.log('created:', el)
      render(el, demo)
    },
    mount (el) {
      el.host = el.parentNode
      console.log('mounted:', el, 'to:', el.host)
      once.click(el.host, () => el.remove())
    },
    destroy (el) {
      console.log('destroyed:', el)
      once.click(el.host, () => render(el, demo))
    },
    remount (el) {
      console.log('remounted:', el, 'to:', el.host)
      once.click(el.host, () => el.remove())
    }
  }
},
  'click me'
)
},
`.databinding > *:not(style) {
  display: block;
  text-align: left;
  margin: 5px auto;
  width: 280px;
}`
)

example(
'Component',
'define behaviour for custom elements',
demo => {
const {
  component,
  dom,
  domfn: {mutate}
} = rilti

const colorblock = component(
'color-block',
{
  props: {
    accessors: {
      color: {
        set (el, backgroundColor) {
          mutate(el, {
            text: backgroundColor,
            css: {backgroundColor}
          })
        },
        get: el => (
          el.style.backgroundColor
        )
      }
    }
  },
  attr: {
    color: {
      update (el, color) {
        if (el.color !== color) {
          el.color = color
        }
      }
    }
  },
  methods: {
    declareOntology ({color}) {
      console.log(`
      Hear ye, hear ye!
      I here by declare that...
      I, am infact a block;
      and oh so ${color} as well.
      This is the nature of my being.
      `)
    }
  },
  mount (el) {
    if (!el.color) el.color = 'red'
  }
}
)

// colorblock fn is
// the same as dom['color-block']
colorblock({
  render: demo,
  props: {
    color: 'crimson'
  },
  onclick (e, el) {
    el.declareOntology()
  }
})
},
`color-block {
  display: flex;
  justify-content: center;
  align-content: center;
  align-items: center;
  flex-flow: row wrap;
  text-align: center;
  color: white;
  font-size: 1.4em;
  margin: 5px auto;
  width: 140px;
  height: 140px;
  box-shadow: 0 2px 6px rgba(0,0,0,.1);
}`
)

example(
'Remove sequential',
'remove nodes one after another with an intermediate delay',
demo => {
const {dom:{div}, domfn: {remove}, each, on} = rilti
let elements = []
const addBlocks = i => {
  const block = div({$: demo}, i)
  elements.push(block)
  if (i === 49) {
    on.destroy(block, e => {
      div({
        $: demo,
        onclick: (e, el) => {
          elements = []
          each(50, addBlocks)
          el.remove()
          remove(elements, 500, true)
        }
      },
        '∞'
      )
    })
  }
}
each(50, addBlocks)
remove(elements, 500, true)
}, `
.remove-sequential {
  flex-flow: row wrap;
}
.remove-sequential > div {
  display: inline-block;
  margin: 5px;
  width: 30px;
  height: 30px;
  line-height: 30px;
  border-radius: 3px;
  border: 1px solid pink;
  user-select: none;
  cursor: pointer;
  text-shadow: 0 1px 3px hsla(0,0%,0%,.12);
}
`)

}
