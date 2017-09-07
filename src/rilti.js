/**
* rilti.js
* @repo github.com/SaulDoesCode/rilti.js
* @author Saul van der Walt
* @licence MIT
**/
var rilti = (() => {

const doc = document;
const root = window;
const undef = void 0;
const NULL = null;
const Keys = Object.keys;
const Def = Object.defineProperty;
const OwnDesc = Object.getOwnPropertyDescriptor;

const curry = (
  fn,
  arity = fn.length,
  next = (...memory) => (...more) => ((more.length + memory.length) >= arity ? fn : next)(...memory.concat(more))
) => next(); // love this

// irony: the case of Case does not match the case of match
const caseMatch = (...cases) => match => cases.some(Case => match === Case || (isFunc(Case) && Case(match))),
arrMeth = (meth, val, ...args) => Array.prototype[meth].apply(val, args),
arrEach = curry(arrMeth, 2)('forEach'),
not = fn => (...args) => !fn(...args),
// all the is this that stuff
isArr = Array.isArray,
isArrlike = o => o && !(o instanceof Function) && isNum(o.length),
isBool = o =>  o === true || o === false,
isDef = o => o !== undef && o !== NULL,
isNill = o => o === undef || o === NULL,
isNull = o => o === NULL,
isNum = o => typeof o === 'number',
isStr =  o => typeof o === 'string',
isFunc = o => o && o instanceof Function,
isObj = o => o && o.constructor === Object,
isPrimitive = caseMatch(isStr,isBool,isNum),
isIterator = o => o && o.toString().includes('Iterator'),
isInt = o => isNum(o) && o % 1 === 0,
isEmpty = o => !o || !((isObj(o) ? Keys(o) : isNum(o.length) && o).length || o.size),
isEl = o => o && o instanceof Element,
isNode = o => o && o instanceof Node,
isNodeList = o => o && (o instanceof NodeList || (isArrlike(o) && arrMeth('every', o, isNode))),
isMap = o => o && o instanceof Map,
isSet = o => o && o instanceof Set,
isInput = o => isEl(o) && 'INPUT TEXTAREA'.includes(o.tagName),
isEq = curry((o1, ...vals) => vals.every(isFunc(o1) ? i => o1(i) : i => o1 === i), 2);

const extend = (host = {}, obj, safe = false, keys = Keys(obj)) => {
  if(keys.length) each(keys, key => {
      if(!safe || (safe && !(key in host))) Def(host, key, OwnDesc(obj, key));
  });
  return host;
}

const yieldloop = (
  count,
  fn,
  done,
  chunksize = 50,
  i = 0,
  chunk = () => {

    const end = Math.min(i + chunksize, count);
    while(i < end) {
      fn(i);
      i++;
    }
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

const flatten = arr => isArrlike(arr) ? arrMeth("reduce", arr, (flat, toFlatten) => flat.concat(isArr(toFlatten) ? flatten(toFlatten) : toFlatten), []) : [arr];

const compose = (...fns) => fns.reduce((f, g) => (...args) => f(g(...args)));

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

const eventListeners = 'eLN';

const EventManager = curry((once, target, type, handle, options = false) => {
  if(isStr(target)) target = query(target);
  if(!target.addEventListener) throw 'bad event target';
  if(isObj(type)) return each(type, (fn, name) => EventManager(once, target, name, fn, options));
  if(!isFunc(handle)) return EventManager.bind(undef, once, target, type);
  // for cloning purposes and odd cases: ELSNRS = event listeners
  if(isNode(target) && !target[eventListeners]) target[eventListeners] = new Set;

  handle = handle.bind(target);

  const handler = evt => {
    handle(evt, target);
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
    handler, type,
    reseat(newTarget, removeOriginal) {
      if(removeOriginal) remove();
      return EventManager(once, newTarget, type, handle, options);
    },
    on:() => add(),
    once:() => add(true),
    off:() => (remove(), manager)
  }

  return add(once);
}, 3);

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
    handle = (arg, arg1, arg2) => {
      original(arg, arg1, arg2);
      deleteHandle(handles, type, handle);
    }
  }
  return addHandle(handles, type, extend(handle, {
    type,
    off: () => deleteHandle(handles, type, handle),
    on: () => addHandle(handles, type, handle.off())
  }));
}

const notifier = (host = {}) => {
  const handles = new Map;

  const addHandlers = mode => (type, handle) => {
    if(!isStr(type)) return each(type, (hndl, htype) => {
      if(isFunc(hndl)) type[htype] = mode(htype, hndl);
    });
    else if(isFunc(handle)) return mode(type, handle);
  }

  return extend(host, {
    on: addHandlers(handleMaker(handles)),
    once: addHandlers(handleMaker(handles, true)),
    off: curry(deleteHandle)(handles),
    hastype: type => handles.has(isFunc(type) ? type.type : type),
    hashandle: (handle, type = handle.type) => handles.has(type) && handles.get(type).has(handle),
    emit(type, arg, arg1, arg2) {
      if(handles.has(type)) handles.get(type).forEach(handle => handle(arg, arg1, arg2));
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

const isReady = () => doc.readyState === 'complete' || isNode(doc.body);

const LoadStack = new Set;
once(root, 'DOMContentLoaded', () => each(LoadStack, fn => fn()).clear());

const run = fn => isReady() ? fn() : LoadStack.add(fn);

const html = input => isFunc(input) ? html(input()) : isNode(input) ? input : doc.createRange().createContextualFragment(input);

const frag = inner => isPrimitive(inner) ? html(inner) : doc.createDocumentFragment();

const emit = curry((node, type, detail) => (
    node.dispatchEvent(!isStr(type) ? type : new CustomEvent(type, detail == undef ? undef : {detail})),
    node // return node
), 2);

// node lifecycle event distributers
const CR = n => emit(n, 'create');
const MNT = n => (!n.didMount && setTimeout(() => emit(n, 'mount').didMount = true, 0), n);
const DST = n => emit(n, 'destroy');

const vpend = (args, dfrag = frag()) => (
  each(flatten(args), arg => dfrag.appendChild(MNT(html(arg)))),
  dfrag
);

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
    if(!isObj(c)) {
      const mode = state ? 'add' : 'remove';
      c.includes(' ') ? each(c.split(' '), cls => node.classList[mode](cls)) : node.classList[mode](c);
    } else each(c, (mode, cls) => node.classList[mode ? 'add' : 'remove'](cls));
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
  setAttr: (node, attr, val = '') => node.setAttribute(attr, val),
  attrToggle: curry(
    (node, name, state = !node.hasAttribute(name), val = node.getAttribute(name) || '') => (
      node[state ? 'setAttribute' : 'removeAttribute'](name, val),
      node // return node
    ),
  2),
  emit,
  append: curry((node, ...args) => (
    dom(node).then(n => n.appendChild(vpend(args))),
    node
  ), 2),
  prepend: curry((node, ...args) => (
    dom(node).then(n => n.prepend(vpend(args))),
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
  remove: (node, after) => (
    isNum(after) ? // if
    setTimeout(() => node.remove(), after) :
    node.remove(), // else
    node // return node
  ),
};

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

const render = (node, host, connector = 'appendChild') => (
  CR(node),
  dom(host).then(h => h[connector](MNT(node)), ([err, selector]) => console.error("render fault:", selector, err)),
  node
);

const isRenderable = caseMatch(isNode, isArrlike, isPrimitive);

const create = (tag, options, ...children) => {
  const el = doc.createElement(tag);

  if(isRenderable(options)) children.unshift(options);
  domfn.append(el, children);

  if(isObj(options)) {
    if('attr' in options) domfn.attr(el, options.attr);
    if(options.css) domfn.css(el, options.css);
    if(options.class) el.className = options.class;
    if(options.props) each(options.props, (val, key) => {
      key in el ? el[key] = val :
      Def(
        el,
        key,
        isObj(val) && (val.get || val.set || 'value' in val) ? val : OwnDesc(options.props, key)
      );
    });
    if(options.methods) extend(el, options.methods);
    if(options.once) once(el, options.once);
    if(options.on) on(el, options.on);
    if(options.lifecycle) each(options.lifecycle, (stage, name) => once(el, name, () => stage(el)));
    if(options.run) run(() => options.run(el));
    if(options.render) render(el, options.render);
    else if(options.renderAfter) render(el, options.renderAfter, 'after');
    else if(options.renderBefore) render(el, options.renderBefore, 'before');
  }

  return CR(el);
}

// find a node independent of DOMContentLoaded state using a promise
const dom = new Proxy(
extend( // Proxy, the audacious old browser breaker :O
  (selector, element = doc) => new Promise((go, no) =>

  isNode(selector) ? go(selector) :

  selector === 'head' ? go(doc.head) :

  isStr(selector) ? run(() => {
    const temp = selector === 'body' ? doc.body : query(selector, element);
    isNode(temp) ? go(temp) : no([404, selector]);
  }) : no([403, selector])
),
  {create,query,queryAll,queryEach,html,frag}
), {
  get: (d, key) => key in d ? d[key] : create.bind(undef, key), // get the d
  set: (d, key, val) => d[key] = val
});

new MutationObserver(muts => each(muts, ({addedNodes, removedNodes, target, attributeName, oldValue}) => {
  if(addedNodes.length) arrEach(addedNodes, MNT);
  if(removedNodes.length) arrEach(removedNodes, DST);
  if(attributeName && attributeName != 'style') checkAttr(attributeName, target, oldValue);
})).observe(doc, {attributes:true, childList:true, subtree:true});

return {dom,domfn,notifier,compose,caseMatch,not,yieldloop,on,once,directive,directives,extend,route,render,run,curry,each,flatten,isMounted,isDef,isNill,isPrimitive,isNull,isFunc,isStr,isBool,isNum,isInt,isIterator,isObj,isArr,isArrlike,isEmpty,isEl,isEq,isNode,isNodeList,isInput,isMap,isSet};
})();
