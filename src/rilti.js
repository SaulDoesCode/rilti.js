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
len = 'length',
InputTypes = 'INPUT TEXTAREA';

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
isUndef = o => o === undef || o === NULL,
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
isInput = o => o && o.tagName && InputTypes.includes(o.tagName),
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
    iterable.forEach ? iterable.forEach(func) : isArrlike(iterable) && arrEach(iterable, func);
    if(isObj(iterable)) for(i in iterable) func(iterable[i], i, iterable);
  } else if (isInt(iterable)) yieldloop(iterable, func);
  else if(iterable && (iterable.entries || isIterator(iterable))) for (const [key, value] of iterable) func(key, value, iterable);
  return iterable;
}

const extend = (host, obj, safe = false) => {
  if(!isEmpty(obj)) each(Object.keys(obj), key => {
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

const isMounted = (descendant, parent = doc) => parent === descendant || Boolean(parent.compareDocumentPosition(descendant) & 16);

//const passive_events = ['wheel'];
//passive_events.includes(type) ? {passive:true} : false

const EventManager = curry((mode, target, type, handle, options = false) => {
  if(isStr(target)) target = query(target);
  if(!target.addEventListener) throw new TypeError('bad event target');
  if(target.nodeType && !target.evtlisteners) target.evtlisteners = new Set;

  let once = mode === 'once';
  const handler = evt => {
    handle.call(target, evt, target);
    if(once) remove();
  }

  const remove = () => {
    target.removeEventListener(type, handler);
    target.evtlisteners && target.evtlisteners.delete(manager);
  }

  const add = mode => {
    once = !!mode;
    remove();
    target.addEventListener(type, handler, options);
    target.evtlisteners && target.evtlisteners.add(manager);
  }

  const manager = {
    handler,
    type,
    reseat(newTarget, removeOriginal) {
      if(removeOriginal) remove();
      return EventManager(mode, newTarget, type, handle, options);
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
  host.hasHandle = handle => host.hastype(handle.type) && handles.get(handle.type).has(handle);
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
      activateRouting();
      route.active = true;
  }
  if(isFunc(hash)) [fn, hash] = [hash, 'default'];
  if(hash !== 'default' && !hash.includes('#/')) hash = '#/'+hash;
  if(location.hash === hash || hash === 'default') fn(location.hash);
  return route.on(hash, fn);
});

const activateRouting = () => {
  on(root, 'hashchange', () => {
    const hash = location.hash;
    route.emit(route.hastype(hash) ? hash : 'default', hash);
  });
}

const isReady = () => doc.readyState === 'complete' || doc.readyState !== 'loading';

const LoadStack = new Set;
once(root, 'DOMContentLoaded', () => each(LoadStack, fn => fn()));

const run = fn => isReady() ? fn() : LoadStack.add(fn);

const html = html => html.nodeType ? html : doc.createRange().createContextualFragment(html || '');

const domfrag = inner => isPrimitive(inner) ? html(inner) : doc.createDocumentFragment();

const vpend = Args => {
  const args = flatten(Args);
  if(args.length == 1) return html(args[0]);
  const dfrag = domfrag();
  each(args, arg => {
    dfrag.appendChild(arg.nodeType ? arg : html(arg));
  });
  return dfrag;
}

const domfn = {
  replace: (node, val) => (
    node.replaceWith ? node.replaceWith(val) : node.parentNode.replaceChild(val, node),
    val // don't return node because val is the new node
  ),
  clone(node) {
    const clone = node.cloneNode();
    if(node.evtlisteners) each(node.evtlisteners, l => l.reseat(clone));
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
    node.nodeType ?
    node.appendChild(vpend(args)) :
    dom(node).then(n => n.appendChild(vpend(args)));
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

const checkAttr = (name, el, oldValue = NULL) => {
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

const emitMount = node => {
  if(!node.didMount) {
    if(node.notifier) node.notifier.emit('mount', node);
    node.didMount = true;
  }
}

const rerr = err => console.warn(`render node error: ${err}`);

const render = (node, host) => dom(host).then(h => {
  h.appendChild(node);
  emitMount(node);
}, rerr);

const isRenderable = composeTest(isNode, isStr, isArrlike);

const ifHas = obj => (keys, fn) => {
  if(
    keys in obj || isArr(keys) && keys.some(key => key in obj && (keys = key))
  ) {
    fn(obj[keys], keys);
    delete obj[keys];
  }
}

const incarnation = (el, n, first = true) => ({create, mount, destroy}) => {
  if(first && create) n.once('create', () => create.call(el, el));
  if(mount) n.once('mount', () => mount.call(el, el));
  if(destroy) n.once('destroy', () => {
    destroy.call(el, el);
    // listen for potential re-incaration
    incarnation(el, n, false)({create, mount, destroy});
  });
}

const create = (tag, options, ...children) => {
  const el = doc.createElement(tag);
  const n = el.notifier = notifier();

  if(isRenderable(options)) children.unshift(options);
  flatten(children).forEach(child => {
    el.append(child);
    emitMount(child);
  });

  if(isObj(options)) {
    const ifhas = ifHas(options);
    ifhas(['class', 'className'], c => el.className = c);
    ifhas(['on', 'once'], (listeners, mode) => {
      each(listeners, (handle, type) => {
        EventManager(mode, el, type, handle);
      });
    });
    ifhas('attr', attr(el));
    ifhas('css', css(el));
    ifhas('action', listener => el.action = on(el, 'click', listener));
    ifhas('lifecycle', incarnation(el, n));

    each(options, (val, key) => {
      if(key !== 'render')
        isObj(val) ? extend(el, val) : el[key] = val;
    });
  }

  n.emit('create', el);

  if(options && options.render) {
    const rnode = options.render;
    rnode.appendChild ? (rnode.appendChild(el), emitMount(el)) : render(el, rnode);
  }
  return el;
}

// find a node independent of DOMContentLoaded state using a promise
const dom = new Proxy(extend( // Proxy, the audacious old browser breaker :O
  (selector, element = doc) => new Promise((res, rej) => {
    if(isNode(selector)) res(selector);
    else if(isStr(selector)) {
      if(selector === 'head') res(doc.head);
      else {
        const find = () => {
          if(selector === 'body') res(doc.body);
          else {
            const temp = query(selector, element);
            isNode(temp) ? res(temp) : rej(404);
          }
        }
        isReady() ? find() : run(find);
      }
    } else rej(403);
  }),
  {create,query,queryAll,queryEach,html,domfrag}
), {
  get: (d, key) => key in d ? d[key] : create.bind(NULL, key), // get the d
  set: (d, key, val) => d[key] = val
});

const destroyHandle = node => {
  if(node.notifier) node.notifier.emit('destroy', node);
}

new MutationObserver(muts => each(muts, ({addedNodes, removedNodes, target, attributeName, oldValue}) => {
  if(addedNodes.length) arrEach(addedNodes, emitMount);
  if(removedNodes.length) arrEach(removedNodes, destroyHandle);
  if(attributeName && directives.has(attributeName)) checkAttr(attributeName, target, oldValue);
})).observe(doc, {attributes:true, childList:true, subtree:true});

return {dom,domfn,notifier,pipe,compose,composeTest,not,yieldloop,on,once,debounce,directive,directives,extend,route,render,run,curry,each,flatten,isMounted,isDef,isUndef,isPrimitive,isNull,isFunc,isStr,isBool,isNum,isInt,isIterator,isObj,isArr,isArrlike,isEmpty,isEl,isEq,isNode,isNodeList,isInput,isMap,isSet};
})();
