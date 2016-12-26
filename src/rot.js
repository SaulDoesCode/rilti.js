/**
* rot.js alpha
* @licence MIT
* @repo SaulDoesCode/rot.js
* @author Saul van der Walt
**/

(function (context, definition) {
  const name = 'rot';
  if (typeof module != 'undefined' && module.exports) module.exports = definition();
  else if (typeof define == 'function' && define.amd) define(name, definition);
  else context[name] = definition();
})(this, () => {
"use strict";
const root = window || global, doc = document;

const curry = (fn, arity) => {
  if(isNaN(arity)) arity = fn.length;
  return (function resolver(...memory) {
    return (...more) => {
      const local = memory.slice().concat(more);
      return (local.length >= arity ? fn : resolver)(...local);
    }
  }());
},
undef = undefined,
includes = curry((host,containee) => host.includes(containee)),
Keys = Object.keys,
every = (arr, fn) => Array.prototype.every.call(arr, fn),
typestr = toString.call,
type = (obj, str) => typestr(obj) === str,
typeinc = str => obj => toString.call(obj).includes(str),
isDef = o => o !== undef,
isUndef = o => o === undef,
isNull = o => o === null,
isFunc = o => typeof o === 'function',
isStr = o => typeof o === 'string',
isBool = o => typeof o === 'boolean',
isNum = o => !isBool(o) && !isNaN(Number(o)),
isPrimitive = s => typeof s === 'string' || typeof s === 'number',
isInt = val => isNum(val) && val % 1 === 0,
isObj = typeinc('Object'),
isArr = Array.isArray,
isArrlike = o => o !== undef && typeof o.length !== 'undefined',
isEmpty = val => {
    try { return !(isObj(val) ? Keys(val).length : isArrlike(val) ? val.length : val.size) || val === ''; } catch (e) {}
    return false;
},
isNode = o => o instanceof Node,
isNodeList = nl => nl instanceof NodeList || (isArrlike(nl) && !isEmpty(nl) && every(nl, isNode)),
isEl = typeinc('HTML'),
isInput = el => isEl(el) && ['INPUT', 'TEXTAREA'].some(includes(el.tagName)),
isMap = typeinc('Map'),
isSet = typeinc('Set'),
each = (iterable, func) => {
    if (isDef(iterable) && isFunc(func)) {
        if(iterable.forEach && !isEmpty(iterable)) iterable.forEach(func);
        else {
          let i = 0;
          if (isArrlike(iterable) && !localStorage) for (; i < iterable.length; i += 1) func(iterable[i], i, iterable);
          else if (isInt(iterable) && !isStr(iterable)) while (iterable != i) func(i += 1);
          else for (i in iterable) if (iterable.hasOwnProperty(i)) func(iterable[i], i, iterable);
        }
    }
},
def = curry(Object.defineProperty),
getdesc = Object.getOwnPropertyDescriptor,
extend = curry((host, obj) => {
  each(Keys(obj), key => def(host,key, getdesc(obj, key)));
  return host;
}),
safeExtend = (host, obj) => {
  each(Keys(obj), key => !(key in host) && def(host,key, getdesc(obj, key)));
  return host;
},
flatten = arr => Array.prototype.reduce.call(arr, (flat, toFlatten) => flat.concat(isArr(toFlatten) ? flatten(toFlatten) : toFlatten), []);

const rename = (obj, keys, newkeys) => {
  each(keys, (key,i) => {
    if(newkeys[i]) def(obj, newkeys[i], getdesc(obj,key));
    delete obj[key];
  });
  return obj;
}

const query = (selector, element = doc) => {
    try {
      return (isStr(element) ? doc.querySelector(element) : element).querySelector(selector);
    } catch(e) {
      return false;
    }
}

const queryAll = (selector, element = doc) => {
    try {
      if (isStr(element)) element = query(element);
      return Array.from(element.querySelectorAll(selector));
    } catch(e) {}
    return false;
}

const queryEach = (selector, element, func) => {
    if (isFunc(element)) {
        func = element;
        element = doc;
    }
    return each(queryAll(selector, element), func);
}

const terr = msg => new TypeError(msg);
const err = msg => new Error(msg);
const DOMcontains = (descendant, parent = doc) => parent == descendant || Boolean(parent.compareDocumentPosition(descendant) & 16);

let NativeEventTypes = "DOMContentLoaded hashchange blur focus focusin focusout load resize scroll unload click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave change select submit keydown keypress keyup error contextmenu pointerdown pointerup pointermove pointerover pointerout pointerenter pointerleave touchstart touchend touchmove touchcancel";
const isNativeEvent = evt => NativeEventTypes.includes(evt);

const EventManager = curry((target, type, handle, options = false) => {
  if(isStr(target)) target = query(target);
  if(!target || !target.addEventListener) throw err('EventManager: Target Invalid');
  let active = false;
  return {
    on() {
        if (!active) {
            target.addEventListener(type, handle, options);
            active = true;
        }
        return this;
    },
    off() {
        if (active) {
          target.removeEventListener(type, handle);
          active = false;
        }
        return this;
    },
    once() {
        this.off();
        active = true;
        target.addEventListener(type, function hn() {
            handle.apply(this, arguments);
            target.removeEventListener(type, hn);
        }, options);
        return this;
    }
  }
}, 3);

const informer = () => {
  const handles = new Set();
  return {
    isInformer : true,
    handle(once, handle) {
        if(isFunc(once)) {
          handle = once;
          once = false;
        }
        if(!isFunc(handle)) throw terr('informer.handle : ought to be a function');

        handle.off = () => {
          handles.delete(handle);
          return handle;
        }
        handle.on = state  => {
          handle._once = !!state;
          handles.add(handle);
          return handle;
        }
        handle.once = handle.on(true);

        return handle.on(once);
    },
    has:v => handles.has(v),
    on(handle) {
      return this.handle(handle);
    },
    once(handle) {
      return this.handle(true, handle);
    },
    off(handle) {handles.delete(handle)},
    get empty() {
      return handles.size == 0;
    },
    get size() {
      return handles.size;
    },
    inform(...args) {
      if (handles.size != 0) handles.forEach(hndl => {
        hndl(...args);
        if(hndl._once) hndl.off();
      });
    }
  }
}

informer.fromEvent = function(target, eventtype, once = false, options) {
    if(isNativeEvent(target)) {
      options = once;
      once = eventtype;
      eventtype = target;
      target = root;
    } else if(isStr(target)) target = query(target);
    if (!target.addEventListener) throw err("informer.fromEvent: target.addEventListener not found");
    if (arguments.length == 1) return informer.fromEvent.bind(null, target);
    if (!isStr(eventtype)) throw terr("informer.fromEvent: eventtype isn't a string");
    if (!isBool(once)) {
        options = once;
        once = false;
    }
    let inf = informer();
    const evtListener = EventManager(target, eventtype, e => {
      inf.inform(e,evtListener);
      if(once) inf = null;
    }, options)[once ? 'once' : 'on']();
    return inf;
}

informer.propHook = (obj,key,hook) => {
  const inf = informer();
  const propDesc = getdesc(obj,key);
  propDesc.enumerable = false;
  const ikey = "informer-"+key;
  const g = 'get', s = 'set';
  def(obj, ikey, propDesc);
  def(obj, key,{
    get() {
      const val = hook ? hook(g, obj[ikey]) : obj[ikey];
      inf.inform(g, val);
      return val;
    },
    set(val) {
      const oldval = obj[ikey];
      const newval = hook ? hook(s, oldval, val) : val;
      inf.inform(s, oldval, newval);
      obj[ikey] = newval;
    }
  });
  return inf;
}

const runstack = new Set();
const addtoRunstack = (...args) => each(args, a => runstack.add(a));
const run = fn => {
  const go = () => {
    runstack.forEach(piece => piece.appendTo(doc.body));
    fn();
  }
  doc.readyState != 'complete' ? informer.fromEvent('DOMContentLoaded', true).once(go) : go();
};
const plugins = options => safeExtend(rot, options);
extend(plugins, {
  methods:{},
  handles:new Set(),
  muthandles : new Set(),
})

const dffstr = html => doc.createRange().createContextualFragment(html || '');
const domfrag = inner => {
    if(isStr(inner)) return dffstr(inner);
    const dfrag = doc.createDocumentFragment();
    dfrag.appendChild(inner);
    return dfrag;
}

const Inner = (node,type) => {
    return function(...args) {
        if (!args.length) return node[type];
        each(args, val => {
            if(val.appendTo) {
              if(!DOMcontains(val.node, node)) {
                val.parent = node.dm;
                val.lifecycle.mount.inform(val, val.node);
              }
              val.appendTo(node);
            }
            if(isStr(val)) val = doc.createTextNode(val);
            if(isNode(val)) node.appendChild(val);
            if(isObj(val) && val.isInformer) val.on(Inner(node, type));
        });
        return this;
    }
}

const on = curry((target, type, handle, options) => EventManager(target, type, handle, options).on(), 3);
const once = curry((target, type, handle, options) => EventManager(target, type, handle, options).once(), 3);

const domMethods = node => ({
  node,
  hasAttr:node.hasAttribute.bind(node),
  getAttr:node.getAttribute.bind(node),
  setAttr(attr, val = '') {
      isObj(attr) ? each(attr, (v,a) => node.setAttribute(a,v)) : node.setAttribute(attr, val);
      return this;
  },
  removeAttr(...args) {
      args.map(node.removeAttribute.bind(node));
      return this;
  },
  toggleAttr(name, val = '') {
    return this[(isBool(val) ? val : node.hasAttribute(name)) ? 'removeAttr' : 'setAttr'](name, val);
  },
  hasClass:(...args) => args.length == 1 ? node.classList.contains(args[0]) : args.every(c => node.classList.contains(c)),
  addClass() {
      each(arguments, c => node.classList.add(c));
      return this;
  },
  removeClass() {
      each(arguments, c => node.classList.remove(c));
      return this;
  },
  toggleClass(Class, state) {
      node.classList[(isBool(state) ? state : node.classList.contains(Class)) ? 'remove' : 'add'](Class);
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
  html: Inner(node, 'innerHTML'),
  text: Inner(node, 'textContent'),
  on:on(node),
  once:once(node),
  append(...args) {
      const dfrag = domfrag();
      each(args, val => val.appendTo ? val.appendTo(dfrag) : isNode(val) ? dfrag.appendChild(val) : dfrag.innerHTML += val);
      node.appendChild(domfrag);
      return this;
  },
  prepend(...args) {
      const dfrag = domfrag();
      each(args, val => val.appendTo ? val.appendTo(dfrag) : isNode(val) ? dfrag.appendChild(val) : dfrag.innerHTML += val);
      isFunc(node.prepend) ? node.prepend(domfrag) : node.insertBefore(domfrag, node.firstChild);
      return this;
  },
  appendTo(val, within) {
      if (isStr(val)) val = query(val, within);
      if(val.append) val.append(node);
      else if(val.appendChild) val.appendChild(node);
      return this;
  },
  prependTo(val, within) {
      if (isStr(val)) val = query(val, within);
      if(val.prepend) val.prepend(node);
      else if(isNode(val)) val.insertBefore(node, val.firstChild);
      return this;
  },
  modify(fn) {
    fn(this, node);
    return this;
  },
  extend(obj) {
    return extend(this, obj);
  },
  get mounted() { return DOMcontains(node) },
  listeners : [],
  lifecycle:{},
  update(options) {
    this.lifecycle.update.inform('options', options, this.oldOptions, this, node);
    return actualize(options, node);
  },
  attrupdate : informer(),
  observeAttr(name, handle, once = false) {
    return this.attrupdate[once ? 'once' : 'on']((attrname, ...details) => name === attrname && handle(attrname, ...details));
  }
});

const lifecycleStages = 'create mount destroy update'.split(' ');
const eventActualizer = (fn, dm) => (val, key) => {
  if(!isEmpty(dm.listeners)) {
    each(dm.listeners, l => l.off());
    dm.listeners = [];
  }
  let listener;
  fn = fn(key);
  if(isFunc(val)) listener = fn(val);
  else if(isObj(val)) listener = val.isInformer ? fn(val.inform.bind(val)) : fn(val.handle, val.options);
  if(listener) dm.listeners.push(listener);
}

function actualize(options, el) {
  if(!isNode(el)) el = isStr(el) ? query(el) : doc.createElement(options.tag);
  const dm = el.dm || (el.dm = domMethods(el));
  dm.oldOptions = options;
  if(options.class) el.className = options.class;
  if(options.inner) {
    if(isFunc(options.inner)) options.inner = options.inner(dm, el);
    isArr(options.inner) ? dm.html(...flatten(options.inner)) : dm.html(options.inner);
  } else if(options.text) dm.text(options.text);
  if(options.style) dm.css(options.style);
  if(options.attr) dm.setAttr(options.attr);
  if(options.on) each(options.on, eventActualizer(dm.on, dm));
  if(options.once) each(options.once, eventActualizer(dm.once, dm));
  if(!dm.lifecycle.create) each(lifecycleStages, stage => {
      dm.lifecycle[stage] = informer();
      if(isObj(options.lifecycle) && isFunc(options.lifecycle[stage])) options.lifecycle[stage] = dm.lifecycle[stage][stage === 'update' ? 'on' : 'once'](options.lifecycle[stage]);
  });
  if(isObj(options.props)) extend(dm, options.props);
  if(!dm.plugged) {
    if(plugins.methods) extend(dm, plugins.methods);
    if(plugins.handles) each(plugins.handles, handle => handle(options, dm, el));
    dm.plugged = true;
  }
  if(!dm.mounted) dm.lifecycle['create'].inform(dm, el);
  return dm;
}

const dom = curry((tag, data) => {
  if(!isStr(tag)) throw terr('invalid element instantiation parameters');
  if(!isObj(data)) data = isArrlike(data) || isNode(data) ? { inner : data } : {};
  data.tag = tag;
  return actualize(data);
});

new MutationObserver(muts => each(muts, mut => {
    if (mut.removedNodes.length > 0) each(mut.removedNodes, el => {
        if (el.dm) el.dm.lifecycle.destroy.inform(el.dm, el);
    });
    if (mut.addedNodes.length > 0) each(mut.addedNodes, el => {
        if (el.dm) {
          el.dm.lifecycle.mount.inform(el.dm, el);
        }
    });
    if(mut.target.dm  && mut.attributeName != 'style') {
      if (mut.type == 'attributes') {
        const dm = mut.target.dm;
        const name = mut.attributeName;
        dm.attrupdate.inform(name, dm.getAttr(name), mut.oldValue, dm.hasAttr(name), dm);
      } else mut.target.dm.lifecycle.update.inform('mut', mut, mut.target.dm, mut.target);
    }
    each(plugins.muthandles, h => h(mut.target,mut.type,mut));
})).observe(doc, {
    attributes: true,
    childList: true,
    subtree: true
});

extend(dom,{extend,query,queryAll,queryEach,on,once, actualize});

each(
  'picture img input list a script table td th tr article aside ul ol li h1 h2 h3 h4 h5 h6 div span pre code section button br label header i style nav menu main menuitem'.split(' '),
  tag => dom[tag] = dom(tag)
);

return {
  informer,
  EventManager,on,once,
  dom,
  plugins,
  extend,
  safeExtend,
  def,
  getdesc,
  rename,
  addtoRunstack,
  runstack,
  run,
  curry,
  each,
  query,queryAll,queryEach,
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
  isNode,
  isNodeList,
  isInput,
  isMap,
  isSet
};

});
