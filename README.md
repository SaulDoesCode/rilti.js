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

#### Plugins:
* rilti-tilt.js - compact mouse motion based element tilting effect, based on vanilla-tilt.js
* rilti-utils.js - set of useful features and things which could have been part of rilti.js but is doesn't need to be

#### planned features
* offer collection of useful optional plugins

### API
| method | description  |
|--------|--------------|
| ``.dom["any-tag"]( {=obj}, {...children})`` | where the magic happens, define behavior for elements and see them come to life |
| ``.dom( {string/node}, {=string/node} )`` | same as querySelector but returns a promise, it's essentially an async querySelector |
| ``.dom.query( {string}, {=string/node} )`` | improved alternative to ``document.querySelector``|
| ``.dom.queryAll( {string}, {=string/node} )`` | improved alternative to ``document.querySelectorAll``|
| ``.dom.queryEach( {string}, {=string/node}, {func} )`` | queries nodes returned by selector and iterates over them like ``.forEach`` would|
| ``.dom.html( {string} )`` | converts strings to html nodes |
| ``.on( {target}, {type}, {listener}, {=options} )`` | generates event listener |
| ``.once( {target}, {type}, {listener}, {=options} )`` | generates event listener that triggers only once |
| ``.render( {node}, {string/node}, {=connector})`` | renders nodes to a node of your choice, independent of ready state |
| ``.run( {function} )`` | executes a given function when the DOM is loaded |
| ``.route( {=hashString}, {function})`` | detect and respond to location.hash changes |
| ``.curry( {func}, {=argumentLimit} )`` | curries a function |
| ``.compose( {...func} )`` | compose functions, compose(fn1,fn2,fn3)(val) // -> result |
| ``.each( {iterable}, {function} )`` | loop through objects, numbers, array(like)s, sets, maps... |
| ``.extend( {host-object}, {object}, {=safe bool} )`` | extends host object with all props of other object, won't overwrite if safe is true |
| ``.flatten( {arraylike} )`` | flattens multidimensional arraylike objects |
| ``.notifier( {=obj} )`` | extendable event system /pub sub pattern |
| ``.DOMcontains( {node}, {=parent node} )`` | determines whether or not the dom or other node contains a specific node |
| ``.component(tag, config = {create, mount, destroy, attr, props, methods})`` | define custom elements, no polyfills needed |

##### rilti also exports a couple of useful type testing functions
usage : ``rilti.isX( {any} ) // -> boolean``
isBool, isFunc,
isDef, isUndef,
isNull, isEmpty,
isNum, isInt,
isStr,isObj,
isArr, isArrlike,
isMap, isSet,
isEl, isNode, isNodeList,
isInput, isPrimitive
isPromise

#### example time!!!

### DOM manipulation
rilti contains a ``domfn`` that contains several useful dom manipulation functions.
these fucntions will all return the node passed as the first argument unless specified
otherwise such as with has/get(this/that) type functions

```js
  const {
    replace,
    css, // (node, stylePropery, val) || (node, { styleProp:'4em' }) set element.style properties
    Class, // (node, class, {=state bool}) // add/remove or toggle classes
    hasClass, // (node, class) -> bool
    attr, // (node, {attr object/string}, {=val primitive}) // set attrs with objects or string pairs or get attr('type') // -> val
    rmAttr, // (node, {attr string}) removes attrs
    hasAttr, // hasAttr(node, {attr string}) -> bool
    getAttr, // getAttr(node, {attr string}) -> string
    setAttr, // setAttr(node, {attr string/object}, {=val primitive})
    attrToggle, // (node, name, state = !node.hasAttribute(name), val = node.getAttribute(name) || '') toggle attrs
    emit, // (node, {type string/Event/CustomEvent}) dispatchEvents on node
    append, prepend, appendTo, prependTo, // (node, {other string/node})
    remove // (node, {=after number}) // remove node or setTimeout after which to remove
  } = rilti.domfn;

```
#### examples of rilti used to build things
[rilti.js todomvc {slightly outdated, will fix}](https://github.com/SaulDoesCode/rilti.js-todomvc)
[grimstack.io blog site](https://grimstack.io)    


#### Create Elements with any tag
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
    // getter/setters work too
    oldtxt: '',
    get txt() { return this.innerText.trim() },
    set txt(val) { this.innerText = val.trim() }
  },
  // listen for events
  on: {
    click(event, element) {
      element.oldtxt = element.txt
      element.txt = 'Sure you want to remove random-tag?'
    },
    mouseout(event, element) {
      element.txt = element.oldtxt
    }
  },
  // listen for events just once
  once: {
    dblclick(event, element) {
      element.remove()
    }
  },
  lifecycle: {
    // manage the element's lifecycle
    create () { ... },
    mount () { ... },
    destroy () { ... }
  }
})
```

#### basic practical examples
```js

const {dom, domfn, run, render} = rilti
const {attr, css, Class, hasClass} = dom
const {div, nav} = dom

const goHome = () => location.replace("https://mysite.xyz/#home")

const navbutton = (inner, click) => div({
  class: 'navbar-button',
  on: {click}
},
  inner
)

const navbar = nav({
    render: 'body',
    class: 'navbar',
    css: { color : '#fff' },
    props: {
      get toggle() {
        return hasClass(this, 'hidden')
      },
      set toggle(state) {
        // This adds or removes the .hidden class on the element
        // Class(element, 'className', state = !hasClass(element))
        Class(this, 'hidden', state)
      }
    }
  },    
  'My Company Title',
  navbutton('home', goHome)
)

run(() => {
  // run post-dom-load code here
  navbar.toggle = true
  console.log(navbar.toggled)
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
  create () {
    css(element, {
      display: 'block',
      width: '20px',
      height: '20px',
      margin: '5px auto',
      cursor: 'pointer',
      backgroundColor: element.ticked ? 'dimgrey' : 'white',
      border: `1px solid ${element.ticked ? 'white' : 'dimgrey'}`
    })
    on.click(el, () => {
      element.ticked = !element.ticked
    })
  },
  mount (element) {
    console.log('tick-box mounted to document')
  },
  destroy (element) {
   console.log('tick-box is no more :(')
  },
  attr: {
    disabled: {
      init (oldValue, value, element) {
        css(element, 'cursor', value === 'true' ? 'not-allowed' : '')
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

#### weight
* unminified : > 26kb
* minified : > 11kb
* minified && compressed : > 6kb

#### licence = MIT
