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
            demo: div({
              class: 'demo-box ' + name.toLowerCase().replace(/\s/g, '-'),
              cycle: {create: code}
            },
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
  'clicks: ', m.sync.clicks()
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
'databinding & validation with `.model`',
demo => {
const {model, dom: {b, br, div, input}} = rilti
const state = model({ip: '127.0.0.1'})

state.valid.ip = /^(?!0)(?!.*\.$)((1?\d?\d|25[0-5]|2[0-4]\d)(\.|$)){4}$/

state.on['validate:ip'](ok => {
  edit.style.borderColor = ok ? '#4de84d' : '#f64949'
})

const edit = input(state.sync.ip)
const display = div(
  b('ip: '),
  state.sync.ip(),
  br(),
  b('valid: '),
  state.sync['valid:ip']()
)

demo.append(display, edit)
},
`.databinding > * {
  text-align: left;
  margin: 5px auto;
}
.databinding > input {
  width: 135px;
  outline: 0;
  border: 1px solid #fff;
  padding: 4px;
  box-shadow: 0 2px 4px hsla(0,0%,0%,.12);
}`
)

example(
'Lifecycles',
'handle creation, mounting & destruction',
demo => {
const {dom: {button, div, span}, domfn: {mutate}, render, model} = rilti

mutate(demo, {css: {'--demo-color': 'hsl(50, 13%, 64%)'}})

const state = model()
const display = div(
  {class: 'display'},
  'Active State: ',
  span({
    css: {
      color: 'var(--demo-color)',
      fontWeight: '600'
    }
  },
    state.sync.text.mode
  )
)
const control = button({class: 'c-btn'})

const cycle = {
  create (el) {
    mutate(control, {
      text: state.mode = 'create',
      onceclick: e => render(el, demo)
    })
  },
  mount (el) {
    state.mode = 'mount'
    mutate(control, {
      text: 'unmount',
      onceclick: e => el.remove()
    })
  },
  unmount (el) {
    state.mode = 'unmounted'
    mutate(control, {
      text: 'mount',
      onceclick: e => render(el, demo)
    })
  },
  remount (el) {
    state.mode = 'remount'
    mutate(control, {
      text: 'unmount',
      onceclick: e => el.remove()
    })
  }
}

// managed element
div({class: 'managed', cycle})

render([display, control], demo)
},
`
.lifecycles {
  min-height: 150px;
  display: block;
  font-size: 1.05em;
}
.display {
  text-shadow: 0 2px 3px rgba(0,0,0,.1);
  min-width: 184px;
}
.display, .c-btn {
  display: inline-block;
  vertical-align: top;
  margin: 10px;
}
.c-btn {
  outline: none;
  padding: 6px 8px;
  border-radius: 2px;
  border: 1px solid var(--demo-color);
  background: #fff;
  min-width: 100px;
  color: var(--demo-color);
  cursor: pointer;
  transition: all 120ms ease;
}
.c-btn:hover, .c-btn:active {
  background: var(--demo-color);
  box-shadow: 0 2px 6px rgba(0,0,0,.1);
  text-shadow: 0 2px 3px rgba(0,0,0,.1);
  color: #fff;
}
.managed {
  display: block;
  width: 50px;
  height: 50px;
  margin: 10px auto;
  background: var(--demo-color);
  border-radius: 2.5px;
  box-shadow: 0 2px 6px rgba(0,0,0,.1);
}`)

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

}
