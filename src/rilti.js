/**
* rilti.js
* @repo github.com/SaulDoesCode/rilti.js
* @author Saul van der Walt
* @licence MIT
**/
var rilti = (() => {
"use strict";

const doc = document,
root = window,
undef = void 0,
NULL = null,
keys = Object.keys,
forEach = 'forEach',
InputTypes = 'INPUT TEXTAREA';

const curry = (
  fn,
  arity = fn.length,
  next = (...memory) => (...more) => ((more.length + memory.length) >= arity ? fn : next)(...memory.concat(more))
) => next(); // love this

// irony: the case of Case does not match the case of match
const composeTest = (...cases) => match => cases.some(Case => match == Case || (isFunc(Case) && Case(match))),
// don't curry just because you want to bind
bindr = (fn, ...args) => fn.bind(NULL, ...args),
arrMeth = (meth, val, ...args) => Array.prototype[meth].apply(val, args),
arrEach = bindr(arrMeth, forEach),
typeinc = str => obj => toString.call(obj).indexOf(str) !== -1,
// all the is this that stuff
isInstance = (o, t) => o instanceof t,
isDef = o => o !== undef && o !== NULL,
isUndef = o => o === undef || o === NULL,
isNull = o => o === NULL,
isFunc = o =>  typeof o =='function',
isStr =  o => typeof o =='string',
isBool = o =>  o === true || o === false,
isNum = o => !isBool(o) && !isNaN(Number(o)),
isPrimitive = s => isStr(s) || isBool(s) || !isNaN(s),
isInt = val => isNum(val) && val % 1 === 0,
isObj = typeinc('Object'),
isIterator = typeinc('Iterator'),
isArr = Array.isArray,
isArrlike = o => o && typeof o.length != 'undefined',
isEmpty = val => (isUndef(val) || isFunc(val)) || !(isObj(val) ? keys(val).length : isArrlike(val) ? val.length : val.size),
isNode = o => o && isInstance(o, Node),
isNodeList = nl => isInstance(nl, NodeList) || (isArrlike(nl) && arrMeth('every', nl, isNode)),
isEl = typeinc('HTML'),
isMap = typeinc('Map'),
isSet = typeinc('Set'),
isInput = el => isEl(el) && InputTypes.indexOf(el.tagName) !== -1,
isEq = curry((o1, ...vals) => vals.every(isFunc(o1) ? i => o1(i) : i => o1 === i), 2);

const yieldloop = (count, fn, done, chunksize = 60, i = 0) => {
    const chunk = () => {
      const end = Math.min(i + chunksize, count);
      while(i < end) fn(i++);
      if (i < count) setTimeout(chunk, 0);
      else if(done) done();
    }
    chunk();
}

const each = (iterable, func, i = 0) => {
  if(!isEmpty(iterable)) {
    iterable[forEach] ? iterable[forEach](func) : isArrlike(iterable) && arrEach(iterable, func);
    if(isObj(iterable)) for(i in iterable) func(iterable[i], i, iterable);
  } else if (isInt(iterable)) yieldloop(iterable, func);
  else if(iterable && (iterable.entries || isIterator(iterable))) for (let [key, value] of iterable) func(key, value, iterable);
  return iterable;
}

const extend = (host, obj, safe = false) => {
  if(!isEmpty(obj)) each(keys(obj), key => {
      if(!safe || (safe && !(key in host)))
        Object.defineProperty(host, key, Object.getOwnPropertyDescriptor(obj, key));
  });
  return host;
}

const flatten = arr => isArrlike(arr) ? arrMeth("reduce", arr, (flat, toFlatten) => flat.concat(isArr(toFlatten) ? flatten(toFlatten) : toFlatten), []) : [arr];

const composePlain = (f, g) => (...args) => f(g(...args));
const compose = (...fns) => fns.reduce(composePlain);

// aren't fuggly one liners just the best
const pipe = val => (fn, ...args) => (
  typeof fn == "function" ? pipe(fn(val, ...args)) : fn === true ? pipe(args.shift()(val, ...args)) : !args.length && !fn ? val : pipe(val)
);

const query = (selector, element = doc) => (isStr(element) ? doc.querySelector(element) : element).querySelector(selector);
const queryAll = (selector, element = doc) => Array.from((isStr(element) ? query(element) : element).querySelectorAll(selector));
const queryEach = (selector, func, element = doc) => (!isFunc(func) && ([func, element] = [element, doc]), each(queryAll(selector, element), func));

const DOMcontains = (descendant, parent = doc) => parent == descendant || Boolean(parent.compareDocumentPosition(descendant) & 16);

const newEVT = t => new CustomEvent(t);
const mountEVT = newEVT('mount');
const destroyEVT = newEVT('destroy');
const createEVT = newEVT('create');

const eventListeners = new Map; // for cloning nodes and odd cases

const EventManager = curry((state, target, type, handle, options = false) => {
  if(isStr(target)) target = query(target);
  if(!target.addEventListener) throw new TypeError('bad event target');
  if(isNode(target) && !eventListeners.has(target)) {
    eventListeners.set(target, new Set);
    EventManager('once', target, 'destroy', () => eventListeners.delete(target));
  }
  let once = state === 'once';
  const handler = evt => {
    handle.call(target, evt, target);
    if(once) remove();
  }

  const remove = () => {
    target.removeEventListener(type, handler);
    eventListeners.has(target) && eventListeners.get(target).delete(manager);
  }

  const add = mode => {
    once = !!mode;
    remove();
    target.addEventListener(type, handler, options);
    eventListeners.has(target) && eventListeners.get(target).add(manager);
  }

  const manager = {
    reseat(newTarget, removeOriginal) {
      if(removeOriginal) remove();
      return EventManager(state, newTarget, type, handle, options);
    },
    on:() => (add(), manager),
    once:() => (add(true), manager),
    off:() => (remove(), manager)
  }

  add(once);
  return manager;
}, 4);

const once = EventManager('once');
const on = EventManager('on');

const debounce = (func, wait, immediate) => {
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
}

const deleteHandle = (handles, type, handle) => ((handles.has(type) && !handles.get(type).delete(handle).size) && handles.delete(type), handle);
const addHandle = (handles, type, handle) => ((handles.has(type) ? handles : handles.set(type, new Set)).get(type).add(handle), handle);

const handleMaker = (handles, one = false) => (type, handle) => {
  if(!isFunc(handle)) throw new TypeError("notifier: handle must be a function");

  handle.one = one;
  handle.type = type;
  handle.off = () => deleteHandle(handles, type, handle);
  handle.on = () => addHandle(handles, type, handle.off());
  handle.once = () => (handle.one === true, handle.on());

  return addHandle(handles, type, handle);
}

const notifier = (host = {}) => {
  const handles = new Map;

  host.on = handleMaker(handles);
  host.once = handleMaker(handles, true);
  host.off = curry(deleteHandle)(handles);
  host.hastype = type => handles.has(isFunc(type) ? type.type : type);
  host.emit = (type, ...args) => {
    if(handles.has(type)) handles.get(type).forEach(handle => {
        handle(...args);
        if(handle.one) handle.off();
    });
    return host;
  }
  return host;
}

const route = notifier((hash, fn) => {
  if(!route.active) {
      on(root, 'hashchange', () => {
        const hash = location.hash;
        route.emit(route.hastype(hash) ? hash : 'default', hash);
      });
      route.active = true;
  }
  if(isFunc(hash)) [fn, hash] = [hash, 'default'];
  if(hash !== 'default' && !hash.includes('#/')) hash = '#/'+hash;
  if(location.hash === hash || hash === 'default') fn(location.hash);
  return route.on(hash, fn);
});

const isReady = () => doc.readyState === 'complete' || doc.readyState !== 'loading';
const LoadStack = new Set;

once(root, 'DOMContentLoaded', () => each(LoadStack, fn => fn()));

const run = fn => isReady() ? fn() : LoadStack.add(fn);

const isMounted = (el, potentialParent) => (
  el.isConnected || doc.contains(el) || (isNode(potentialParent) && DOMcontains(el, potentialParent))
);

const html = html => {
  html = isNode(html) ? html : doc.createRange().createContextualFragment(html || '');
  if(!isMounted(html)) {
    html.dispatchEvent(createEVT);
    run(() => isMounted(html) && html.dispatchEvent(mountEVT));
  }
  return html;
}

const domfrag = inner => isPrimitive(inner) ? html(inner) : doc.createDocumentFragment();

const vpend = args => {
  if((args = flatten(args)).length == 1) return html(args[0]);
  const dfrag = domfrag();
  each(args, arg => dfrag.appendChild(html(arg)));
  return dfrag;
}

const autoQuery = n => isStr(n) ? query(n) : n;

const domfn = {
  replace:(node, val) => node.replaceWith ? node.replaceWith(val) : node.parentNode.replaceChild(val, node),
  clone(node) {
    const clone = node.cloneNode();
    if(eventListeners.has(node)) each(eventListeners.get(node), l => l.reseat(clone));
    each(node.childNodes, n => clone.appendChild(domfn.clone(n)));
    return clone;
  },
  css: curry((node, styles, prop) => (
      isObj(styles) ? each(styles, (p, key) => node.style[key] = p) : isEq(isStr,styles,prop) && (node.style[styles] = prop),
      node // return node
  ), 2),
  Class: curry((node, c, state = !node.classList.contains(c)) => {
    state = state ? 'add' : 'remove';
    c.indexOf(' ') !== -1 ? each(c.split(' '), cls => node.classList[state](cls)) : node.classList[state](c);
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
      }
   }
   return node;
  }, 2),
  removeAttr: (node, attr) => (node.removeAttribute(attr), node),
  hasAttr: (node, attr) => node.hasAttribute(attr),
  getAttr: (node, attr) => node.getAttribute(attr),
  setAttr: (node, attr, val = '') => attr(node, attr, val),
  attrToggle: curry(
    (node, name, state = !node.hasAttribute(name), val = node.getAttribute(name) || '') => (
      node[state ? 'setAttribute' : 'removeAttribute'](name, val),
      node // return node
    ),
  2),
  inner: (node, ...args) => (node.innerHTML = '', append(node, args)),
  emit: curry((node, type, detail) => (node.dispatchEvent(!isStr(type) ? type : new CustomEvent(type, {detail})), node), 2),
  append: curry((node, ...args) => (node.appendChild(vpend(args)), node), 2),
  prepend: curry((node, ...args) => (node.prepend(vpend(args)), node), 2),
  appendTo: curry((node, val) => (autoQuery(val).appendChild(node), node)),
  prependTo: curry((node, val) => (autoQuery(val).prepend(node), node)),
  remove:(node, after) => (isNum(after) ? setTimeout(() => node.remove(), after) : node.remove(), node),
};

