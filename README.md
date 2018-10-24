# 💫 rilti.js 💫

a small flavorful and unapologetic library built for the modern web

[![JavaScript Style Guide](https://cdn.rawgit.com/standard/standard/master/badge.svg)](https://github.com/standard/standard)

[![Build Status](https://travis-ci.org/SaulDoesCode/rilti.js.svg?branch=master)](https://travis-ci.org/SaulDoesCode/rilti.js)

##### currently in beta phase and potentially subject to breaking changes
Feel free to fork or raise issues. Constructive criticism is always welcome

* 🐫 Loadbearing Spirit - Expressive DOM generation and custom-element components sans polyfill
* 🐱 Lion - Simple and fearless element/component data-binding
* 👶 Child - Proxy enhanced DOM manipulation and Powerful all accepting async Rendering System

## features

* elm-like ideas about architecture
* flexible declarative programming style
* node lifecycle hooks
* observe attributes
* generate all your dynamic/interactive/transient elements
* program without concern for page load state
* components aka. custom-elements. No polyfill needed!
* vue-like directives aka custom attributes
* great dom manipulation functions
* composition & currying
* powerful emitter system (pub/sub with proxy magic)
* no classes, no this, no extra fuzz, functional positive
* no old javascript, we use modern features like Proxy
* a gziped rilti.min.js weighs > 7kb


To use rilti just download **/dist/rilti.min.js** and pop it in a script tag. **If you have any issues just tell me, I'm on it.**

## Install

> ``yarn add rilti``  


> ``npm i rilti``

or

```html
<script src="https://unpkg.com/rilti"></script>
```

## The Dao of Rilti

1. Nominalism Good | Explicit Paradigms, Patterns & Universalism Bad
   * More than one way of doing things, what is right/best is always contextual.
   * No Explicit Object Orientation anything (no classes or this)
   * simple functions and objects before imposing rigid structures
   * Reserve identities only for things that would be otherwise obscure
   * Don't hide things, let them be what they are
   * Nothing for the sake of itself, no postmodern sollutions.
   * Logic is just data (with potential) so pass it around too
   * [Factory-Functions always](https://gist.github.com/mpj/17d8d73275bca303e8d2)
2. Mess With the DOM, it's alive
   * Selectors & Templates? No, treat HTML as Mutable Object Holons
   * Plain HTML is for simple websites, where state is not as complex
   * DOM generation and components are for Apps and the modern interactive Web.
3. MASA: Minimal API Surface Area.
   * Polymorphic functions/functions-as-class-like-objects
   * Infer Info with Good API Design before creating 12 parameter long functions.
   * Use configurable Objects create dynamic APIs
   * Some APIs can often be reduced to a fn e.g. Get: fn(key), Set: fn(key, val), Del: fn(key, nil)
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

#### future plans
* offer collection of useful optional plugins
* stabalize features and release
* expand with a UI library

## Example time!

### Click Counting Button

```js
const { component, componentReady, dom: { h1 }} = rilti

component('counter-button', {
  bind: {
    count: {
      key: 'clicks:innerText',
      val: 0,
      views: {
        clicks: count => `clicks: ${count}`
      }
    }
  },
  on: {
    click: (e, el) => ++el.count
  }
})

componentReady('body > counter-button', el => {
  const tellEm = h1['tell-em'](`You just won't stop clicking huh?`)
  el.$count.on.change(count => {
    if (count > 20 && count < 40 && !tellEm.mounted) tellEm.render('body')
    else if (count > 40 && count < 100) tellEm.txt += ' Seriously? '
    else if (count > 100) tellEm.txt = 'What? You want a prize or something?'
  })
})
```

### Two Button Counter

```js
const {databind, dom: {button, div, h1}} = rilti

div.multicounter({
  render: 'body', // <- apend to <body> on load
  bind: {
    count: {
      val: 0,
      views: {
        display: count => `current count is at: ${count}`
      }
    }
  }
},
  host => [ // <com-po-nents> bind natively, other elements bind to el.bind['$bind/bindValue']
    h1(
      host.bind.$count.text('display')
    ),
    button({onclick: e => ++host.bind.count}, '+'),
    button({onclick: e => --host.bind.count}, '-')
  ]
)
```

### Pointer tracker
```js
rilti.dom.div.pointer_tracker({
  $: 'body',
  css: {width: '300px', height: '300px'},
  bind: {
    pointer: {
      key: 'location:innerText',
      val: {x: 0, y: 0},
      views: {
        location: ({x, y}) => `Pointer is at (${x}x, ${y}y)`
      },
      change: ({x, y}) => ({x: x.toFixed(2), y: y.toFixed(2)})
    }
  },
  onpointermove ({x, y}, el) {
    el.bind.pointer = {x, y}
  }
})
```
the above produces this:
```html
<div class="pointer-tracker" style="width: 300px; height: 300px;">
  Pointer is at (0x, 0y)
</div>
```

### Declaratively Generate a Site Navbar
Stop writing html (yes JSX too)!
Just generate everything, it's so simple.

```js
const {a, button, h1, header, nav, section} = rilti.dom

section.navbar({$: 'body'}, // <- $ is shorthand for render: 'Node/Selector'
  header(h1('My Wicked Website')),
  nav(
    'Home Blog About Contact'.split(' ').map(name =>
      a['nav-bn']({href: '#/' + name.toLowerCase()}, name)
    ),
    a['nav-bn']({
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
<section class="navbar">
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
} = rilti.domfn
```

everything found in rilti.domfn will be available as:        
``rilti.$(Node).domfnMethod(...args)``

```js
const contentCard = async (src, hidden = false) => {
  const card = rilti.dom.div.card() // <- <div class="card"></div>
  
  card.class({hidden}) // add class .hidden if hidden === true
  card.class.hidden = hidden // <- this works too

  card.attr['aria-hidden'] = hidden // set attribute

  card.css({
    '--custom-theme': 'hsl(331, 70%, 48%)',
    borderTop: '2px solid var(--custom-theme, --theme-color)'
  })

  card.prependTo('.content-list')

  try {
    const res = await fetch(src)
    card.append(await res.text())

    card.on.click((e, card) => {
      card.once.animationend(() => {
        card.class('flip-animation', false)
      })
      card.class('flip-animation', true)
    })
  } catch (e) {
    card.remove()
    console.error('could not load content from: ' + src)
  }
}
```

#### Create Elements with Any Tag
``dom['any-arbitrary-tag'](=options, ...children) -> Node/Element``

```javascript
dom['random-tag'] // <- <random-tag class="with random chainable classes">
.with
.random
['chainable']
.classes({
  // render to dom using selectors or nodes
  render: '.main > header',
  // add attributes
  attr: {contenteditable: true},
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
        if (val == null) return el.txt
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
      el.contents = 'Sure you want to remove random-tag?'
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

#### weight
* unminified:  > 42kb
* minified: > 18kb
* minified && compressed: > 7kb

#### license = MIT
