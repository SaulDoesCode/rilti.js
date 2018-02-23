/* global rilti location fetch Prism */
const {dom, domfn: {mutate, emit, remove, Class}, model, component, extend, each, isRenderable, isFunc, render, once, on} = rilti
const {a, p, pre, code, nav, main, div, span, section, header, h1, h3, iframe, script, style} = dom
const tabComponent = dom['tab-component']

const hub = model()

fetch('../dist/rilti.min.js').then(res => res.text())
.then(src => hub('riltiSrc', src))
fetch('./assets/normalize.css').then(res => res.text())
.then(src => hub('normalizeSrc', src))

const $ = 'body'
const expose = () => span({class: 'expose'}, '::')
const link = (href, name, options = {}) => a(extend({href}, options), name)

header(
  {$, id: 'site-head'},
  h1('rilti', expose(), 'docs')
)

const router = routes => {
  for (let route in routes) {
    if (route !== 'default' && route[0] !== '#') {
      route = '#' + route
    }
    router.routes[route] = routes[route]
    router.activate(route)
  }
  if (!router.on) {
    window.onhashchange = e => router.activate(location.hash)
    router.on = true
  }
  return routes
}
router.routes = {}
router.activate = hash => {
  const route = router.routes[(hash === location.hash && hash) || 'default']
  if (!route) return
  route.host.innerHTML = ''
  if (Array.isArray(route.view)) route.host.append(...route.view)
  else route.host.append(route.view)
  if (route.active instanceof Function) {
    route.active(route, hash)
  }
}
router.del = hash => delete router.routes[hash]

const host = main({$, id: 'page-view'})
const overview = section()

router({default: {host, view: overview}})

header(
  {$: overview, class: 'section-heading'},
  link('#', 'examples')
)

const example = (name, source, css = '', $ = overview, vsite = iframe()) => {
  source = source.trim()
  css = css.trim()
  vsite.onload = async e => {
    const $doc = vsite.contentDocument
    $doc.body.setAttribute('example', '')
    const defaultStyle = $doc.createElement('style')
    defaultStyle.textContent = await hub.async.normalizeSrc

    const vStyle = $doc.createElement('style')
    vStyle.textContent = css

    const riltiScript = $doc.createElement('script')
    riltiScript.textContent = await hub.async.riltiSrc

    const vScript = $doc.createElement('script')
    vScript.textContent = source

    $doc.head.append(
      defaultStyle,
      vStyle,
      riltiScript,
      vScript
    )
  }

  const tabs = {
    result: vsite,
    js: pre(code(Prism.highlight(source, Prism.languages.javascript)))
  }
  if (css) tabs.css = pre(code(Prism.highlight(css, Prism.languages.css)))

  return tabComponent({$,
    class: 'example',
    props: {
      tabs,
      active: 'result',
      heading: name
    }
  })
}

example(
'data-binding',
`
const {dom, model} = rilti
const {label, input, section} = dom

const state = model({
  msg: 'type something...'
})

section({
  class: 'field',
  render: 'body'
},
  label(state.sync.text.msg),
  input(state.sync.msg)
)`,
`
.field {
  background: #fff;
  padding: 8px 10px;
  margin: 5px auto;
  max-width: 250px;
  border-radius: 0 0 4px 4px;
  border-top: 1px solid hsl(0,0%,80%);
  box-shadow: 0 2px 4px rgba(0,0,0,.14);
}
.field > label {
  display: block;
  color: hsl(0,0%,45%);
  margin: 5px auto;
  font-size: .9em;
}
.field > input {
  display: block;
  padding: 4px;
  margin: 5px auto;
  border: none;
  width: 100%;
  border-bottom: 1px solid hsl(0,0%,80%);
  box-shadow: 0 3px 4px -2px rgba(0,0,0,.12);
}`
)