const {append, attr} = domfn;

const render = curry((elements, node = 'body') => {
  if(isNode(node)) append(node, elements);
  if(isStr(node)) node == 'head' ? append(doc.head, elements) : run(
    () => isNode(node = node == 'body' ? doc[node] : query(node)) && append(node, elements)
  );
}, 2);

const observedAttributes = new Map;
const attrInit = (el, name) => (el[name+"_init"] = true, el);
const directive = (name, stages) => {
  observedAttributes.set(name, stages);
  run(() => queryEach(`[${name}]`, el => stages.init(attrInit(el, name), el.getAttribute(name))));
}
const directiveRevoke = name => observedAttributes.delete(name);

const checkAttr = (name, el, oldValue) => {
  if(observedAttributes.has(name)) {
      const val = el.getAttribute(name), observedAttr = observedAttributes.get(name);
      if(isPrimitive(val)) {
          if(!el[name+"_init"]) observedAttr.init(attrInit(el, name), val);
          else observedAttr.update && val != oldValue && observedAttr.update(el, val, oldValue);
      } else observedAttr.destroy && observedAttr.destroy(el, val, oldValue);
  }
}

const isRenderable = composeTest(isNode, isStr, isArrlike);

const create = (tag, options, ...children) => {
  const el = doc.createElement(tag);

  if(isRenderable(options)) {
    if(children.length) append(el, options, children);
    else append(el, options);
  } else if(children.length) append(el, children);

  if(isObj(options)) {
    for(const key in options) {
      const option = options[key];
      if(key === 'class' || key === 'className') el.className = option;
      else if(key === 'css' && el.style) domfn.css(el, option);
      else if(key === 'on' || key === 'once') each(option, (handle, type) => EventManager(key, el, type, handle));
      else if(key === 'attr') attr(el, option);
      else if(key === 'action') el.action = on(el, 'click', option);
      else if(key in el || isPrimitive(option)) el[key] = option;
      else if(isObj(option)) {
        if(key !== 'lifecycle') extend(el, option);
        else each(option, (handle, stage) => {
          if(isFunc(handle)) (stage === 'create' ? once : on)(el, stage, handle.bind(el, el));
        });
      }
    }
    if(options && options.render) options.render.appendChild ? options.render.appendChild(el) : render(el, options.render);
  }
  el.dispatchEvent(createEVT);
  if(isMounted(el, options && options.render)) el.dispatchEvent(mountEVT);
  return el;
}

