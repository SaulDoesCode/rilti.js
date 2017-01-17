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
const curry = (fn, arity = fn.length) => {
  const resolver = (...memory) => (...more) => {
    const local = memory.concat(more);
    return (local.length >= arity ? fn : resolver)(...local);
  }
  return resolver();
},
root = window || global || this,
doc = document,
undef = void 0,
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
isEq = curry((o1,o2) => o1 === o2),
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
flatten = arr => isArrlike(arr) ? Array.prototype.reduce.call(arr, (flat, toFlatten) => flat.concat(isArr(toFlatten) ? flatten(toFlatten) : toFlatten), []) : [arr],

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
  if (!isStr(type)) throw terr("event type not string");
  if(isStr(target)) target = query(target);
  if(!target || !target.addEventListener) throw err('EventManager: Target Invalid');
  const add = target.addEventListener.bind(target, type),
  remove = target.removeEventListener.bind(target, type);
  let once = false;
  if(isEl(target)) target = dom(target);
  function wrapper(evt) {
    handle.call(target, evt, target);
    if(once) remove(wrapper);
  }
  const manager = {
    off() {
        remove(wrapper);
        if(target.listeners) target.listeners.delete(manager);
        return manager;
    },
    on() {
        once = false;
        add(wrapper, options);
        if(target.listeners) target.listeners.add(manager);
        return manager;
    },
    once() {
        remove(wrapper);
        once = true;
        add(wrapper, options);
        if(target.listeners) target.listeners.add(manager);
        return manager;
    },
    activate:state => manager[!!state ? 'once' : 'on']()
  }
  return manager;
}, 3),

evtsys = (handles = new Map) => {
  const mngr = {
    handle(state, type, handle) {
      handle.one = !!state;
      const typeset = (handles.has(type) ? handles : handles.set(type, new Set)).get(type).add(handle);
      handle.off = () => mngr.off(type, handle);
      return handle;
    },
    on:(type, handle) => mngr.handle(false, type, handle),
    once:(type, handle) => mngr.handle(true, type, handle),
    off(type, handle) {
      if(handles.has(type) && !handles.get(type).delete(handle).size) handles.delete(type);
    },
    has:type => handles.has(type),
    emit(type, ...args) {
      handles.has(type) && handles.get(type).forEach(handle => {
        handle(...args);
        if(handle.one) handle.off();
      });
    }
  };
  return mngr;
},

lt = curry((state, ...args) => EventManager(...args).activate(!!state), 4),
on = lt(false),
once = lt(true),
lifecycleStages = 'create mount destroy attr'.split(' ');

once(root, 'DOMContentLoaded', () => LoadStack.forEach(fn => fn()));

const LoadStack = new Set,
run = fn => doc.readyState != 'complete' ? LoadStack.add(fn) : fn(),
render = (...args) => node => {
    if(isNode(node)) {
      node = dom(node);
      each(flatten(args), arg => isSet(arg) || isArrlike(arg) ? each(arg, a => node.append(a)) : node.append(arg));
    } else run(() => {
      if(!isDef(node)) node = doc.body;
      else if(isStr(node)) node = query(node);
      if(!isNode(node)) throw err('rot.render: invalid render node');
      node = dom(node);
      each(flatten(args), arg => isSet(arg) || isArrlike(arg) ? each(arg, a => node.append(a)) : node.append(arg));
    })
},
pluck = (el, within) => {
  (el = isNode(el) ? el : query(el, within)).remove();
  return dom(el);
},
htmlstr = html => doc.createRange().createContextualFragment(html || ''),
domfrag = inner => isPrimitive(inner) ? htmlstr(inner) : doc.createDocumentFragment(),
plugins = options => safeExtend(rot, options);
extend(plugins, {
  methods:{},
  handles:new Set
});

