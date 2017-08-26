# :dizzy: rilti.js :dizzy:

a small flavorful and unapologetic view layer library built for the front-end

##### currently in alpha phase and subject to breaking changes
Feel free to fork or raise issues. Constructive criticism is welcome

## features
* lifecycle hooks
* event management
* create and observe custom attributes
* fast and streamlined element creation
* great dom manipulation functions
* functional composition
* powerful yet petite notifier system (pub/sub)
* webcomponents
* no classes, no this, no extra fuzz, functional positive
* written and distributed in plain es2015/es6

#### Plugins:
* rilti-tilt.js - compact mouse motion based element tilting effect, based on vanilla-tilt.js

#### planned features
* offer collection of useful optional plugins

### API
| method | description  |
|--------|--------------|
| ``dom["anytagname"]( {=object}, {...children} )`` | where the magic happens, define behavior for elements and see them come to life |
| ``dom( {string/node}, {=string/node} )`` | same as querySelector but returns a promise |
| ``dom.query( {string}, {=string/node} )`` | improved alternative to ``document.querySelector``|
| ``dom.queryAll( {string}, {=string/node} )`` | improved alternative to ``document.querySelectorAll``|
| ``dom.queryEach( {string}, {=string/node}, {function} )`` | queries nodes returned by selector and iterates over them like ``[].forEach`` would|
| ``dom.html( {string} )`` | converts strings to html nodes |
| ``on( {target}, {type}, {listener}, {=options} )`` | generates event listener |
| ``once( {target}, {type}, {listener}, {=options} )`` | generates event listener that triggers only once |
| ``render( {node}, {=selectorString/node} )`` | renders nodes to a node of your choice, independent of ready state |
| ``run( {function} )`` | executes a given function when the DOM is loaded |
| ``route( {=hashString}, {function})`` | detect and respond to location.hash changes |
| ``curry( {functions} )`` | curries a function |
| ``compose( {...functions} )`` | compose functions, compose(fn1,fn2,fn3)(val) // -> result |
| ``each( {iterable}, {function} )`` | loop through objects, numbers, array(like)s, sets, maps... |
| ``extend( {host object}, {object}, {=safe bool} )`` | extends host object with all props of other object, won't overwrite if safe is true |
| ``flatten( {arraylike} )`` | flattens multidimensional arraylike objects |
| ``notifier( {=obj} )`` | extendable event system /pub sub pattern |
| ``DOMcontains( {node}, {=parent node} )`` | determines whether or not the dom or other node contains a specific node |
| ``(from WC plugin) .Component(tag, config = {create, mount, destroy, adopted, attr, props, methods})`` | define custom elements |

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

#### example time!!!

### DOM manipulation
rilti contains a ``domfn`` that contains several useful dom manipulation functions.
these fucntions will all return the node passed as the first argument unless specified
otherwise such as with has/get(this/that) type functions

```js
  const {
    replace,
    clone, // (node) clones nodes (and their(+childNodes) event listeners if they were made using ``on || once``)
    css, // (node, stylePropery, val) || (node, { styleProp:'4em' }) set element.style properties
    Class, // (node, class, {=state bool}) // add/remove or toggle classes
    hasClass, // (node, class) -> bool
    attr, // (node, {attr object/string}, {=val primitive}) // set attrs with objects or string pairs or get attr('type') // -> val
    removeAttr, // (node, {attr string}) removes attrs
    hasAttr, // hasAttr(node, {attr string}) -> bool
    getAttr, // getAttr(node, {attr string}) -> string
    setAttr, // setAttr(node, {attr string/object}, {=val primitive})
    attrToggle, // (node, name, state = !node.hasAttribute(name), val = node.getAttribute(name) || '') toggle attrs
    emit, // (node, {type string/Event/CustomEvent}) dispatchEvents on node
    append, prepend, appendTo, prependTo, // (node, {other string/node})
    remove // (node, {=after number}) // remove node or setTimeout after which to remove
  } = rilti.domfn;

```

[rilti.js todomvc](https://github.com/SaulDoesCode/rilti.js-todomvc)

```javascript

const {dom, run, render} = rilti;
const {div, nav} = dom;
const {Class, hasClass, attr, css} = domfn;

function goHome() {
  location.replace("https://mysite:3000/#home");
}

const navbutton = (inner, click) => div({
  class : 'navbar-button',
  on : { click }
}, inner);

const navbar = nav({
    render:'body',
    class : 'navbar',
    css : { color : '#fff' },
    attr : { id : 'mainbar' },
    toggle() { Class(navbar,'hidden') },
    get isToggled() {
        return hasClass(navbar, 'hidden');
    }
  },    
  'My Company Title',
  navbutton('home', goHome)
);

run(() => {
  // run post-dom-load code here
  navbar.toggle();
  console.log(navbar.isToggled);
});

// observe attributes
rilti.observeAttr('custom-attr', {
  init(element, value) { ... },
  update(element, value, oldValue) { ... },
  destroy(element, value, oldValue) { ... }
});
// unobserve Attributes
rilti.unobserveAttr('custom-attr');


// create elements with any tag
dom['randomtag']({
  render: ".main > header", // render to dom using selectors or nodes
  lifecycle: {
    // manage the element's lifecycle
    create() { ... },
    mount() { ... },
    destroy() { ... }
  }
});

// Web Components
const {on, domfn} = rilti;
const {css} = domfn;

rilti.Component('tick-box', {
  props: {
    get ticked() {
      return attr(this, 'data-ticked') === 'true';
    },
    set ticked(val) {
      if(!this.disabled) {
        attr(this, 'data-ticked', val);
        css(this, {
          backgroundColor: val ? 'dimgrey' : 'white',
          border: `1px solid ${val ? 'white' : 'dimgrey'}`
        });
      }
    }
  },
  mount(element) {
    css(element, {
      display:'block',
      width:'20px',
      height: '20px',
      margin:'5px auto',
      cursor:'pointer',
      backgroundColor: element.ticked ? 'dimgrey' : 'white',
      border: `1px solid ${element.ticked ? 'white' : 'dimgrey'}`
    });
    on(el, 'click', () => element.ticked = !element.ticked);
  },
  destroy(element) {
   console.log('tick-box is no more :(');
  },
  attr: {
    disabled(oldValue, value, element) {
      css(element, 'cursor', value === 'true' ? 'not-allowed' : '');
    }
  }
});

```

#### see how fast rilti.js renders your elements

```html
<script src="/rilti/dist/rilti.min.js"></script>
<script>
  const testRiltiBlocking = (count = 10000) => {
    const span = rilti.dom.span;
    const start = performance.now();
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
    }, "damn daniel, back at it again with those white spans ", count--);

    console.log(`That took ${performance.now() - start}ms`);
  }
  testRiltiBlocking(); // -> this usually takes ~ 7800ms on my i5 machine and is blocking

  const testRiltiChunked = (count = 10000) => {
    const each = rilti.each, span = rilti.dom.span;
    const start = performance.now();
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
      "damn daniel, back at it again with those white spans ", count--)
    );
    console.log(`That took ${performance.now() - start}ms`);
  }
  testRiltiChunked();
  // -> site useable even while rendering thousands of nodes
</script>
```

#### weight
* unminified : > 18kb
* minified : > 8kb
* minified && compressed : > 5kb

#### licence = MIT
