{ /* global rilti location fetch Prism marked */
const {dom, domfn: {emit, remove, Class}, model, extend, each, render, run, notifier, on} = rilti
const {a, prime, p, pre, code, nav, main, div, span, section, header, h1, h3, iframe} = dom
const tabComponent = dom['tab-component']

var hub = model()

const parseMD = marked.options({
  highlight: (src, lang) => Prism.highlight(src, Prism.languages[lang])
})

fetch('../dist/rilti.min.js').then(res => res.text())
.then(src => hub('riltiSrc', src))
fetch('./assets/normalize.css').then(res => res.text())
.then(src => hub('normalizeSrc', src))
fetch('./assets/overview.md').then(res => res.text())
.then(md => hub('readme', prime(parseMD(md))))

const $ = 'body'
const expose = () => span({class: 'expose'}, '::')
const link = (href, name, options = {}) => a(extend({href}, options), name)

const router = notifier(routes => {
  if (!router.working) {
    on.hashchange(window, e => router.activate())
    router.working = true
  }
  each(routes, (route, hash) => {
    if (route.main) router.routes.main = route
    if (hash !== 'main' && hash[0] !== '#') hash = '#' + hash
    router.routes[hash] = route
  })
  router.activate()
  return router.routes
})
router.routes = {}
router.activate = (
  hash = location.hash,
  route = router.routes[location.hash && location.hash === hash ? hash : 'main']
) => {
  if (!route || route === router.active) return
  router.emit(hash, route)
  router.emit.route(hash, route)
  route.host.innerHTML = ''
  if (Array.isArray(route.view)) route.host.append(...route.view)
  else route.host.append(route.view)
  router.active = route
  if (route.active instanceof Function) {
    route.active(route, hash)
  }
  return route
}
router.del = hash => delete router.routes[hash]

const navLinks = ['overview', 'api', 'examples']
.map(name => {
  const href = '#' + name
  const l = link(href, name)
  router.on.route(hash => Class(l, 'active', href === hash))
  return l
})

header(
  {$, id: 'site-head'},
  h1('rilti', expose(), 'docs'),
  nav(navLinks)
)

const host = main({$, id: 'page-view'})
const overview = section()
const apiview = section(`API`)
const exampleview = section()

router({
  overview: {
    host,
    view: overview,
    main: true
  },
  api: {
    host,
    view: apiview
  },
  examples: {
    host,
    view: exampleview
  }
})

hub.on['set:readme'](md => {
  render(md, overview)
})

const example = ({name, js, css, $ = exampleview, vsite = iframe()}) => {
  js = js.trim()
  if (css) css = css.trim()
  vsite.onload = async e => {
    const $doc = vsite.contentDocument
    $doc.body.setAttribute('example', name.toLowerCase())
    const defaultStyle = $doc.createElement('style')
    defaultStyle.textContent = await hub.async.normalizeSrc

    const vStyle = $doc.createElement('style')
    vStyle.textContent = css

    const riltiScript = $doc.createElement('script')
    riltiScript.textContent = await hub.async.riltiSrc

    const vScript = $doc.createElement('script')
    vScript.textContent = js

    $doc.head.append(
      defaultStyle,
      vStyle,
      riltiScript,
      vScript
    )
  }

  const tabs = {
    result: vsite,
    js: pre(code(Prism.highlight(js, Prism.languages.javascript)))
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

example({
  name: 'data-binding',
  js: `
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
  css: `
.field {
  background: #fff;
  padding: 8px 10px;
  margin: 5px auto;
  max-width: 250px;
  border-radius: 0 0 4px 4px;
  border-top: 2px solid hsl(0,0%,80%);
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
})

example({
  name: 'mouse tracker',
  js: `
const {dom, model, render, on} = rilti
const {div} = dom

const state = model()

on.mousemove(document, ({clientX, clientY}) => {
  state({x: clientX, y: clientY})
})

render(
  state.sync.template\`
    pointer is at (\${'x'}x, \${'y'}y)\`
)`
})

example({
  name: 'lifecycles',
  js: `
const {render, dom, mutate} = rilti
const {button, div} = dom

const phase = div({class: 'phase'})
const control = button()

render([phase, control])

const seat = (text, next) => el => {
  mutate(phase, {text})
  mutate(control, {
    text: next,
    onceclick: e =>
      next[0] < 'u' ?
      render(el) :
      el.remove()
  })
}

const cycle = {
  create: seat('create', 'mount'),
  mount: seat('mount', 'unmount'),
  unmount: seat('unmount', 'remount'),
  remount: seat('remount', 'unmount')
}

div({class: 'managed', cycle})
`,
  css: `
body[example] {
  display: block;
  font-size: 1.05em;
  --demo-color: hsl(345, 92%, 44%);
}
.phase {
  text-shadow: 0 2px 3px rgba(0,0,0,.1);
  min-width: 184px;
  color: var(--demo-color);
  font-weight: 600;
}
.phase::before {
  color: #545454;
  content: "stage: ";
}
.phase, button {
  display: inline-block;
  vertical-align: middle;
  margin: 10px;
}
button {
  outline: none;
  padding: 6px;
  border-radius: 2px;
  border: 1px solid var(--demo-color);
  background: #fff;
  min-width: 100px;
  color: var(--demo-color);
  cursor: pointer;
  transition: all 120ms ease;
}
button:hover, button:active {
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
}`
})

}
