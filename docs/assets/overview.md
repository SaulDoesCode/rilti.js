# **rilti.js**
## a small opinionated furture forward frontend framework
_______________________________

🐫 🐱 👶

### features
* elm-like ideas about architecture
* mostly declarative programming style
* node lifecycle hooks
* models with data binding, validation, events & sync/async accessors
* generate all your elements in js don't write clunky html
* program without concern for page load state
* components aka. custom-elements. No polyfill needed!
* vue-like directives aka custom attributes
* great dom manipulation functions
* functional composition & currying
* powerful notifier system (pub/sub with proxy magic)
* no classes, no this, no extra fuzz, functional positive
* no old javascript, we use modern features like Proxy
* a gziped rilti.min.js weighs > 6kb

### The Dao of Rilti

1. Nominalism Good | Obscuritanism, Idealism & Universalism Bad
   * Object Oriented anything is evil (no classes, no this)
   * Reserve identities only for things that would be otherwise obscure
   * Don't hide things let things be what they are
   * Data/Message passing before abstraction
   * Logic is also just data (with potential) so pass it around too
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

A MASA example is ``rilti.listMap`` where the get/set methods are one function that is both the object and its interface.      
``listMap() -> {each, has, del, map} = fn(key, val)``    

Different strokes for different folks:
Also look at ``rilti.on`` which can be used like this ``on['any-event'](node, func, =options)``,
as well as like this ``on('any-event', node)(func, =options)``    
and also ``on(node, { click: e => {} }, =options)``.

#### examples of rilti used to build things in the wild
* [Rilti News - Progressive Web App](https://grimstack.io/news/)
* [clone and open ./examples/todo.html](https://github.com/SaulDoesCode/rilti.js/archive/master.zip)      
* [grimstack.io blog site](https://grimstack.io)     
* [grimstack.io/portfolio WIP Portfolio](https://grimstack.io/portfolio)     
* [rilti-todomvc](https://github.com/SaulDoesCode/rilti-todomvc)      

#### Plugins:
* rilti-tilt.js - compact mouse motion based element tilting effect, based on vanilla-tilt.js

#### future plans
* offer collection of useful optional plugins
* stabalize features and release
* expand with a UI library
