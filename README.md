# 💫 rilti.js 💫

a small flavorful and unapologetic library built for the modern web

[![JavaScript Style Guide](https://cdn.rawgit.com/standard/standard/master/badge.svg)](https://github.com/standard/standard)

##### currently in beta phase and potentially subject to breaking changes
Feel free to fork or raise issues. Constructive criticism is always welcome

* 🐫 Loadbearing Spirit - Expressive DOM generation and custom-element components sans polyfill
* 🐱 Lion - Fearless Almost Magical *State Solution* with data-binding so simple you could cry
* 👶 Child - Proxy based DOM manipulation and Powerful all accepting Rendering System

## features
* elm-like ideas about architecture
* mostly declarative programming style
* node lifecycle hooks
* observe attributes
* models with data binding, validation, events & sync/async accessors
* generate all your elements in js don't write clunky html
* program without concern for page load state
* components aka. custom-elements. No polyfill needed!
* vue-like directives aka custom attributes
* great dom manipulation functions
* composition & currying
* powerful emitter system (pub/sub with proxy magic)
* no classes, no this, no extra fuzz, functional positive
* no old javascript, we use modern features like Proxy
* a gziped rilti.min.js weighs > 6kb


To use rilti just download **/dist/rilti.min.js** and pop it in a script tag. **If you have any issues just tell me, I'm on it.**

## The Dao of Rilti

1. Nominalism Good | Obscuritanism, Idealism & Universalism Bad
   * Things are little more than their names
   * More than one way of doing things, what is right/best is always contextual.
   * No Object Oriented anything (no classes, no this)
   * Reserve identities only for things that would be otherwise obscure
   * Don't hide things let things be what they are
   * Nothing for the sake of itself, no postmodern sollutions.
   * Logic is just data (with potential) so pass it around too
   * [Factory-Functions always](https://gist.github.com/mpj/17d8d73275bca303e8d2)
2. No HTML, Text & Elements are Objects too!
   * Selectors & Templates? I can't even...
   * Writing plain HTML adds extra complexity to javascript driven sites
   * Webpages should be alive, don't fear the DOM mess with it
3. MASA: Minimal API Surface Area.
   * Polymorphic functions/functions-as-class-like-objects
   * Infer data, good structure or Proxies instead of 12 parameter long functions
   * As Functional As Possible
   * Perspectivism vs Pragmatism, people won't always use an API the same way.
   * Leave some internals or lower level API features accessible for extendibility

Different strokes for different folks:
Also look at ``rilti.on`` which can be used like this ``on['any-event'](node, func, =options)``,
as well as like this ``on('any-event', node)(func, =options)``    
and also ``on(node, { click: e => {} }, =options)``.

#### examples of rilti used to build things
* [Rilti News - Progressive Web App](https://grimstack.io/news/)         
* [Todo-list](https://codepen.io/SaulDoesCode/pen/zRaMQY)         
* [Javascript calculator](https://codepen.io/SaulDoesCode/pen/VQqeBL)     
* [Emil Cioran - Simple Tribute Page](https://codepen.io/SaulDoesCode/pen/jYMQmK)     
* [rilti-todomvc](https://github.com/SaulDoesCode/rilti-todomvc)      
* [grimstack.io blog site](https://grimstack.io)     
* [grimstack.io/portfolio WIP Portfolio don't look](https://grimstack.io/portfolio)     

#### Plugins:
* rilti-tilt.js - compact mouse motion based element tilting effect, based on vanilla-tilt.js

#### future plans
* offer collection of useful optional plugins
* stabalize features and release
* expand with a UI library

## Example time!

#### Simple Persistent Markdown Scratch-Pad

```javascript
  const {dom: {article, body, textarea}, model} = rilti
  const m = model()

  const editor = textarea(m.sync.note)
// automagic data binding -^
  const display = article()

  body(editor, display)
// ^- render to document.body

  m.on('set:note', note => {
    localStorage.setItem('note', note)
    display.html = Markdown.parse(note)
// plugin your favorite md lib -^
  })

  m.note = localStorage.getItem('note') || 'Write something...'
```

### Click Counting Button

```js
const {dom: {button}, model} = rilti
const state = model({clicks: 0})

button({
  render: 'body',
  onclick: e => ++state.clicks
},
  'clicks: ', state.sync.clicks()
)
```
``state.sync.text.clicks`` <- Creates a Text node,     
with a value bound to the model's property ``clicks``.

```js
state.sync[prop] -> fn(=obj, key = prop) -> obj ? sync.text[prop]() : obj
```
so in this case
```js
state.sync.clicks() -> new Text(state.clicks)
```
but this is also possible
```js
state.sync(new Text(), 'textContent', 'clicks') -> new Text(state.clicks)
```
or
```js
state.sync.clicks(new Text(), 'textContent') -> new Text(state.clicks)
```
or this at a lower level
```js
const textNode = new Text(state.clicks)
state.on['set:clicks'](clicks => {
  textNode.textContent = clicks
})
```

you could also avoid ``.sync`` and go
```js
const {dom: {button}, model} = rilti
const state = model({clicks: 0})

const clicks = new Text(state.clicks)
state.on('set:clicks', count => {
  clicks.textContent = count
})

button({
  render: 'body',
  onclick: e => ++state.clicks
},
  'clicks: ', clicks
)
```

Either way the above will produce this html
```html
<button>clicks: 0</button>
<!-- Which is Technically -->
<button>
  "clicks:" <!-- text node -->
  "0" <!-- text node bound to state.clicks -->
</button>
```

### Two Button Counter

```js
const {dom: {button, div, h1}, model} = rilti
const state = model({count: 0})

div(
  {render: 'body'},// append to <body> on load
  h1(state.sync.text.count),// same as: state.sync.count()
  button({onclick: e => ++state.count}, '+'),
  button({onclick: e => --state.count}, '-')
)
```

### Mouse tracker using model.sync.template
```js
const {model, render, on} = rilti

const state = model()

on.mousemove(document, ({clientX, clientY}) => {
  state({clientX, clientY})
})

render(
  state.sync.template`
    pointer is at (${'clientX'}x, ${'clientY'}y)
  `
)
```

### Declaratively Generate a Site Navbar
Stop writing html (yes JSX too)!
Just generate everything, it's so simple.

```js
const {a, button, h1, header, nav, section} = rilti.fastdom

section(
  {$: 'body', id: 'navbar'},
// ^- $ is shorthand for render: 'Node/Selector'
  header(
    h1('My Wicked Website')
  ),
  nav(
    ['Home','Blog','About','Contact'].map(
      name => a({class: 'nv-btn', href: '#/' + name.toLowerCase()}, name)
    ),
    a({
      class: 'nv-btn',
      css: {backgroundColor: 'white', color: 'dimgrey'},
      href: 'https://github.com/SaulDoesCode',
      target: '_blank'
    },
      'Github'
    )
  )
)
```
The above produces this html

```html
<section id="navbar">
  <header>
    <h1>My Wicked Website</h1>
  </header>
  <nav>
    <a class="nv-btn" href="#/home">
      <button>Home</button>
    </a>
    <a class="nv-btn" href="#/blog">
      <button>Blog</button>
    </a>
    <a class="nv-btn" href="#/about">
      <button>About</button>
    </a>
    <a class="nv-btn" href="#/contact">
      <button>Contact</button>
    </a>
    <a class="nv-btn" href="https://github.com/SaulDoesCode/rilti.js" target="_blank" style="background-color: dimgrey; color: white;">
      <button>Github</button>
    </a>
  </nav>
</section>
```

### API
| method | description  |
|--------|--------------|
| ``.dom(tag, =options, ...children)`` | where the magic happens, define behavior for elements and see them come to life |
| ``.dom["any-tag"](=options, ...children)`` | pre-bound tag version of ``.dom``  |
| ``.query(string, Selector/Node)`` | improved alternative to ``document.querySelector``|
| ``.queryAll(string, Selector/Node)`` | improved alternative to ``document.querySelectorAll``|
| ``.queryAsync(string, func, Selector/Node)`` | same as querySelector but async, good for pre-load logic |
| ``.queryEach(string, Selector/Node, func)`` | queries nodes returned by selector and iterates over them like ``.forEach`` would|
| ``.dom.frag(=string)`` | create a fragment or convert html text to nodes |
| ``.on(target, type, listener, =options)`` | generates event listener |
| ``.once(target, type, listener, =options)`` | generates event listener that triggers only once |
| ``.curry(func, =argsLimit)`` | curries a function |
| ``.component(tag, {create, mount, unmount, attr, props, methods})`` | define custom elements, no polyfills needed |
| ``.each(iterable, func)`` | loop through objects, numbers, array(like)s, sets, maps... |
| ``.extend(hostObj, obj, =safeMode)`` | extends host object with all props of other object, won't overwrite if safe is true |
| ``.flatten(arraylike)`` | flattens multidimensional arraylike objects |
| ``.emitter(=obj)`` | extendable event system /pub sub pattern |
| ``.model(=obj)`` | Backbone like model with validation |
| ``.render(AlmostAnything, Selector/Node, =connector = 'appendChild')`` | renders things, independent of ready state |
| ``.run(func)`` | asynchronously executes a given function when the DOM is loaded |
| ``.runAsync(func, ...args)`` | run a function asynchronously |
| ``.isMounted(node, =parentNode)`` | determines whether or not the dom or other node contains a specific node |

##### rilti also exports a couple of useful Type-Testing functions
usage : ``rilti.isX( {any} ) // -> boolean``   
``isArr,
isNil,
isDef,
isObj,
isFunc,
isBool,
isStr,
isNum,
isArrlike,
isNodeList,
isNode,
isPrimitive,
isPromise,
isRenderable,
isRegExp,
isInput,
isEmpty,
isEl``

### DOM manipulation
rilti contains a ``domfn`` that contains several useful dom manipulation functions.
these fucntions will all return the node passed as the first argument unless specified
otherwise such as with has/get(this/that) type functions

```js
const {
  attach,
  css, // (node, stylePropery, val) || (node, { styleProp:'4em' }) set element.style properties
  class, // (node, class, =state) add/remove or toggle classes
  hasClass, // (node, class) -> bool
  attr, // (node, attrNameOrObj, =value): attr(el, 'href', '/') or attr(el, 'href') -> '/'
  removeAttribute, // (node, ...attrNames) removes attributes
  hasAttr, // hasAttr(node, attrName) -> bool
  attrToggle, // (node, attrName, state = !hasAttr, =val = getAttr(name) || '')
  emit, // (node, {type string/Event/CustomEvent}) dispatchEvents on node
  append, prepend, appendTo, prependTo, // (node, selectorOrNode)
  remove, // (node, =afterMS) // remove node or remove after timeout
  mutate // multitool i.e. (node, {class: 'card', css: {'--higlight-color': 'crimson'}}) -> options obj
} = rilti.domfn
```

everything found in rilti.domfn will be available as:        
``rilti.$(Node).domfnMethod(...args)``

```js
const contentCard = async (src, hidden = false) => {
  const card = rilti.dom.div()
  card.class = 'card'
  card.class({hidden})
  card.attr['aria-hidden'] = hidden

  card.css({
    '--custom-theme': 'hsl(331, 70%, 48%)',
    borderTop: '2px solid var(--custom-theme, --theme-color)'
  })

  card.prependTo('.content-list')

  try {
    const res = await fetch(src)
    card.append(await res.text())
  } catch (e) {
    card.remove()
    console.error('could not load content from: ' + src)
  }
}
```

#### Async Property accessors with ``.model().async`` and Async/Await

```js
  // view.js
  import Feed from 'news-feed.js'
  const NewsApp = rilti.model()

  NewsApp.async.latest.then(Feed.render)

  export default NewsApp

  // news.js
  import NewsApp from 'view.js'

  fetch('/news/latest').then(res => {
    // Promises are automagically handled
    NewsApp.latest = res.json()
  })
```

#### Create Elements with Any Tag
``dom['any-arbitrary-tag'](=options, ...children) -> Node/Element``

```javascript
dom['random-tag']({
  // render to dom using selectors or nodes
  render: '.main > header',
  // add attributes
  attr: {
    contenteditable: 'true',
  },
  // set classes
  class: 'card active',
  // or
  class: ['card', 'active']
  // or conditionally
  class: {
    card: true,
    active: false // active won't be added
  },
  // some styles?
  css: {
    boxShadow: '0 2px 6px rgba(0,0,0,.12)',
    '--highlight-color': 'crimson',
  // ^- oh yeah, css variables work too
  },
  // attach properties to the element
  props: {
    oldtxt: '',
    // create property get/set traps
    accesors: {
      contents: {
        get: el => el.txt,
        set (el, val) { el.txt = val.trim() }
      },
      // or as one function
      innerds (el, val) {
        if (val === undefined) {
          return el.txt
        }
        el.txt = val.trim()
      }
    },
    // plain getter/setters work too
    get ye_old_txt () { return this.innerText },
    set ye_old_txt (val) { this.innerText = val.trim() }
  },
  methods: {
    // el will be pre-bound upon execution
    // think of it like self in python classes
    // or rust struct methods
    warn (el, ...args) {
      el.oldtxt = el.txt
      el.contents = '  Sure you want to remove random-tag?  '
    },
    reset (el) { el.contents = el.oldtxt }
  },
  // listen for events
  on: {
    click (evt, {warn}) { warn() },
    mouseout (evt, {reset}) { reset() }
  },
  // if there's just one listener then use:
  // once/onxevent: fn instead of once: { evt: fn }
  oncedblclick (evt, el) { el.remove() },
  // manage the element's lifecycle
  cycle: {
    create (el) { /*...*/ },
    mount (el) { /*...*/ },
    unmount (el) { /*...*/ },
    remount (el) { /*...*/ }
  }
},
  ...children // [], "", =>, Node, NodeList : should all render
)
```

#### Directives / Custom Attributes

```javascript
// observe attributes with vue-like directives
rilti.directive('custom-attr', {
  init (element, value) { ... },
  update (element, value, oldValue) { ... },
  remove (element, value) { ... }
})
// revoke a directive
rilti.directives.delete('custom-attr')
```

#### Web Components / Custom Elements, no polyfills needed
```js
rilti.component('tick-box', {
  props: {
    accessors: {
      ticked: {
        get: el => el.attr.has('ticked'),
        set: (el, state) => el.attrToggle('ticked', !!state)
      }
    }
  },
  create (el) {
    el.on.click(e => el.attrToggle('ticked'))
    el.css({
      display: 'block',
      width: '20px',
      height: '20px',
      margin: '5px auto',
      cursor: 'pointer',
      border: `1px solid ${el.ticked ? 'white' : 'dimgrey'}`,
      backgroundColor: el.ticked ? 'dimgrey' : 'white'
    })
  },
  mount (el) {
    console.log('tick-box mounted to ', el.parent)
  },
  unmount (el) {
    console.log('unmounted: tick-box is no more :(')
  },
  attr: {
    ticked: {
      update (el) {
        el.css({
          backgroundColor: 'dimgrey',
          border: `1px solid #fff`
        })
        el.emit('ticked', true)
      },
      remove (el) {
        el.css({
          backgroundColor: '#fff',
          border: `1px solid dimgrey`
        })
        el.emit('ticked', false)
      }
    }
  }
})
```

## Performance
rilti is about getting things done fast on your terms,
this means maximum expresivity minimal code,
but of course there's always a compromise
between nice to have features and raw performance,
therefore rilti has two element generation systems
which are the same in many aspects.
``rilti.dom(tag, =opts, ...children) -> Proxy(Function -> Node)`` and
``rilti.fastdom(tag, =opts, ...children) -> Node``

both can do ``const {div, span, anytag} = rilti.fastdom || rilti.dom``

``rilti.fastdom`` is a reduced version of ``rilti.dom`` it focusses purely
on Node generation with minimal niceties like proxy magic,
it also throws out deliberate lifecycle hooks.

If you're building a todo app or anything that needs high interactivity use ``rilti.dom``,
but **if you want 10000 table elements quick and dirty use ``rilti.fastdom``**

**NOTE**: *the performance after rendering is unaffected in either case*

#### see how fast rilti.js renders your elements

```html
<script src="/rilti/dist/rilti.min.js"></script>
<script>
  const riltiGoFast = (fast = true, count = 10000) => {
    const {span} = rilti[fast ? 'fastdom' : 'dom']
    const start = performance.now()
    while(count != 0) span({
      $: document.body,
      css: {
        background:'#fff',
        width:'110px',
        color: 'dimgrey',
        textAlign: 'center',
        height:'110px',
        margin:'5px',
        padding:'4px',
        float:'left',
        boxShadow:'0 1px 4px hsla(0,0%,0%,.3)'
      }
    },
      "damn daniel, back at it again with those white spans ",
      count--
    )

    console.log(`That took ${performance.now() - start}ms`)
  }

  riltiGoFast(); // -> this usually takes ~720ms on my i5 machine
  document.body.textContent = ''
  riltiGoFast(false); // -> this usually takes ~ 1364ms on my i5 machine
</script>
```

#### weight
* unminified:  > 36kb
* minified: > 14.1kb
* minified && compressed: > 6kb

#### license = MIT
