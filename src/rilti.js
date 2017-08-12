/**
* rilti.js
* @repo github.com/SaulDoesCode/rilti.js
* @author Saul van der Walt
* @licence MIT
**/
var rilti = (() => {

const doc = document,
root = window,
undef = void 0,
NULL = null,
len = 'length';

const curry = (
  fn,
  arity = fn.length,
  next = (...memory) => (...more) => ((more.length + memory.length) >= arity ? fn : next)(...memory.concat(more))
) => next(); // love this

// irony: the case of Case does not match the case of match
const composeTest = (...cases) => match => cases.some(Case => match === Case || (isFunc(Case) && Case(match))),
arrMeth = (meth, val, ...args) => Array.prototype[meth].apply(val, args),
arrEach = curry(arrMeth, 2)('forEach'),
not = fn => (...args) => !fn(...args),
// all the is this that stuff
isArr = Array.isArray,
isArrlike = o => !isFunc(o) && len in o,
isBool = o =>  o === true || o === false,
isDef = o => o !== undef && o !== NULL,
isNill = o => o === undef || o === NULL,
isStr =  o => typeof o == 'string',
isNull = o => o === NULL,
isNum = o => o && o instanceof Number,
isFunc = o => o && o instanceof Function,
isObj = o => o && o.constructor === Object,
isPrimitive = composeTest(isStr,isBool,isNum),
isIterator = o => o && o.toString().includes('Iterator'),
isInt = o => isNum(o) && o % 1 === 0,
isEmpty = o => !((isObj(o) ? Object.keys(o) : len in o && o)[len] || o.size),
isEl = o => o && o instanceof Element,
isNode = o => o && o instanceof Node,
isNodeList = o => o && (o instanceof NodeList || (isArrlike(o) && arrMeth('every', o, isNode))),
isMap = o => o && o instanceof Map,
isSet = o => o && o instanceof Set,
isInput = o => o && o.tagName && 'INPUT TEXTAREA'.includes(o.tagName),
isEq = curry((o1, ...vals) => vals.every(isFunc(o1) ? i => o1(i) : i => o1 === i), 2);

const yieldloop = (
  count,
  fn,
  done,
  chunksize = 50,
  i = 0,
  chunk = () => {

    const end = Math.min(i + chunksize, count);
    while(i < end) fn(i++);
    i < count ? setTimeout(chunk, 0) : isFunc(done) && done();

}) => chunk();

const each = (iterable, func, i = 0) => {
  if(!isNill(iterable)) {
    if(iterable.forEach) iterable.forEach(func);
    else if(iterable.length > 0) arrEach(iterable, func);
    else if(isObj(iterable)) for(i in iterable) func(iterable[i], i, iterable);
    else if (isInt(iterable)) yieldloop(iterable, func);
    else if((iterable.entries || isIterator(iterable))) for (const [key, value] of iterable) func(key, value, iterable);
  }
  return iterable;
}

const extend = (host, obj, safe = false, keys = Object.keys(obj)) => {
  if(keys[len]) each(keys, key => {
      if(!safe || (safe && !(key in host)))
        Object.defineProperty(host, key, Object.getOwnPropertyDescriptor(obj, key));
  });
  return host;
}

const flatten = arr => isArrlike(arr) ? arrMeth("reduce", arr, (flat, toFlatten) => flat.concat(isArr(toFlatten) ? flatten(toFlatten) : toFlatten), []) : [arr];

const compose = (...fns) => fns.reduce((f, g) => (...args) => f(g(...args)));

// aren't fuggly one liners just the best
const pipe = val => (fn, ...args) => (
  typeof fn == "function" ? pipe(fn(val, ...args)) : fn === true ? pipe(args.shift()(val, ...args)) : !args.length && !fn ? val : pipe(val)
);

const query = (selector, element = doc) => (
  // return if node else query dom
  isNode(selector) ?
  selector :
  // ikr it's weird
  query(element).querySelector(selector)
);
const queryAll = (selector, element = doc) => Array.from(query(element).querySelectorAll(selector));
const queryEach = (selector, func, element = doc) => (
  !isFunc(func) && ([func, element] = [element, doc]),
  each(queryAll(selector, element), func)
);

const isMounted = (descendant, parent = doc) => parent === descendant || Boolean(parent.compareDocumentPosition(descendant) & 16);

//const passive_events = ['wheel'];
//passive_events.includes(type) ? {passive:true} : false
const eventListeners = 'EvtLs';

const EventManager = curry((once, target, type, handle, options = false) => {
  if(isStr(target)) target = query(target);
  if(!target.addEventListener) throw 'bad event target';
  // for cloning purposes and odd cases: ELSNRS = event listeners
  if(isNode(target) && !target[eventListeners]) target[eventListeners] = new Set;

  const handler = evt => {
    handle.call(target, evt, target);
    if(once) remove();
  }

  const remove = () => {
    target.removeEventListener(type, handler);
    target[eventListeners] && target[eventListeners].delete(manager);
  }

  const add = mode => {
    once = !!mode;
    remove();
    target.addEventListener(type, handler, options);
    target[eventListeners] && target[eventListeners].add(manager);
    return manager;
  }

  const manager = {
    handler,
    type,
    reseat(newTarget, removeOriginal) {
      if(removeOriginal) remove();
      return EventManager(once, newTarget, type, handle, options);
    },
    on:() => add(),
    once:() => add(true),
    off:() => (remove(), manager)
  }

  return add(once);
}, 4);

const once = EventManager(true);
const on = EventManager(false);

/*const debounce = (func, wait, immediate) => {
	let timeout;
	return (...args) => {
		const later = () => {
			timeout = null;
			if (!immediate) func(...args);
		},
    callNow = immediate && !timeout;
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
		if(callNow) func(...args);
	}
}*/

const deleteHandle = (handles, type, handle) => ((handles.has(type) && !handles.get(type).delete(handle).size) && handles.delete(type), handle);
const addHandle = (handles, type, handle) => ((handles.has(type) ? handles : handles.set(type, new Set)).get(type).add(handle), handle);

const handleMaker = (handles, one = false) => (type, handle) => {
  if(one) {
    const original = handle;
    handle = (...args) => {
      original.apply(NULL, args);
      deleteHandle(handles, type, handle);
    }
  }
  handle.type = type;
  handle.off = () => deleteHandle(handles, type, handle);
  handle.on = () => addHandle(handles, type, handle.off());
  return addHandle(handles, type, handle);
}

const notifier = (host = {}) => {
  const handles = new Map;

  const [once, on] = [handleMaker(handles, true), handleMaker(handles)];

  const addHandlers = mode => (type, handle) => {
    if(!isStr(type)) return each(type, (hndl, htype) => {
      if(isFunc(hndl)) type[htype] = mode(htype, hndl);
    });
    else if(isFunc(handle)) return mode(type, handle);
  }

  return extend(host, {
    on: addHandlers(on),
    once: addHandlers(once),
    off: curry(deleteHandle)(handles),
    hastype: type => handles.has(isFunc(type) ? type.type : type),
    hashandle: (handle, type = handle.type) => handles.has(type) && handles.get(type).has(handle),
    emit(type, ...args) {
      if(handles.has(type)) handles.get(type).forEach(handle => handle.apply(NULL, args));
      return host;
    }
  });
}

const route = notifier((hash, fn) => {
  if(!route.active) {
    on(root, 'hashchange', () => {
      const h = location.hash;
      route.emit(route.hastype(h) ? h : 'default', h);
    });
    route.active = true;
  }
  if(isFunc(hash)) [fn, hash] = [hash, 'default']; // the ol' swopperoo ...and thank the javascript gods for destructuring
  if(hash !== 'default' && !hash.includes('#/')) hash = '#/'+hash;
  if(location.hash === hash || hash === 'default') fn(location.hash);
  return route.on(hash, fn);
});

const isReady = () => doc.readyState === 'complete';

const LoadStack = new Set;
once(root, 'DOMContentLoaded', () => each(LoadStack, fn => fn()));

const run = fn => isReady() ? fn() : LoadStack.add(fn);

const html = input => isNode(input) ? input : doc.createRange().createContextualFragment(input);

const domfrag = inner => isPrimitive(inner) ? html(inner) : doc.createDocumentFragment();

const CR = n => (n.notifier && n.notifier.emit('create', n), n);
const MNT = n => (n.notifier && !n.didMount && setTimeout(() => (n.didMount = true, n.notifier.emit('mount', n)), 0), n);
const DST = n => (n.notifier && n.notifier.emit('destroy', n), n);

const vpend = Args => {
  const args = flatten(Args);
  if(args.length === 1) return MNT(html(args[0]));

  const dfrag = domfrag();
  args.forEach(arg => dfrag.appendChild(MNT(html(arg))));
  return dfrag;
}

const domfn = {
  replace: (node, val) => (
    node.replaceWith ? node.replaceWith(val) : node.parentNode.replaceChild(val, node),
    val // don't return node because val is the new node
  ),
  clone(node) {
    const clone = node.cloneNode();
    if(node[eventListeners]) each(node[eventListeners], l => l.reseat(clone));
    each(node.childNodes, n => clone.appendChild(domfn.clone(n)));
    return clone;
  },
  css: curry((node, styles, prop) => (
      isObj(styles) ? // if
      each(styles, (p, key) => node.style[key] = p) :
      isEq(isStr,styles,prop) && (node.style[styles] = prop), // else
      node // return node
  ), 2),
  Class: curry((node, c, state = !node.classList.contains(c)) => {
    state = state ? 'add' : 'remove';
    c.includes(' ') ? each(c.split(' '), cls => node.classList[state](cls)) : node.classList[state](c);
    return node;
  }, 2),
  hasClass: curry((node, name) => node.classList.contains(name)),
  attr: curry((node, attr, val) => {
    if(node.attributes) {
      if(isObj(attr)) each(attr, (v, a) => {
        node.setAttribute(a, v);
        checkAttr(a, node);
      });
      else if(isStr(attr)) {
        if(!isPrimitive(val)) return node.getAttribute(attr);
        node.setAttribute(attr, val);
        checkAttr(attr, node);
      }
   }
   return node;
  }, 2),
  removeAttr: (node, attr) => (
    node.removeAttribute(attr),
    node // return node
  ),
  hasAttr: (node, attr) => node.hasAttribute(attr),
  getAttr: (node, attr) => node.getAttribute(attr),
  setAttr: (node, attr, val = '') => attr(node, attr, val),
  attrToggle: curry(
    (node, name, state = !node.hasAttribute(name), val = node.getAttribute(name) || '') => (
      node[state ? 'setAttribute' : 'removeAttribute'](name, val),
      node // return node
    ),
  2),
  emit: curry((node, type, detail) => (
      node.dispatchEvent(!isStr(type) ? type : new CustomEvent(type, {detail})),
      node // return node
  ), 2),
  append: curry((node, ...args) => {
    isNode(node) ? node.appendChild(vpend(args)) :
    isStr(node) && dom(node).then(n => n.appendChild(vpend(args)));
    return node;
  }, 2),
  prepend: curry((node, ...args) => (
    node.prepend(vpend(args)),
    node // return node
  ), 2),
  appendTo: curry((node, val) => (
    dom(val).then(v => v.appendChild(node)),
    node // return node
  )),
  prependTo: curry((node, val) => (
    dom(val).then(v => v.prepend(node)),
    node // return node
  )),
  remove:(node, after) => (
    isNum(after) ? // if
    setTimeout(() => node.remove(), after) :
    node.remove(), // else
    node // return node
  ),
};

const {append, attr, css} = domfn;

const directives = new Map;
const dirInit = (el, name) => (
  el[name+"_init"] = true,
  el // return el
);

const checkAttr = (name, el, oldValue) => {
  if(directives.has(name)) {
      const val = el.getAttribute(name);
      const {init, update, destroy} = directives.get(name);
      if(isPrimitive(val)) {
          if(!el[name+"_init"]) init(dirInit(el, name), val);
          else update && val != oldValue && update(el, val, oldValue);
      } else destroy && destroy(el, val, oldValue);
  }
}

const directive = (name, stages) => {
  directives.set(name, stages);
  run(() => queryEach(`[${name}]`, el => checkAttr(name, el)));
}

const rerr = ([err, selector]) => console.error("render fault:", selector, err);
const render = (node, host) => dom(host).then(h => h.appendChild(MNT(node)), rerr);

const isRenderable = composeTest(isNode, isStr, isArrlike);

const ifHas = obj => (keys, fn) => {
  if(
    keys in obj || isArr(keys) && keys.some(key => key in obj && (keys = key))
  ) {
    fn(obj[keys], keys);
    delete obj[keys];
  }
}

const create = (tag, options, ...children) => {
  const el = doc.createElement(tag);
  const n = el.notifier = notifier();

  if(isRenderable(options)) children.unshift(options);
  append(el, flatten(children));

  if(isObj(options)) {
    const ifhas = ifHas(options);
    ifhas(['class', 'className'], c => el.className = c);
    ifhas(['on', 'once'], (listeners, mode) => {
      each(listeners, (handle, type) => {
        EventManager(mode === 'once', el, type, handle);
      });
    });
    ifhas('attr', attr(el));
    ifhas('css', css(el));
    ifhas('lifecycle', n.once);

    each(options, (val, key) => {
      if(key === 'action') el.action = on(el, 'click', val);
      else if(key !== 'render') {
        isObj(val) ? extend(el, val) : el[key] = val;
      } else render(CR(el), val);
    });
  }

  return CR(el);
}

// find a node independent of DOMContentLoaded state using a promise
const dom = new Proxy(extend( // Proxy, the audacious old browser breaker :O
  (selector, element = doc) => new Promise((go, no) =>

  selector === 'head' ? go(doc.head) :

  isNode(selector) ? go(selector) :

  isStr(selector) ? run(() => {
    const temp = selector === 'body' ? doc.body : query(selector, element);
    isNode(temp) ? go(temp) : no([404, selector]);
  }) : no([403, selector])
),
  {create,query,queryAll,queryEach,html,domfrag}
), {
  get: (d, key) => key in d ? d[key] : create.bind(NULL, key), // get the d
  set: (d, key, val) => d[key] = val
});

new MutationObserver(muts => each(muts, ({addedNodes, removedNodes, target, attributeName, oldValue}) => {
  if(addedNodes.length) arrEach(addedNodes, MNT);
  if(removedNodes.length) arrEach(removedNodes, DST);
  if(attributeName && directives.has(attributeName)) checkAttr(attributeName, target, oldValue);
})).observe(doc, {attributes:true, childList:true, subtree:true});

return {dom,domfn,notifier,pipe,compose,composeTest,not,yieldloop,on,once,directive,directives,extend,route,render,run,curry,each,flatten,isMounted,isDef,isNill,isPrimitive,isNull,isFunc,isStr,isBool,isNum,isInt,isIterator,isObj,isArr,isArrlike,isEmpty,isEl,isEq,isNode,isNodeList,isInput,isMap,isSet};
})();
