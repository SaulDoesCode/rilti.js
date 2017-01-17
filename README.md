# rot.js :rat:

a small robust and unapologetic view layer library built for the front-end

##### currently in alpha phase and subject to breaking changes
Feel free to fork, raise issues.
Constructive criticism is welcome

### features
* lifecycle hooks
* event management
* observe attributes
* informers (Observable like reactive objects)
* streamlined element creation
* minimal set of dom manipulation methods
* useful methods and utilities
* no classes no extra fuzz
* plugins can extend and add any feature
* written and distributed in plain es2015/es6

### planned features
* managed custom attributes aka directives
* uniform interface for non native events
* more reactivity and virtualization
* offer collection of useful optional plugins

### api
| method | description  |
|--------|--------------|
| ``dom({tag}, {object}, {...children} )`` | where the magic happens it creates and defines behavior for elements from given options |
| ``dom.query( {string}, {=string/node} )`` | improved alternative to ``document.querySelector``|
| ``dom.queryAll( {string}, {=string/node} )`` | improved alternative to ``document.querySelectorAll``|
| ``dom.queryEach( {string}, {=string/node}, {function} )`` | queries nodes returned by selector and iterates over them like ``[].forEach`` would|
| ``dom.on( {target}, {type}, {listener}, {=options} )`` | generates event listener |
| ``dom.once( {target}, {type}, {listener}, {=options} )`` | generates event listener that triggers only once |
| ``render( {...node} )( {=parent/document.body} )`` | renders nodes to document.body or node of your choice |
| ``run( {function} )`` | executes a given function when the DOM is loaded |
| ``curry( {function}, {=arity} )`` | curries a function |
| ``extend( {host object}, {object} )`` | extends host object with all props of other object |
| ``flatten( {arraylike} )`` | flattens multidimensional arraylike objects |
| ``evtsys( )`` | event emitter/ pub sub pattern |
| ``DOMcontains( {node}, {=parent node} )`` | determines whether or not the dom or other node contains a specific node |
| ``EventManager( {target}, {type}, {listener}, {=options} )`` | internal method used for managing event listeners |

##### rot also exports a few type testing functions
usage : ``rot.isX( {any} ) // -> boolean``  
isBool, isFunc,
isDef, isUndef,
isNull, isEmpty,
isNum, isInt,
isStr,isObj,
isArr, isArrlike,
isMap, isSet,
isEl, isNode, isNodeList,
isInput, isPrimitive, isNativeEvent

rot.js can work with module loaders, but will simply be global if none are used

#### example time!!!

[rot.js todomvc](https://github.com/SaulDoesCode/rot.js-todomvc)

```javascript

  const {dom} = rot;
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
  rot.render(navbar)(document.body);

  rot.run(() => {
    // post dom load code here
    navbar.toggle();
    console.log(navbar.isToggled);
  });
```

#### weight
* unminified : > 16kb
* minified : > 10kb
* minified && gziped : > 4.5kb

#### licence = MIT
