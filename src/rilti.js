/**
* rilti.js alpha
* @licence MIT
* @repo SaulDoesCode/rilti.js
* @author Saul van der Walt
**/
var rilti = (() => {
"use strict";

const doc = document,
root = window,
undef = void 0,
NULL = null,
forEach = 'forEach',
InputTypes = 'INPUT TEXTAREA',
// it's ugly, I know but damnit it's beautiful to me
curry = (fn, arity = fn.length, resolver = (...memory) => (...more) => ((more.length + memory.length) >= arity ? fn : resolver)(...memory.concat(more))) => resolver(),

test = (match, ...cases) => cases.some(Case => match == Case || (isFunc(Case) && Case(match))), // irony
arrMeth = curry((meth, val, ...args) => Array.prototype[meth].apply(val, args), 2),
istype = str => obj => typeof obj == str,
typeinc = str => obj => toString.call(obj).indexOf(str) !== -1,
// all the is this that stuff
isInstance = (o, t) => o instanceof t,
isDef = o => o !== undef && o !== NULL,
isUndef = o => !isDef(o),
isNull = o => o === NULL,
isFunc = istype('function'),
isStr = istype('string'),
isBool = istype('boolean'),
isNum = o => !isBool(o) && !isNaN(Number(o)),
isPrimitive = s => isStr(s) || isBool(s) || !isNaN(s),
isInt = val => isNum(val) && val % 1 === 0,
isObj = typeinc('Object'),
isArr = Array.isArray,
isArrlike = o => o && typeof o.length != 'undefined',
isEmpty = val => (isUndef(val) || isFunc(val)) || !(isObj(val) ? Object.keys(val).length : isArrlike(val) ? val.length : val.size),
isNode = o => o && isInstance(o, Node),
isNodeList = nl => isInstance(nl, NodeList) || (isArrlike(nl) && arrMeth('every', nl, isNode)),
isEl = typeinc('HTML'),
isMap = typeinc('Map'),
isSet = typeinc('Set'),
isInput = el => isEl(el) && InputTypes.indexOf(el.tagName) !== -1,
isEq = curry((o1,...vals) => vals.every(isFunc(o1) ? i => o1(i) : i => o1 === i), 2),

each = (iterable, func, i = 0) => {
  if(!isEmpty(iterable)) {
    iterable[forEach] ? iterable[forEach](func) : isArrlike(iterable) && arrMeth(forEach, iterable, func);
    if(isObj(iterable)) for(i in iterable) func(iterable[i], i, iterable);
  } else if (isInt(iterable)) while (iterable != i) func(i++);
  return iterable;
},

def = Object.defineProperty,
getdesc = Object.getOwnPropertyDescriptor,
extend = (host, obj, safe = false) => (!isEmpty(obj) && each(Object.keys(obj), key => !(safe || key in host) && def(host, key, getdesc(obj, key))), host),
flatten = arr => isArrlike(arr) ? arrMeth("reduce", arr, (flat, toFlatten) => flat.concat(isArr(toFlatten) ? flatten(toFlatten) : toFlatten), []) : [arr],

pipe = curry((val, fn, ...args) => {
  if(isBool(fn) && isFunc(args[0])) {
    if(!fn) return pipe(val);
    fn = args.shift();
  }
  const nextVal = fn(val, ...args);
  return pipe(nextVal !== undef ? nextVal : val);
}, 2),

query = (selector, element = doc) => (isStr(element) ? doc.querySelector(element) : element).querySelector(selector),
queryAll = (selector, element = doc) => Array.from((isStr(element) ? query(element) : element).querySelectorAll(selector)),
queryEach = (selector, func, element = doc) => (!isFunc(func) && ([func, element] = [element, doc]), each(queryAll(selector, element), func)),
DOMcontains = (descendant, parent = doc) => parent == descendant || Boolean(parent.compareDocumentPosition(descendant) & 16),

terr = msg => {throw new TypeError(msg)}, err = msg => {throw new Error(msg)},

mountEVT = new CustomEvent('mount'),
destroyEVT = new CustomEvent('destroy'),
createEVT = new CustomEvent('create'),
adoptedEVT = new CustomEvent('adopted'),
eventListeners = new Map,

EventManager = curry((state, target, type, handle, options = false, once) => {
  if(isStr(target)) target = query(target);
  if(!target.addEventListener) err('bad event target');
  if(isNode(target) && !eventListeners.has(target)) {
    eventListeners.set(target, new Set);
    EventManager('once', target, 'destroy', () => eventListeners.delete(target));
  }
  function handler(evt) {
    handle.call(target, evt, target);
    if(once) target.removeEventListener(type, handler);
  }

  const remove = () => {
    target.removeEventListener(type, handler);
    eventListeners.has(target) && eventListeners.get(target).delete(manager);
  },
  add = mode => {
    once = !!mode;
    remove();
    target.addEventListener(type, handler, options);
    eventListeners.has(target) && eventListeners.get(target).add(manager);
  },
  manager = {
    reseat(newTarget, removeOriginal) {
      if(removeOriginal) remove();
      return EventManager(state, newTarget, type, handle, options, once);
    },
    on:() => (add(), manager),
    once:() => (add(true), manager),
    off:() => (remove(), manager)
  }
  return manager[state]();
}, 4),
once = EventManager('once'), on = EventManager('on'),

Nhandler = (handles, N, type, handle, one) => {
  handle.one = !!one;
  handle.type = type;
  handle.off = () => (N.off(type, handle), handle);
  (handles.has(type) ? handles : handles.set(type, new Set)).get(type).add(handle);
  return handle;
},
notifier = (host = {}) => {
  const handles = new Map,
  N = extend(host, {
    on:(type, handle) => Nhandler(handles, N, type, handle),
    once:(type, handle) => Nhandler(handles, N, type, handle, true),
    off:(type, handle) => ((handles.has(type) && !handles.get(type).delete(handle).size) && handles.delete(type), N),
    hasListener:type => handles.has(type),
    emit:(type, ...args) => (each(handles.get(type), handle => {
      handle(...args);
      handle.one && handle.off();
    }), N)
  });
  return N;
},

route = notifier((hash, fn) => {
  if(!route.active) {
      route.active = true;
      on(root, 'hashchange', () => route.emit(route.hasListener(location.hash) ? location.hash : 'default', location.hash));
  }
  if(isFunc(hash)) [fn, hash] = [hash, 'default'];
  if(location.hash == hash || (!location.hash && hash == 'default')) fn();
  return route.on(hash, fn);
}),

run = fn => ready ? fn() : LoadStack.push(fn),
html = html => {
  html = isNode(html) ? html : doc.createRange().createContextualFragment(html || '');
  if(!(html.isCreated || (html.isConnected && !html.isMounted))) html.dispatchEvent(createEVT);
  !html.isMounted && run(() => {
    if((doc.contains(html) || html.isConnected) && !html.isMounted) html.dispatchEvent(mountEVT);
  });
  return html;
},
domfrag = inner => isPrimitive(inner) ? html(inner) : doc.createDocumentFragment(),
vpend = args => {
  if((args = flatten(args)).length == 1) return html(args[0]);
  const dfrag = domfrag();
  each(args, arg => dfrag.appendChild(html(arg)));
  return dfrag;
},
autoQuery = n => isStr(n) ? query(n) : n,

domfn = {
  replace:(node, val) => node.replaceWith ? node.replaceWith(val) : node.parentNode.replaceChild(val, node),
  clone(node) {
    const clone = node.cloneNode();
    if(eventListeners.has(node)) each(eventListeners.get(node), l => l.reseat(clone));
    each(node.childNodes, n => clone.appendChild(domfn.clone(n)));
    return clone;
  },
  css:curry((node, styles, prop) => (isObj(styles) ? each(styles, (p, key) => node.style[key] = p) : isEq(isStr,styles,prop) && (node.style[styles] = prop), node), 2),
  Class:curry((node, c, state) => {
    if(!isDef(state)) state = !node.classList.contains(c);
    state = state ? 'add' : 'remove';
    c.indexOf(' ') !== -1 ? each(c.split(' '), cls => node.classList[state](cls)) : node.classList[state](c);
    return node;
  }, 2),
  hasClass:(node, name) => node.classList.contains(name),
  attr:curry((node, attr, val) => {
    if(node.attributes) {
      if(isObj(attr)) each(attr, (v, a) => {
        node.setAttribute(a, v);
        checkAttr(a, node);
      });
      else if(isStr(attr)) {
        if(isPrimitive(val)) node.setAttribute(attr, val);
        else return node.getAttribute(attr);
      }
   }
   return node;
  }, 2),
  removeAttr:(node, attr) => (node.removeAttribute(attr), node),
  hasAttr:(node, attr) => node.hasAttribute(attr),
  getAttr:(node, attr) => node.getAttribute(attr),
  setAttr:(node, attr, val = '') => attr(node, attr, val),
  attrToggle:curry((node, name, state = !node.hasAttribute(name), val = node.getAttribute(name) || '') => (node[state ? 'setAttribute' : 'removeAttribute'](name, val), node), 2),
  inner:(node, ...args) => (node.innerHTML = '', append(node, args)),
  emit:curry((node, type, detail) => (node.dispatchEvent(!isStr(type) ? type : new CustomEvent(type, {detail})), node), 2),
  append:curry((node, ...args) => (node.appendChild(vpend(args)), node), 2),
  prepend:curry((node, ...args) => (node.prepend(vpend(args)), node), 2),
  appendTo:curry((node, val) => (autoQuery(val).appendChild(node), node)),
  prependTo:curry((node, val) => (autoQuery(val).prepend(node), node)),
  remove:(node, after) => (isNum(after) ? setTimeout(() => node.remove(), after) : node.remove(), node),
},
{append, emit, attr} = domfn,

render = curry((elements, node = 'body') => {
  if(isNode(node)) append(node, elements);
  if(isStr(node)) node == 'head' ? append(doc.head, elements) : run(() => isNode(node = node == 'body' ? doc.body : query(node)) ? append(node, elements) : err('render: invalid target'));
}, 2),

plugins = extend(options => extend(rilti, options, true), {
  method(key, method) {
    if(isFunc(method)) domfn[key] = method;
  },
  handles:new Set
}),

observedAttributes = new Map,
attrInit = (el,name) => (el[name+"_init"] = true, el),
observeAttr = (name, stages) => {
  observedAttributes.set(name, stages);
  run(() => queryEach(`[${name}]`, el => stages.init(attrInit(el, name), el.getAttribute(name))));
},
unobserveAttr = name => observedAttributes.delete(name),
checkAttr = (name, el, oldValue) => {
  if(observedAttributes.has(name)) {
      const val = el.getAttribute(name), observedAttr = observedAttributes.get(name);
      if(isPrimitive(val)) {
          if(!el[name+"_init"]) observedAttr.init(attrInit(el, name), val);
          else observedAttr.update && val != oldValue && observedAttr.update(el, val, oldValue);
      } else observedAttr.destroy && observedAttr.destroy(el, val, oldValue);
  }
},

lifecycleStages = ['create','mount','destroy','attr'],
create = (tag, options, ...children) => {
  const el = doc.createElement(tag), mutPipe = pipe(el);
  if(test(options, isArrlike, isNode)) children = test(options, isStr, isNode) ? [options, ...children] : options;
  else if(isObj(options)) {
    each(options, (val, key) => {
      if(key != 'render') {
        if(key == 'lifecycle') each(lifecycleStages, stage => isFunc(val[stage]) && (stage == 'create' ? once : on)(el, stage, () => val[stage].call(el, el)));
        else if(test(key,'class','className')) el.className = val;
        else if(test(key,'style','css') && el.style) domfn.css(el, val);
        else if(test(key,'on','once')) each(val, (handle, type) => (key == 'once' ? once : on)(el, type, handle));
        else if(key == 'action') on(el, 'click', val);
        else if(isFunc(val) || (key in el)) el[key] = val;
        else if(key == 'attr' || (isPrimitive(val) && !attr(el, key, val))) attr(el, val);
        else if(isObj(val)) extend(el, val);
      }
    });
    each(plugins.handles, handle => handle(options, el));
  }
  mutPipe
  (emit, createEVT)
  (!isEmpty(children), append, children)
  (once, 'mount', () => el.isMounted = true);

  if(options && options.render) render(el, options.render);
  mutPipe((doc.contains(el) || el.isConnected) && !el.isMounted, emit, mountEVT);
  return el;
},

dom = new Proxy(extend((selector, element = doc) => isNode(selector) ? selector : query(selector, element), {query,queryAll,queryEach,on,once,html}), {
  get:(d, key) => key in d ? d[key] : create.bind(NULL, key),
  set:(d,key, val) => d[key] = val
}),

mountORdestroy = (stack, type) => {
  const isMount = type === 'mount';
  if(stack.length > 0) each(stack, node =>
    (node.dispatchEvent && !(node.isMounted && isMount)) && node.dispatchEvent(isMount ? mountEVT : destroyEVT)
  );
},

intervalManager = (interval, fn, destroySync, intervalID, mngr = ({
  stop:() => (clearInterval(intervalID), mngr),
  start() {
    intervalID = setInterval(fn, interval);
    isNode(destroySync) && mngr.destroySync(destroySync);
    return mngr;
  },
  destroySync:el => once(el, 'destroy', mngr.stop)
})) => mngr.start(),

Component = (tag, config) => {
  if(!tag.includes('-')) return err(tag+" is unhyphenated");
  const {create, mount, destroy, attr, props, methods, adopted} = config, attrs = [];
  attr && each(attr, (_, key) => attrs.push(key));

  const CustomElement = class extends HTMLElement {
    constructor() {
      super();
      const element = this;
      element.isComponent = true;
      extend(element, props);
      if(isFunc(create)) create.call(element, element);
      emit(element, createEVT);
    }
    connectedCallback() {
      const element = this;
      isFunc(mount) && mount.call(element, element);
      emit(element, mountEVT);
    }
    disconnectedCallback() {
      const element = this;
      if(isFunc(destroy)) destroy.call(element, element);
      emit(element, destroyEVT);
    }
    adoptedCallback() {
      const element = this;
      if(isFunc(adopted)) adopted.call(element, element);
      emit(element, adoptedEVT);
    }
    static get observedAttributes() { return attrs; }
    attributeChangedCallback(attrName, oldVal, newVal) {
      if(oldVal !== newVal) {
        const element = this;
        attr[attrName].call(element, oldVal, newVal, element);
      }
    }
  }
  if(methods) extend(CustomElement.prototype, methods);
  customElements.define(tag, CustomElement);
}

let LoadStack = [], ready = false;
once(root, 'DOMContentLoaded', () => {
  ready = true;
  each(LoadStack, fn => fn());
  LoadStack = NULL;
});

new MutationObserver(muts => each(muts, ({addedNodes, removedNodes, target, attributeName, oldValue}) => {
  mountORdestroy(addedNodes, 'mount');
  mountORdestroy(removedNodes, 'destroy');
  if(attributeName && (attributeName !== 'style')) checkAttr(attributeName, target, oldValue);
  //target.emit('attr:'+attributeName,target,target.attr[attributeName],oldValue);
})).observe(doc, {attributes:true, childList:true, subtree:true});

return {dom,domfn,notifier,pipe,Component,observeAttr,unobserveAttr,plugins,intervalManager,extend,def,getdesc,test,route,render,run,curry,each,DOMcontains,flatten,isDef,isUndef,isPrimitive,isNull,isFunc,isStr,isBool,isNum,isInt,isObj,isArr,isArrlike,isEmpty,isEl,isEq,isNode,isNodeList,isInput,isMap,isSet};
})();
