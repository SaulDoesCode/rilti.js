# rot.js :rat:

a small robust and unapologetic view layer library built for the front-end

### api
| method | description  |
|--------|--------------|
| dom( {object} ) | creates and defines behavior for elements  |
| DOMcontains( {node}, {=parent node} ) | determines whether or not the dom or other node contains a specific node |
| query( {string}, {=string/node} ) | improved alternative to ``document.querySelector``|
| queryAll( {string}, {=string/node} ) | improved alternative to ``document.querySelectorAll``|
| queryEach( {string}, {=string/node}, {function} ) | queries nodes returned by selector and iterates over them like ``[].forEach`` would|
| run( {function} ) | executes a given function when the DOM is loaded |
| curry( {function}, {=arity} ) | curries a function |
| extend( {host object}, {object} ) | extends host object with all props of other object |
| rename( {object}, {[...keys]}, {[...newkeys]} ) | renames keys in an object |
| flatten( {arraylike} ) | flattens multidimensional arraylike objects |
| arraysEqual( {arraylike}, {arraylike} ) | tests whether two arraylike objects are equal |
| EventManager( {target}, {type}, {listener}, {=options} ) | internal method used for managing event listeners |