const dom = new Proxy(extend(
  (selector, element = doc) => isNode(selector) ? selector : query(selector, element),
  {create,query,queryAll,queryEach,on,once,html,domfrag}
), {
  get: (d, key) => key in d ? d[key] : bindr(create, key), // get the d
  set: (d, key, val) => d[key] = val
});

const repeater = (interval, fn, destroySync, intervalID, mngr = ({
  stop:() => (clearInterval(intervalID), mngr),
  start() {
    intervalID = setInterval(fn, interval);
    isNode(destroySync) && mngr.destroySync(destroySync);
    return mngr;
  },
  destroySync:el => once(el, 'destroy', mngr.stop)
})) => mngr.start();

const mountORdestroy = (stack, type) => stack.length > 0 && arrEach(stack, node => {
  if(!node.isConnected && !doc.contains(node)) node.dispatchEvent(type);
});

new MutationObserver(muts => each(muts, ({addedNodes, removedNodes, target, attributeName, oldValue}) => {
  mountORdestroy(addedNodes, mountEVT);
  mountORdestroy(removedNodes, destroyEVT);
  if(attributeName && attributeName !== 'style' && observedAttributes.has(attributeName)) checkAttr(attributeName, target, oldValue);
  //target.emit('attr:'+attributeName,target,target.attr[attributeName],oldValue);
})).observe(doc, {attributes:true, childList:true, subtree:true});

return {dom,domfn,notifier,pipe,compose,composeTest,yieldloop,debounce,directive,directiveRevoke,repeater,extend,route,render,run,curry,each,DOMcontains,flatten,isDef,isUndef,isPrimitive,isNull,isFunc,isStr,isBool,isNum,isInt,isIterator,isObj,isArr,isArrlike,isEmpty,isEl,isEq,isNode,isNodeList,isInput,isMap,isSet};
})();
