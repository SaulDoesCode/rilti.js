/**
* rot.js alpha
* @licence MIT
* @repo SaulDoesCode/rot.js
* @author Saul van der Walt
**/
((context, factory) => {
  const name = 'rot';
  context[name] = factory();
  if (typeof module != 'undefined' && module.exports) module.exports = factory();
  else if (typeof define == 'function' && define.amd) define(name, factory);
})(this, () => {
"use strict";
const root = window || global, doc = document, undef = undefined,
curry = (fn, arity = fn.length) => {
  const resolver = (...memory) => (...more) => {
    const local = memory.concat(more);
    return (local.length >= arity ? fn : resolver)(...local);
  }
  return resolver();
},
Keys = Object.keys,
every = (arr, fn) => Array.prototype.every.call(arr, fn),
typestr = toString.call,
istype = str => obj => typeof obj === str,
typeinc = str => obj => toString.call(obj).includes(str),
isDef = o => o !== undef,
isUndef = o => o === undef,
isNull = o => o === null,
isFunc = istype('function'),
isStr = istype('string'),
isBool = istype('boolean'),
isNum = o => !isBool(o) && !isNaN(Number(o)),
isPrimitive = s => isStr(s) || isBool(s) || !isNaN(s),
isInt = val => isNum(val) && val % 1 === 0,
isObj = typeinc('Object'),
isArr = Array.isArray,
isArrlike = o => o !== undef && typeof o.length !== 'undefined',
isEmpty = val => !(isObj(val) ? Keys(val).length : isArrlike(val) ? val.length : val.size) || isFunc(val),
isNode = o => o instanceof Node,
isNodeList = nl => nl instanceof NodeList || (isArrlike(nl) && every(nl, isNode)),
isEl = typeinc('HTML'),
isInput = el => isEl(el) && 'INPUT TEXTAREA'.includes(el.tagName),
isMap = typeinc('Map'),
isSet = typeinc('Set'),
each = (iterable, func) => {
  if (isDef(iterable) && isFunc(func)) {
    if(isArrlike(iterable)) iterable = Array.from(iterable);
    if(iterable.forEach) iterable.forEach(func);
    else {
      let i = 0;
      if(isObj(iterable)) for (i in iterable) func(iterable[i], i, iterable);
      else if (isInt(iterable)) while (iterable != i) func(i += 1);
    }
  }
},
def = curry(Object.defineProperty),
getdesc = Object.getOwnPropertyDescriptor,
extend = curry((host, obj) => {
  for(let key of Keys(obj)) def(host,key, getdesc(obj, key));
  return host;
}),
safeExtend = (host, obj) => {
  for(let key of Keys(obj)) !(key in host) && def(host,key, getdesc(obj, key));
  return host;
},
flatten = arr => Array.prototype.reduce.call(arr, (flat, toFlatten) => flat.concat(isArr(toFlatten) ? flatten(toFlatten) : toFlatten), []),

query = (selector, element = doc) => (isStr(element) ? doc.querySelector(element) : element).querySelector(selector),
queryAll = (selector, element = doc) => Array.from((isStr(element) ? query(element) : element).querySelectorAll(selector)),
queryEach = (selector, func, element = doc) => {
  if (!isFunc(func)) {
      func = element;
      element = doc;
  }
  each(queryAll(selector, element), func);
},

terr = msg => new TypeError(msg), err = msg => new Error(msg),
DOMcontains = (descendant, parent = doc) => parent == descendant || Boolean(parent.compareDocumentPosition(descendant) & 16),

NativeEventTypes = "DOMContentLoaded hashchange blur focus focusin focusout load resize scroll unload click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave change select submit keydown keypress keyup error contextmenu pointerdown pointerup pointermove pointerover pointerout pointerenter pointerleave touchstart touchend touchmove touchcancel".split(" "),
isNativeEvent = evt => NativeEventTypes.includes(evt),

EventManager = curry((target, type, handle, options = false) => {
  if(isStr(target)) target = query(target);
  if(!target || !target.addEventListener) throw err('EventManager: Target Invalid');
  const add = target.addEventListener.bind(target, type),
  remove = target.removeEventListener.bind(target, type),
  handler = (once = false) => function wrapper(evt) {
    handle.call(target, evt, target.dm);
    if(once) remove(wrapper);
  }
  return {
    off() {
        remove(handler());
        return this;
    },
    on() {
        add(handler(), options);
        return this;
    },
    once() {
        this.off();
        add(handler(true), options);
        return this;
    }
  }
}, 3),

informer = () => {
  const handles = new Set();
  return {
    isInformer : true,
    handle(once, handle = once) {
        if(!isFunc(handle)) throw terr('informer.handle: is not a function');
        handle.off = () => {
          handles.delete(handle);
          return handle;
        }
        handle.on = state => {
          handle.off().one = !!state;
          handles.add(handle);
          return handle;
        }
        handle.once = () => handle.on(true);
        return handle.on(isBool(once) ? once : false);
    },
    on(handle) {
      return this.handle(handle);
    },
    once(handle) {
      return this.handle(true, handle);
    },
    off(handle) {handles.delete(handle)},
    get empty() {
      return handles.size < 1;
    },
    get handles() {
      return handles;
    },
    inform() {
      if (handles.size) for(let hn of handles) {
        hn(...arguments);
        if(hn.one) hn.off();
      }
    }
  }
},

lt = t => curry((...args) => EventManager(...args)[t](),3), // listener type
on = lt('on'),
once = lt('once');

informer.fromEvent = (target, type, once, options) => {
    if(isStr(target)) target = query(target);
    if (!target.addEventListener) throw err("invalid event target");
    if (!isStr(type)) throw terr("event type not string");
    const inf = informer(),
    listener = lt(!once ? 'on' : 'once')(target, type, e => inf.inform(e, listener), options);
    return inf;
}

const LoadInformer = informer.fromEvent(root, 'DOMContentLoaded', true),
run = fn => doc.readyState != 'complete' ? LoadInformer.once(fn) : fn(),
render = (...args) => (node = doc.body) => run(() => {
  each(flatten(args), arg => {
    isSet(arg) || isArrlike(arg) ? each(arg, a => node.appendChild(isNode(a) ? a : a.node)) : node.appendChild(isNode(arg) ? arg : arg.node)
  });
}),
dffstr = html => doc.createRange().createContextualFragment(html || ''),
domfrag = inner => isPrimitive(inner) ? dffstr(inner) : doc.createDocumentFragment(),
plugins = options => safeExtend(rot, options);
extend(plugins, {
  methods:{},
  handles:new Set(),
  muthandles : new Set(),
});

const domMethods = node => ({
  node,
  hasAttr:node.hasAttribute.bind(node),
  getAttr:node.getAttribute.bind(node),
  setAttr(attr, val = '') {
      isObj(attr) ? each(attr, (v,a) => node.setAttribute(a, v)) : node.setAttribute(attr, val);
      return this;
  },
  removeAttr(...args) {
      each(args, node.removeAttribute.bind(node));
      return this;
  },
  toggleAttr(name, val = '') {
    return this[(isBool(val) ? val : node.hasAttribute(name)) ? 'removeAttr' : 'setAttr'](name, val);
  },
  hasClass:(...args) => args.length == 1 ? node.classList.contains(args[0]) : args.every(c => node.classList.contains(c)),
  addClass() {
      for(let c of arguments) node.classList.add(c);
      return this;
  },
  removeClass() {
      for(let c of arguments) node.classList.remove(c);
      return this;
  },
  toggleClass(Class, state = !node.classList.contains(Class)) {
      node.classList[state ? 'add' : 'remove'](Class);
      return this;
  },
  replace(val) {
      node.parentNode.replaceChild(val, node);
      return this;
  },
  css(styles, prop) {
      if (isObj(styles)) each(styles, (prop, key) => node.style[key] = prop);
      else if (isStr(styles) && isStr(prop)) node.style[styles] = prop;
      else throw terr('CSS : Styles is not an object or string pair');
      return this;
  },
  inner(...args) {
    node[node.isInput ? 'value' : 'innerHTML'] = null;
    for(let val of flatten(args)) {
        if(val.appendTo) {
          if(!DOMcontains(val.node, node)) {
            val.lifecycle.mount.inform(val, val.node, val.parent = node.dm);
            node.dm.children.push(val);
            val.lifecycle.destroy.once(() => {
              node.dm.children = node.dm.children.map(el => el != val || el.dm != val || val.node != el);
            });
          }
          val.appendTo(node);
        }
        if(isPrimitive(val)) val = doc.createTextNode(val);
        if(isNode(val)) {
          node.appendChild(val);
          node.dm.children.push(val);
        } else if(val.isInformer) val.on(node.dm.html);
    }
    return node.dm;
  },
  on:on(node),
  once:once(node),
  append() {
      const dfrag = domfrag();
      for(let val of arguments) {
        if(val.node) val = val.node;
        dfrag.appendChild(isNode(val) ? val : dffstr(val));
      }
      node.appendChild(dfrag);
      return this;
  },
  prepend() {
      const dfrag = domfrag();
      for(let val of arguments) {
        if(val.node) val = val.node;
        dfrag.appendChild(isNode(val) ? val : dffstr(val));
      }
      isFunc(node.prepend) ? node.prepend(dfrag) : node.insertBefore(dfrag, node.firstChild);
      return this;
  },
  appendTo(val, within) {
      if(val.node) val = val.node;
      if (isStr(val)) val = query(val, within);
      val.append ? val.append(node) : val.appendChild && val.appendChild(node);
      return this;
  },
  prependTo(val, within) {
      if(val.node) val = val.node;
      if (isStr(val)) val = query(val, within);
      val.prepend ? val.prepend(node) : val.insertBefore(node, val.firstChild);
      return this;
  },
  modify(fn) {
    fn(this, node);
    return this;
  },
  remove(after) {
    isNum(after) ? setTimeout(() => node.remove(), after) : node.remove();
    return this;
  },
  extend(obj) {
    return extend(this, obj);
  },
  get mounted() { return DOMcontains(node) },
  update(options) {
    this.lifecycle.update.inform('options', options, this.options, this, node);
    return actualize(options, node);
  },
  observeAttr(name, handle, once) {
    return this.lifecycle.attr.handle(!!once, (attr, ...details) => name === attr && handle(attr, ...details));
  }
}),

lifecycleStages = 'create mount destroy update attr'.split(' '),

eventActualizer = (dm, listen) => {
  listen = dm[listen];
  if(!isArr(dm.listeners)) dm.listeners = [];
  if(!isEmpty(dm.listeners)) {
    each(dm.listeners, l => l.off());
    dm.listeners = [];
  }
  return (val, key) => {
    let listener;
    const fn = listen(key);
    if(isFunc(val)) listener = fn(val);
    else if(val.isInformer) listener = fn(e => val.inform(e, listener, val));
    if(listener) dm.listeners.push(listener);
  }
},

isEq = o1 => o2 => o1 === o2,

actualize = (options, el, tag) => {
  if(!isNode(el)) el = isStr(el) ? query(el) : doc.createElement(tag);
  let dm = el.dm || (el.dm = domMethods(el)), {attr = {}, lifecycle} = options;
  el.isInput = isInput(el);
  if(!dm.lifecycle) {
    dm.lifecycle = {};
    for(let stage of lifecycleStages) {
        const inf = dm.lifecycle[stage] = informer();
        if(isObj(lifecycle) && isFunc(lifecycle[stage])) inf.handle(stage == 'update', (...args) => {
          lifecycle[stage].apply(dm, args);
        });
    }
  }
  if(!dm.plugged) {
    extend(dm, plugins.methods);
    for(let handle of plugins.handles) handle(options, dm, el);
    dm.plugged = true;
  }
  for (let key in (dm.options = options)) {
    let keyis = isEq(key), val = options[key];
    if(keyis('class')) el.className = val;
    else if(keyis('children')) {
      dm.children = [];
      if(!isEmpty(val)) dm.inner(isFunc(val) ? val(dm, el) : val);
    }
    else if(keyis('style')) dm.css(val);
    else if(keyis('on') || keyis('once')) each(val, eventActualizer(dm, key));
    else if(keyis('props') && isObj(val)) extend(dm, val);
    else if(!(key in plugins.methods || keyis('tag'))) {
      if(key in el) el[key] = val;
      else if(isPrimitive(val)) attr[key] = val;
    }
  }
  if(!isEmpty(attr)) dm.setAttr(attr);
  if(!dm.mounted) dm.lifecycle.create.inform(dm, el);
  return dm;
},

pluck = (el, within) => {
  (el = isNode(el) ? el : query(el, within)).remove();
  return dom(el);
},

dom = (tag, data, ...children) => {
  !isObj(data) ? data = { children : isArrlike(data) || isPrimitive(data) ? data : children || undef } : data.children = data.children ? [data.children, ...children] : children;
  if(isNode(tag)) return actualize(data, tag);
  return actualize(data, null, tag);
}

(dom.extend = extend(dom))({query,queryAll,queryEach,on,once,actualize});

each(
  'picture img input list a script strong table td th tr article aside ul ol li h1 h2 h3 h4 h5 h6 div span pre code section button br label header i style nav menu main menuitem'.split(' '),
  tag => dom[tag] = dom.bind(null, tag)
);

new MutationObserver(muts => {
  for(let mut of muts) {
    const {removedNodes, addedNodes, target, attributeName} = mut;
    let el;
    if (removedNodes.length > 0) for(el of removedNodes) if (el.dm) el.dm.lifecycle.destroy.inform(el.dm, el);
    if (addedNodes.length > 0) for(el of addedNodes) if (el.dm) el.dm.lifecycle.mount.inform(el.dm, el);
    if(attributeName != 'style' && (el = target.dm)) el.lifecycle.attr.inform(attributeName, el.getAttr(attributeName), mut.oldValue, el.hasAttr(attributeName), el);
    if(plugins.muthandles.size > 0) for(let h of plugins.muthandles) h(target, mut.type, mut);
  }
}).observe(doc, {
    attributes: true,
    childList: true,
    subtree: true
});


return {
  informer,
  EventManager,on,once,
  dom,
  plugins,
  extend,
  safeExtend,
  def,
  getdesc,
  render,
  run,
  curry,
  each,
  DOMcontains,
  flatten,
  isDef,
  isUndef,
  isPrimitive,
  isNativeEvent,
  isNull,
  isFunc,
  isStr,
  isBool,
  isNum,
  isInt,
  isObj,
  isArr,
  isArrlike,
  isEmpty,
  isEl,
  isEq,
  isNode,
  isNodeList,
  isInput,
  isMap,
  isSet
}
});
