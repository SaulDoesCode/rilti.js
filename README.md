# :dizzy: rilti.js :dizzy:

a small flavorful and unapologetic view layer library built for the front-end

[![JavaScript Style Guide](https://cdn.rawgit.com/standard/standard/master/badge.svg)](https://github.com/standard/standard)

##### currently in beta phase and potentially subject to breaking changes
Feel free to fork or raise issues. Constructive criticism is welcome

## features
* lifecycle hooks
* dom event management
* models, sync/async accessors, observe props
* create and observe custom attributes
* create elements in javascript don't write clunky html
* components aka custom-elements, no polyfill needed!
* vue-like directives aka custom attributes
* great dom manipulation functions
* functional composition
* powerful yet petite notifier system (pub/sub)
* no classes, no this, no extra fuzz, functional positive
* no old javascript, we use modern features like Proxy
* A Gziped rilti.js weighs less than 4.4kb

#### Plugins:
* rilti-tilt.js - compact mouse motion based element tilting effect, based on vanilla-tilt.js
* rilti-utils.js - set of useful features and things which could have been part of rilti.js but is doesn't need to be

#### planned features
* offer collection of useful optional plugins

## Example time!!!

### Simple Site Navbar
Stop writing html (yes JSX too)!
Just generate everything, it's so simple.

```js
  const {dom: {a, nav, span, h1}} = rilti

  const navbar = ({title, render, buttons}) => nav({
    render,
    class: 'navbar'
  },
    h1(title),
    buttons.map(([name, href, css = {}]) => (
      span({class: 'navbar-btn', css}, a({href}, name))
    ))
  )

  navbar({
    title: 'My Wicked Website',
    render: 'body',
    buttons: [
      ['home', '#/home'],
      ['blog', '#/blog'],
      ['about', '#/about'],
      [
        '📓 fork me! 🍴',
        'https://github.com/SaulDoesCode/rilti.js',
        {backgroundColor: '#343434', color: '#fff'}
      ]
    ]
  })
```
The Above produces this html

```html
<nav class="navbar">
  <h1>My Wicked Website</h1>
  <span class="navbar-btn">
    <a href="#/home">home</a>
  </span>
  <span class="navbar-btn">
    <a href="#/blog">blog</a>
  </span>
  <span class="navbar-btn">
    <a href="#/about">about</a>
  </span>
  <span style="background-color: rgb(52, 52, 52); color: rgb(255, 255, 255);" class="navbar-btn">
    <a href="https://github.com/SaulDoesCode/rilti.js">📓 fork me! 🍴</a>
  </span>
</nav>
```

### API
| method | description  |
|--------|--------------|
| ``.dom["any-tag"](=options, ...children)`` | where the magic happens, define behavior for elements and see them come to life |
| ``.dom(StringOrNode, StringOrNode)`` | same as querySelector but returns a promise, it's essentially an async querySelector |
| ``.dom.query(string, StringOrNode)`` | improved alternative to ``document.querySelector``|
| ``.dom.queryAll(string, StringOrNode)`` | improved alternative to ``document.querySelectorAll``|
| ``.dom.queryEach(string, StringOrNode, func)`` | queries nodes returned by selector and iterates over them like ``.forEach`` would|
| ``.dom.html(string)`` | convert a string to an html document fragment |
| ``.on(target, type, listener, =options)`` | generates event listener |
| ``.once(target, type, listener, =options)`` | generates event listener that triggers only once |
| ``.render(node, StringOrNode, =connector)`` | renders nodes to a node of your choice, independent of ready state |
| ``.run(func)`` | asynchronously executes a given function when the DOM is loaded |
| ``.route(=hashString, func)`` | detect and respond to location.hash changes |
| ``.curry(func, =argsLimit)`` | curries a function |
| ``.compose(...func)`` | compose functions, compose(fn1,fn2,fn3)(val) // -> result |
| ``.component(tag, {create, mount, destroy, attr, props, methods})`` | define custom elements, no polyfills needed |
| ``.each(iterable, func)`` | loop through objects, numbers, array(like)s, sets, maps... |
| ``.extend(hostObj, obj, =safeMode)`` | extends host object with all props of other object, won't overwrite if safe is true |
| ``.flatten(arraylike)`` | flattens multidimensional arraylike objects |
| ``.notifier(=obj)`` | extendable event system /pub sub pattern |
| ``.model(=obj)`` | Backbone like model with validation, please see [SuperModel.js](https://github.com/SaulDoesCode/SuperModel.js) it's the same |
| ``.DOMcontains(node, =parentNode)`` | determines whether or not the dom or other node contains a specific node |

##### rilti also exports a couple of useful Type-Testing functions
usage : ``rilti.isX( {any} ) // -> boolean``   
``isBool, isFunc,
isDef, isUndef,
isNull, isEmpty,
isNum, isInt,
isStr,isObj,
isArr, isArrlike,
isMap, isSet,
isEl, isNode, isNodeList,
isInput, isPrimitive
isPromise, isIterator``

### DOM manipulation
rilti contains a ``domfn`` that contains several useful dom manipulation functions.
these fucntions will all return the node passed as the first argument unless specified
otherwise such as with has/get(this/that) type functions

```js
const {
  replace,
  css, // (node, stylePropery, val) || (node, { styleProp:'4em' }) set element.style properties
  Class, // (node, class, =state) add/remove or toggle classes
  hasClass, // (node, class) -> bool
  attr, // (node, attrNameOrObj, =value): attr(el, 'href', '/') or attr(el, 'href') -> '/'
  rmAttr, // (node, attrName) removes attributes
  hasAttr, // hasAttr(node, attrName) -> bool
  getAttr, // getAttr(node, attrName) -> string
  setAttr, // setAttr(node, attrName, value)
  attrToggle, // (node, attrName, state = !hasAttr, =val = getAttr(name) || '')
  emit, // (node, {type string/Event/CustomEvent}) dispatchEvents on node
  append, prepend, appendTo, prependTo, // (node, selectorOrNode)
  remove // (node, =afterMS) // remove node or remove after timeout
} = rilti.domfn
```
#### examples of rilti used to build things
[rilti.js todomvc {slightly outdated, will fix}](https://github.com/SaulDoesCode/rilti.js-todomvc)      
[grimstack.io blog site](https://grimstack.io)     


#### Async Property accessors with ``.model().async`` and Async/Await

```js
  // view.js
  const NewsApp = rilti.model()
  feed.render(await NewsApp.async.latest)

  export default NewsApp

  // news.js
  import NewsApp from 'view.js'

  NewsApp.latest = (await fetch('/news/latest')).json()
```

#### Simple Databinding with ``.model``, see [SuperModel.js](https://github.com/SaulDoesCode/SuperModel.js) for more
SuperModel.js is the same as rilti.model, I'll write docs eventually but you can see how to use ``rilti.model({...data})`` there.

```javascript
  const {dom, on, model} = rilti

  const textarea = dom.textarea({render: 'body'})
  const article = dom.article({render: 'body'})

  const M = model({txt: textarea.value.trim()})
  M.sync(article, 'textContent', 'txt')

  on.input(textarea, e => {
    model.txt = textarea.value.trim()
  })
```

#### Create Elements with Any Tag
```javascript
// create elements with any tag
// dom['any-arbitrary-tag']( =options, ...children) -> Node/Element

dom['random-tag']({
  // render to dom using selectors or nodes
  render: '.main > header',
  // add attributes
  attr: {
    contenteditable: 'true',
  },
  // attach properties to the element
  props: {
    oldtxt: '',
    // getter/setters work too
    get txt() { return this.innerText },
    set txt(val) { this.innerText = val.trim() }
  },
  // listen for events
  on: {
    click(evt, el) {
      el.oldtxt = el.txt
      el.txt = 'Sure you want to remove random-tag?'
    },
    mouseout(evt, el) {
      el.txt = el.oldtxt
    }
  },
  // listen for events just once
  once: {
    dblclick : (evt, el) => el.remove()
  },
  // manage the element's lifecycle
  lifecycle: {
    create () { /*...*/ },
    mount () { /*...*/ },
    destroy () { /*...*/ }
  }
})
```

#### Directives / Custom Attributes

```javascript
// observe attributes with vue-like directives
rilti.directive('custom-attr', {
  init (element, value) { ... },
  update (element, value, oldValue) { ... },
  destroy (element, value, oldValue) { ... }
})
// revoke a directive
rilti.directives.delete('custom-attr')
```

#### Web Components / Custom Elements, no polyfills needed
```js
const {component, domfn: {css}, on} = rilti

component('tick-box', {
  props: {
    get ticked () {
      return attr(this, 'data-ticked') === 'true'
    },
    set ticked (val) {
      if(!this.disabled) {
        attr(this, 'data-ticked', val)
        css(this, {
          backgroundColor: val ? 'dimgrey' : 'white',
          border: `1px solid ${val ? 'white' : 'dimgrey'}`
        })
      }
    }
  },
  create (el) {
    css(el, {
      display: 'block',
      width: '20px',
      height: '20px',
      margin: '5px auto',
      cursor: 'pointer',
      backgroundColor: el.ticked ? 'dimgrey' : 'white',
      border: `1px solid ${el.ticked ? 'white' : 'dimgrey'}`
    })
    on.click(el, () => { el.ticked = !el.ticked })
  },
  mount (el) {
    console.log('tick-box mounted to document')
  },
  destroy (el) {
   console.log('tick-box is no more :(')
  },
  attr: {
    disabled: {
      init (el, val) {
        css(el, {
          cursor: val === 'true' ? 'not-allowed' : 'pointer'
        })
      }
    }
  }
})
```

#### see how fast rilti.js renders your elements

```html
<script src="/rilti/dist/rilti.min.js"></script>
<script>
  const testRiltiBlocking = (count = 10000) => {
    const span = rilti.dom.span
    const start = performance.now()
    while(count != 0) span({
      render: document.body,
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
  testRiltiBlocking(); // -> this usually takes ~ 7800ms on my i5 machine

  const testRiltiChunked = (count = 10000) => {
    const { each, dom: {span} } = rilti
    const start = performance.now()
    // int loops are chunked making heavy loads less blocking
    each(count, i =>
      span({
        render: document.body,
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
    )
    console.log(`That took ${performance.now() - start}ms`);
  }
  testRiltiChunked();
  // -> site useable even while rendering thousands of nodes
</script>
```

**listMap** is just a utility to manage a ``Map`` that contains ``Set``s
```javascript
  const lm = rilti.listMap()

  // set
  lm('key', 'value0')
  lm('key', 'value1')
  // get
  lm('key') // -> Set['value0', 'value1']
  // get the base map
  lm.map // -> Map{key: Set[...]}
  // has
  lm.has('key') // -> true
  lm.has('key', 'value2') // -> false
  // delete a value
  lm.del('key', 'value0')
  // or
  lm('key').delete('value0')

  // loop over contents
  lm.each('key', value => {
    console.log(value)
  })
  // value0
  // value1
  // ...
```

#### weight
* unminified:  > 24kb
* minified: > 10kb
* minified && compressed: > 4.4kb

#### licence = MIT