const dom_methods = {
  replace:(node, prox, val) => node.replaceWith ? node.replaceWith(val) : node.parentNode.replaceChild(val, node),
  clone:n => dom(n.cloneNode()),
  css(node, prox, styles, prop) {
      if (isObj(styles)) each(styles, (prop, key) => node.style[key] = prop);
      else if (isStr(styles) && isStr(prop)) node.style[styles] = prop;
      else throw terr('CSS : Styles is not an object or string pair');
  },
  inner(node, prox, ...args) {
    prox.html = '';
    for(let val of flatten(args)) {
        if(val.appendTo) {
          if(!prox.children.includes(val)) val.inf.emit('mount', val);
          val.appendTo(node);
        } else {
          if(isPrimitive(val)) val = doc.createTextNode(val);
          if(isNode(val)) prox.append(val);
        }
    }
    return prox;
  },
  append(node, prox, ...args) {
      const dfrag = domfrag();
      args.forEach(arg => {
        if(isNode(arg.pure)) arg = arg.pure;
        dfrag.appendChild(isNode(arg) ? arg : htmlstr(arg));
      });
      node.appendChild(dfrag);
      return prox;
  },
  prepend(node, prox, ...args) {
      const dfrag = domfrag();
      args.forEach(arg => {
        if(isNode(arg.pure)) arg = arg.pure;
        dfrag.appendChild(isNode(arg) ? arg : htmlstr(arg));
      });
      node.prepend(dfrag);
      return prox;
  },
  appendTo(node, prox, val) {
      (isStr(val) ? query(val) : val).appendChild(node);
      return prox;
  },
  prependTo(node, prox, val) {
      (isStr(val) ? query(val) : val).prepend();
      return prox;
  },
  modify(node, prox, fn) {
    fn.call(prox, prox, node);
    return prox;
  },
  remove(node, prox, after) {
    isNum(after) ? setTimeout(() => node.remove(), after) : node.remove();
    return prox;
  }
},

ProxiedNodes = new Map;

const dom = new Proxy(element => {
  if(isStr(element)) element = query(element);
  if(isEl(element)) {
    if(ProxiedNodes.has(element)) return ProxiedNodes.get(element);

    const attr = new Proxy((attr, val) => {
      if(isObj(attr)) each(attr, (a, v) => element.setAttribute(a,v));
      else if(isDef(val)) element.setAttribute(attr, val);
      else return element.getAttribute(attr);
    }, {
      get(_, key) {
        if(key == 'has') return name => element.hasAttribute(name);
        return element.getAttribute(key);
      },
      set(_, key, val) {
        element.setAttribute(key, val);
        return true;
      },
      deleteProperty(_, key) {
        element.removeAttribute(key);
        return true;
      }
    });

    const classes = new Proxy((c, state = !element.classList.contains(c)) => element.classList[state ? 'add' : 'remove'](c), {
      get(_, key) {
        if(key == 'remove') return c => element.classList.remove(c);
        return element.classList.contains(key);
      },
      set(cls, key, val) {
        cls(key, val);
        return true;
      },
      deleteProperty(_, key) {
        element.classList.remove(key);
        return true;
      }
    });

    const informer = evtsys(),
    listeners = new Set,

    L = fn => new Proxy(fn.bind(undef, element), {
      get(fn, key) {
        return fn(key);
      },
      set(fn, key, val) {
        if(isFunc(val)) return fn(key, val);
      }
    }), On = L(on), Once = L(once),

    data = {
      on:(mode, fn) => informer.on('data:'+mode, fn),
      once:(mode, fn) => informer.once('data:'+mode, fn),
      emit(mode, ...args) {
        informer.emit('data:'+mode, ...args);
        return data;
      },
      isInput : isInput(element)
    },
    autobind = v => isFunc(v) ? v.bind(element) : v,
    getdata = key => {
      const val = autobind(Reflect.get(data, key));
      data.emit('get', val).emit('get:'+key, val);
      return val;
    },

    inputHTML = data.isInput ? 'value' : 'innerHTML',
    textContent = data.isInput ? 'value' : 'textContent',

    elementProxy = new Proxy(element, {
      get(el, key) {
        return key in dom_methods ? dom_methods[key].bind(el, el, elementProxy) :
        key == 'children' ? Array.from(el.children).map(child => dom(child)) :
        key in el ? autobind(Reflect.get(el, key)) :
        key == 'class' ? classes :
        key == 'attr' ? attr :
        key == 'pure' ? el :
        key == 'listeners' ? listeners :
        key == 'informer' || key == 'inf' ? informer :
        key == 'on' ? On :
        key == 'once' ? Once :
        key == 'html' ? el[inputHTML] :
        key == 'txt' ? el[textContent] :
        key == 'mounted' ? DOMcontains(element) :
        key == "data" ? data :
        key in data ? getdata(key) :
        key in plugins.methods ? plugins.methods[key].bind(el, el, elementProxy) : undef;
      },
      set(el, key, val, prox) {
        if(key in el) return Reflect.set(el, key, val);
        if(key == 'class' && isStr(val)) val.includes(' ') ? val.split(' ').forEach(c => el.classList.add(c)) : el.classList.add(val);
        else if(key == 'html') {
          if(isFunc(val)) val = val(el[inputHTML]);
          if(val == undef) val = '';
          el[inputHTML] = val;
        } else if(key == 'txt') {
          if(isFunc(val)) val = val(el[textContent]);
          if(val == undef) val = '';
          el[textContent] = val;
        } else if(key == 'attr' && isObj(val)) each(val, (v, k) => element.setAttribute(k, v));
        else if(key == 'data' && isObj(val)) for(let prop in val) {
          const desc = getdesc(val, prop);
          if(desc.get) desc.get = desc.get.bind(prox);
          if(desc.set) desc.set = desc.set.bind(prox);
          if(isFunc(desc.value)) desc.value = desc.value.bind(prox);
          Object.defineProperty(data, prop, desc);
        } else if(key == 'css' && isObj(val)) el.css(val);
        else return Reflect.set(data.emit('set', val).emit('set:'+key, val), key, val);
        return true;
      },
      deleteProperty(el, key) {
        if(key == 'self') el.remove();
        else return Reflect.deleteProperty(data, key);
      }
    });
    informer.once('destroy', () => ProxiedNodes.delete(element));
    ProxiedNodes.set(element, elementProxy);
    return elementProxy;
  }
}, {
  get(d, key) {
    return key in d ? Reflect.get(d, key) : create.bind(undef, key);
  },
  set(d, key) {
    return Reflect.set(d, key);
  }
}),

