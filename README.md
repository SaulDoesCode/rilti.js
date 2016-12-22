# rot.js :rat:

a small robust and unapologetic view layer library built for the front-end

##### currently in alpha phase and subject to breaking changes
feel free to fork, raise issues
constructive criticism is welcome 

### features
* lifecycle hooks
* event management
* informers (Observable like reactive objects)
* streamlined element creation
* useful methods and utilities
* no classes no extra fuzz
* plugins can extend and add any feature
* written and distributed in plain es2015/es6

### api
| method | description  |
|--------|--------------|
| ``dom( {object} )`` | where the magic happens it creates and defines behavior for elements from given options |
| ``DOMcontains( {node}, {=parent node} )`` | determines whether or not the dom or other node contains a specific node |
| ``query( {string}, {=string/node} )`` | improved alternative to ``document.querySelector``|
| ``queryAll( {string}, {=string/node} )`` | improved alternative to ``document.querySelectorAll``|
| ``queryEach( {string}, {=string/node}, {function} )`` | queries nodes returned by selector and iterates over them like ``[].forEach`` would|
| ``run( {function} )`` | executes a given function when the DOM is loaded |
| ``curry( {function}, {=arity} )`` | curries a function |
| ``extend( {host object}, {object} )`` | extends host object with all props of other object |
| ``rename( {object}, {[...keys]}, {[...newkeys]} )`` | renames keys in an object |
| ``flatten( {arraylike} )`` | flattens multidimensional arraylike objects |
| ``informer( )`` | small Observable like notifier/informer objects |
| ``EventManager( {target}, {type}, {listener}, {=options} )`` | internal method used for managing event listeners |
| ``on( {target}, {type}, {listener}, {=options} )`` | generates event listener |
| ``once( {target}, {type}, {listener}, {=options} )`` | generates event listener that triggers only once |

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
isInput, isPrimitive, isNativeEvent,

rot.js can work with module loaders, but will simply be global if none are used

#### example time!!!

```javascript

  const {dom} = rot;
  const {div, nav} = dom;

  function goHome() {
    document.location.replace("https://mysite:3000/#home");
  }

  const navbutton = (inner, click) => div({
    class : 'navbar-button',
    inner,
    on : { click }
  });

  const navbar = nav({
    class : 'navbar',
    style : {
      color : '#fff',
    },
    attr : {
      id : 'mainbar'
    },
    props : {
      get importantThing() {
        return this.importantPropery;
      },
      hide() {
        this.css({
          display:'none';
        });
      },
    },
    inner : [
      'My Company Title',
      navbutton('home', goHome),
    ]
  });

  rot.run(() => {
    // post dom load code here
    navbar.appendTo(document.body);

    console.log(navbar.importantThing);
  });
```

#### weight
* unminified : > 18kb
* minified : > 11kb
* minified && gziped : > 5kb

#### licence = MIT
