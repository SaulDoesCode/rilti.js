# rot.js :rat:

a small robust and unapologetic view layer library built for the front-end

##### currently in alpha phase and subject to breaking changes
Feel free to fork, raise issues. Constructive criticism is welcome

## features
* lifecycle hooks
* event management
* observe attributes
* streamlined element creation
* compatible with webcomponents and almost everything else
* great jquery-like dom manipulation methods using proxy magic
* powerful yet petite event system
* useful methods and utilities
* no classes no extra fuzz, functional positive
* written and distributed in plain es2015/es6
* plugin hooks: add any feature

rot.js harnesses the power of Proxy objects to make some magical behavior possible.

#### Plugins:
* rot-tilt.js - compact mouse motion based element tilting effect, based on vanilla-tilt.js
* webcomponents.js - rot.js web component wrapper, rot.Component(tag, config = {create, mount, destroy, adopted, attr, props, methods})
* work in progress rotified anime.js

#### planned features
* offer collection of useful optional plugins

### API
| method | description  |
|--------|--------------|
| ``dom["any-name"]( {=object}, {...children} )`` | where the magic happens, define behavior for elements and see them come to life |
| ``dom( {string/node}, {=string/node} )`` | finds nodes and proxifies them, gives them all the dom manip magic |
| ``dom.query( {string}, {=string/node} )`` | improved alternative to ``document.querySelector``|
| ``dom.queryAll( {string}, {=string/node} )`` | improved alternative to ``document.querySelectorAll``|
| ``dom.queryEach( {string}, {=string/node}, {function} )`` | queries nodes returned by selector and iterates over them like ``[].forEach`` would|
| ``dom.on( {target}, {type}, {listener}, {=options} )`` | generates event listener |
| ``dom.once( {target}, {type}, {listener}, {=options} )`` | generates event listener that triggers only once |
| ``dom.html( {string} )`` | converts strings to html nodes |
| ``render( {...node} )( {=parent/document.body} )`` | renders nodes to document.body or node of your choice |
| ``run( {function} )`` | executes a given function when the DOM is loaded |
| ``route( {=hashString}, {function})`` | detect and respond to location.hash changes |
| ``curry( {function}, {=arity} )`` | curries a function |
| ``each( {iterable}, {function} )`` | loop through objects, numbers, array(like)s, sets, maps... |
| ``extend( {host object}, {object} )`` | extends host object with all props of other object |
| ``safeExtend( {host object}, {object} )`` | extends host object with all props of other object if they don't conflict with host object |
| ``flatten( {arraylike} )`` | flattens multidimensional arraylike objects |
| ``notifier( =obj )`` | extendable evtsystem/pub sub pattern |
| ``DOMcontains( {node}, {=parent node} )`` | determines whether or not the dom or other node contains a specific node |

##### rot also exports a couple of useful type testing functions
usage : ``rot.isX( {any} ) // -> boolean``  
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

[rot.js todomvc](https://github.com/SaulDoesCode/rot.js-todomvc)

```javascript

const {dom, run, render} = rot;
// pre-tagged element creation methods, custom element names like dom['custom_element-x'] works too
const {div, nav} = dom;

function goHome() {
  location.replace("https://mysite:3000/#home");
}

const navbutton = (inner, click) => div({
  class : 'navbar-button',
  on : { click }
}, inner);

const navbar = nav({
    class : 'navbar',
    style : {
      color : '#fff',
    },
    attr : {
      id : 'mainbar'
    },
    props : {
      toggle() {
        this.class('hidden');
      },
      get isToggled() {
        return this.class.hidden;
      }
    }
  },    
  'My Company Title',
  navbutton('home', goHome)
);

// render your nodes
render(navbar)("body");

run(() => {
  // run post-dom-load code here
  navbar.toggle();
  console.log(navbar.isToggled);
});

// observe attributes
rot.observeAttr('customAttr', {
  init(element, value) {

  },
  update(element, value, oldValue) {

  },
  destroy(element, value, oldValue) {

  }
});
// unobserve Attributes
rot.unobserveAttr('customAttr');


// create elements with any tag
dom['randomtag']({
  render: ".main > header", // render to dom using selectors or nodes
  lifecycle: {
    // manage the element's lifecycle
    create() {

    },
    mount() {

    },
    destroy() {

    }
  }
});


// or use the webcomponent.js plugin
rot.Component('tick-box', {
  create(element) {
   element.data.on('set:ticked', val => {
     if(element.attr['data-ticked'] != val.toString()) element.style.backgroundColor = val ? "white" : "dimgrey";
     else element.attr['data-ticked'] = val;
   });
   element.on.click(() => element.ticked = !element.ticked)); // or element.on('click', fn)
  },
  mount(element) {
   element.ticked = element.attr['data-ticked'] == 'true';
  },
  destroy(element) {
   console.log('tick-box is no more :(');
  },
  // monitor attributes "attributeChangedCallback"
  attr: {
   "data-ticked": (oldValue, value, element) => element.ticked = value == 'true',
  }
});

```

#### weight
* unminified : > 15kb
* minified : > 9kb
* minified && gziped : > 4.5kb

#### licence = MIT