create = (tag, options, ...children) => {
  const el = dom(doc.createElement(tag));
  if(isObj(options)) {
    const {attr, lifecycle} = options;
    if(lifecycle) for(let stage of lifecycleStages) if(isFunc(lifecycle[stage])) el.inf.once(stage, (...args) => lifecycle[stage].apply(el, args));
    for(let handle of plugins.handles) handle(options, el);
    each(options, (val, key) => {
      if(key == 'class' || key == 'className') el.className = val;
      else if(key == 'style' || key == 'css') el.css(val);
      else if(key == 'on' || key == 'once') each(val, (handle, type) => el[key][type] = handle);
      else if((key == 'props' || key == 'data') && isObj(val)) el.data = val;
      else {
        if(key in el) el[key] = val;
        else if(isPrimitive(val)) el.attr = val;
      }
    });
    if(attr && !isEmpty(attr)) el.attr = attr;
  }
  if(!isEmpty(children)) el.inner(...children);
  if(!el.tagName.includes('-') && !el.mounted) el.inf.emit('create', el);

  if(options && options.render) render(el)(options.render);
  else el.render = (node = doc.body) => render(el)(node);
  return el;
};

(dom.extend = extend(dom))({query,queryAll,queryEach,on,once, html : htmlstr});

new MutationObserver(muts => {
  for(let mut of muts) {
    const {removedNodes, addedNodes, target, attributeName} = mut;
    let el;
    if (removedNodes.length > 0) for(el of removedNodes) if(isEl(el) && !el.tagName.includes('-')) (el = dom(el)).inf.emit('destroy', el);
    if (addedNodes.length > 0) for(el of addedNodes) if(isEl(el) && !el.tagName.includes('-')) (el = dom(el)).inf.emit('mount', el);
    if(attributeName != 'style' && isEl(target)) (el = dom(target)).inf.emit('attr:'+attributeName, el.attr[attributeName], mut.oldValue, el.attr.has(attributeName), el);
  }
}).observe(doc, {
    attributes: true,
    childList: true,
    subtree: true
});

return {
  dom,
  evtsys,
  EventManager,
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
  isSet,
  ready:() => doc.readyState == 'complete'
}
});
