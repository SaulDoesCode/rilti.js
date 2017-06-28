/**
* rot.js alpha
* @licence MIT
* @repo SaulDoesCode/rot.js
* @author Saul van der Walt
**/
var rot = (() => {
"use strict";

const doc = document, root = window, undef = void 0, NULL = null,
curry = (fn, arity = fn.length, resolver = (...memory) => (...more) => {
  const local = memory.concat(more);
  return (local.length >= arity ? fn : resolver)(...local);
}) => resolver(),
arrMeth = curry((meth, val, ...args) => Array.prototype[meth].apply(val, args), 2),
isInstance = (o, t) => o instanceof t,
typestr = toString.call,
istype = str => obj => typeof obj == str,
typeinc = str => obj => toString.call(obj).includes(str),
isDef = o => o !== undef,
isUndef = o => o === undef,
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
isEmpty = val => (val != undef && val != NULL) && !(isObj(val) ? Object.keys(val).length : isArrlike(val) ? val.length : val.size) || isFunc(val),
isNode = o => o && (isInstance(o, Node) || isInstance(o.pure, Node)),
isNodeList = nl => isInstance(nl,NodeList) || (isArrlike(nl) && arrMeth('every',nl,isNode)),
isEl = typeinc('HTML'),
isInput = el => isEl(el) && 'INPUT TEXTAREA'.includes(el.tagName),
isMap = typeinc('Map'),
isSet = typeinc('Set'),
isEq = curry((o1,o2) => o1 === o2),
test = (match, ...cases) => cases.some(Case => match == Case || (isFunc(Case) && Case(match))),
forEach = 'forEach',
each = (iterable, func, i = 0) => {
  isArrlike(iterable) ? arrMeth(forEach,iterable,func) : iterable[forEach] && iterable[forEach](func);
  if(isObj(iterable)) for (i in iterable) func(iterable[i], i, iterable);
  if (isInt(iterable)) while (iterable != i) func(i++);
  return iterable;
},
def = curry(Object.defineProperty),
getdesc = Object.getOwnPropertyDescriptor,
extend = curry((host, obj) => {
  each(Object.keys(obj), key => def(host,key, getdesc(obj, key)));
  return host;
}),
safeExtend = (host, obj) => {
  each(Object.keys(obj), key => !(key in host) && def(host,key, getdesc(obj, key)));
  return host;
},
flatten = arr => isArrlike(arr) ? arrMeth("reduce", arr, (flat, toFlatten) => flat.concat(isArr(toFlatten) ? flatten(toFlatten) : toFlatten), []) : [arr],
query = (selector, element = doc) => (isStr(element) ? doc.querySelector(element) : element).querySelector(selector),
queryAll = (selector, element = doc) => Array.from((isStr(element) ? query(element) : element).querySelectorAll(selector)),
queryEach = (selector, func, element = doc) => {
  if (!isFunc(func)) {
      func = element;
      element = doc;
  }
  each(queryAll(selector, element), func);
},
terr = msg => {throw new TypeError(msg)}, err = msg => {throw new Error(msg)},
DOMcontains = (descendant, parent = doc) => parent == descendant || Boolean(parent.compareDocumentPosition(descendant) & 16),
EventManager = curry((state, target, type, handle, options = false) => {
  if(test(target, isNode, isStr)) target = dom(target);
  if(!target.addEventListener) err('not event target');
  let once = false;

  function wrapper(evt) {
    handle.call(target, evt, target);
    if(once) target.removeEventListener(type, wrapper);
  }

  const remove = () => target.removeEventListener(type, wrapper),
  add = () => {
    remove();
    target.addEventListener(type, wrapper, options);
  },
  manager = {
    off() {
      remove();
      return manager;
    },
    on() {
        once = false;
        add();
        return manager;
    },
    once() {
        once = true;
        add();
        return manager;
    }
  }
  return manager[state]();
}, 4),
once = EventManager('once'),
on = EventManager('on'),

notifier = (mngr = {}, handles = new Map) => extend(mngr, {
  handle(state, type, handle) {
    handle.one = !!state;
    (handles.has(type) ? handles : handles.set(type, new Set)).get(type).add(handle);
    handle.off = () => mngr.off(type, handle);
    return handle;
  },
  on:(type, handle) => mngr.handle(false, type, handle),
  once:(type, handle) => mngr.handle(true, type, handle),
  off(type, handle) {
    if(handles.has(type) && !handles.get(type).delete(handle).size) handles.delete(type);
    return mngr;
  },
  has:type => handles.has(type),
  emit(type, ...args) {
    handles.has(type) && handles.get(type).forEach(handle => {
      handle(...args);
      if(handle.one) handle.off();
    });
    return mngr;
  }
}),
route = notifier((hash, fn) => {
  if(!route.active) {
      route.active = true;
      on(root, 'hashchange', () => route.emit(route.has(location.hash) ? location.hash : 'default', location.hash));
  }
  if(isFunc(hash)) {
    fn = hash;
    hash = 'default';
  }
  if(location.hash === hash || (!location.hash && hash == 'default')) fn();
  return route.on(hash, fn);
}),
lifecycleStages = ['create','mount','destroy','attr'],

run = fn => ready ? fn() : LoadStack.push(fn),
html = html => isNode(html) ? html : doc.createRange().createContextualFragment(html || ''),
domfrag = inner => isPrimitive(inner) ? html(inner) : doc.createDocumentFragment(),
plugins = extend(options => safeExtend(rot, options), { methods:{}, handles:new Set }),

dom_methods = {
  replace:(node, prox, val) => node.replaceWith ? node.replaceWith(val) : node.parentNode.replaceChild(val, node),
  clone:n => dom(n.cloneNode()),
  css(node, prox, styles, prop) {
      isObj(styles) ? each(styles, (p, key) => node.style[key] = p) :
      isStr(styles) && isStr(prop) ? node.style[styles] = prop : terr('.css("" || {}) only');
      return prox;
  },
  inner(node, prox, ...args) {
    prox.html = '';
    each(flatten(args), val => {
        if(val.appendTo) {
          !prox.children.includes(val) && val.data.emit('mount', val);
          val.appendTo(node);
        } else {
          if(isPrimitive(val)) val = doc.createTextNode(val);
          if(isNode(val)) prox.append(val);
        }
    });
    return prox;
  },
  append(node, prox, ...args) {
      const dfrag = domfrag();
      each(flatten(args), arg => dfrag.appendChild(isNode(arg.pure) ? arg.pure : html(arg)));
      node.appendChild(dfrag);
      return prox;
  },
  prepend(node, prox, ...args) {
      const dfrag = domfrag();
      each(flatten(args), arg => dfrag.appendChild(isNode(arg.pure) ? arg.pure : html(arg)));
      node.prepend(dfrag);
      return prox;
  },
  appendTo(node, prox, val) {
      (isStr(val) ? query(val) : val).appendChild(node);
      return prox;
  },
  prependTo(node, prox, val) {
      (isStr(val) ? query(val) : val).prepend(node);
      return prox;
  },
  find:(node, prox, selector) => dom(query(selector, node)),
  modify(node, prox, fn) {
    fn.call(prox, prox, node);
    return prox;
  },
  remove(node, prox, after) {
    isNum(after) ? setTimeout(() => node.remove(), after) : node.remove();
    return prox;
  }
},
render = (...args) => (node = 'body') => {
  if(isNode(node)) dom_methods.append(node, NULL, args);
  if(isStr(node)) run(() => isNode(node = dom(node == 'body' ? doc.body : node)) ? node.append(args) : err('render: invalid target'));
},

ProxyNodes = new Map,

dom = new Proxy((element, within) => {
  if(isStr(element)) element = query(element, within);
  if(ProxyNodes.has(element)) return ProxyNodes.get(element);
  if(isNode(element)) {
    const attr = new Proxy((attr, val) => {
      if(isObj(attr)) each(attr, (v, a) => element.setAttribute(a,v));
      else if(isPrimitive(val)) element.setAttribute(attr, val);
      else return element.getAttribute(attr);
    }, {
      get(_, key) {
        return key == 'has' ? name => element.hasAttribute(name) : element.getAttribute(key);
      },
      set(_, key, val) {
        if(isPrimitive(val)) element.setAttribute(key, val);
        return true;
      },
      deleteProperty(_, key) {
        return !element.removeAttribute(key);
      }
    }),

    classes = new Proxy((c, state = !element.classList.contains(c)) => {
      state = state ? 'add' : 'remove';
      c.includes(' ') ? each(c.split(' '), cls => element.classList[state](cls)) :
      element.classList[state](c);
      return elementProxy;
    }, {
      get:(_, key) => element.classList.contains(key),
      set:(cls, key, val) => cls(key, val),
      deleteProperty:(cls, key) => cls(key, false)
    }),

    data = notifier({ isInput:isInput(element) }),

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
        key == 'children' ? arrMeth('map', el.children, child => dom(child)) :
        key in el ? autobind(Reflect.get(el, key)) :
        key == 'class' ? classes :
        key == 'attr' ? attr :
        key == 'pure' ? el :
        test(key, 'on','once') ? EventManager(key, element) :
        key == 'html' ? el[inputHTML] :
        key == 'txt' ? el[textContent] :
        key == 'mounted' ? DOMcontains(element) :
        key == 'rect' ? el.getBoundingClientRect() :
        key == 'data' ? data :
        key in data ? getdata(key) :
        key in plugins.methods ? plugins.methods[key].bind(el, el, elementProxy) : undef;
      },
      set(el, key, val, prox) {
        if(val != undef) {
          key == 'class' && isStr(val) ? classes(val, true) :
          test(key, 'html', 'txt') ? el[key == 'txt' ? textContent : inputHTML] = isFunc(val) ? val(prox[key]) : val :
          key == 'render' && test(val, isNode, isStr) ? render(el)(val) :
          key in el ? Reflect.set(el, key, val) :
          key == 'css' ? prox.css(val) :
          key == 'attr' ? attr(val) :
          Reflect.set(data.emit('set', val).emit('set:'+key, val), key, val);
        }
        return true;
      },
      deleteProperty:(el, key) => key == 'self' ? el.remove() : Reflect.deleteProperty(data, key)
    });
    data.once('destroy', () => ProxyNodes.delete(element));
    ProxyNodes.set(element, elementProxy);
    return elementProxy;
  }
}, {
  get:(d, key) => key in d ? Reflect.get(d, key) : create.bind(undef, key),
  set:(d,key) => Reflect.set(d,key)
}),

create = (tag, options, ...children) => {
  const el = dom(doc.createElement(tag));
  if(test(options, isArrlike, isNode)) {
    children = test(options, isStr, isNode) ? [options] : options;
    options = NULL;
  } else if(isObj(options)) {

    for(let handle of plugins.handles) handle(options, el);

    each(options, (val, key) => {
      if(key != 'render') {
        if(key == 'lifecycle') each(lifecycleStages, stage => isFunc(val[stage]) && el.data[stage == 'attr' ? 'on' : 'once'](stage, val[stage].bind(el)));
        else if(key == 'attr') el.attr = val;
        else if(test(key,'class','className')) el.className = val;
        else if(test(key,'style','css')) el.css(val);
        else if(test(key,'on','once')) each(val, (handle, type) => el[key](type, handle));
        else if(test(key,'props','data') && isObj(val)) {
          let desc;
          for(let prop in val) {
              desc = getdesc(val, prop);
              if(desc.get) desc.get = desc.get.bind(el);
              if(desc.set) desc.set = desc.set.bind(el);
              if(isFunc(desc.value)) desc.value = desc.value.bind(el);
              def(el.data, prop, desc);
          }
        } else if(key in el) el[key] = val;
        else if(isPrimitive(val)) el.attr(key, val);
      }
    });
  }
  !isEmpty(children) && el.inner(...children);
  !(el.tagName.includes('-') || el.mounted) && el.data.emit('create', el);
  if(options && options.render) el.render = options.render;
  return el;
},

mountORdestroy = (stack, type) => {
  if (stack.length > 0) for(let el of stack) if(isEl(el) && !el.tagName.includes('-') && ProxyNodes.has(el)) (el = dom(el)).data.emit(type , el);
}

let LoadStack = [], ready = false;
once(root, 'DOMContentLoaded', () => {
  ready = true;
  each(LoadStack, fn => fn());
  LoadStack = null;
});

(dom.extend = extend(dom))({query,queryAll,queryEach,on,once,html});

const observedAttributes = new Map,
observeAttr = (name, stages) => {
  let {init, update, destroy} = stages;
  observedAttributes.set(name, stages);
  run(() => queryEach(`[${name}]`, el => {
    el = dom(el);
    init(el, el.attr[name]);
    el[name+"_init"] = true;
  }));
},
unobserveAttr = name => observedAttributes.delete(name);

new MutationObserver(muts => each(muts, ({addedNodes, removedNodes, target, attributeName, oldValue}) => {
  mountORdestroy(addedNodes, 'mount');
  mountORdestroy(removedNodes, 'destroy');
  if(attributeName && (attributeName != 'style' && isEl(target) && ProxyNodes.has(target))) {
    target = dom(target);
    if(observedAttributes.has(attributeName)) {
      let observedAttr = observedAttributes.get(attributeName);
      if(target.attr.has(attributeName)) {
          if(!target[attributeName+"_init"]) {
            observedAttr.init(target, target.attr[attributeName]);
            target[name+"_init"] = true;
          } else observedAttr.update && observedAttr.update(target, target.attr[attributeName], oldValue);
      } else observedAttr.destroy && observedAttr.destroy(target, oldValue);
    }
    target.data.emit('attr:'+attributeName,target,target.attr[attributeName],oldValue);
  }
})).observe(doc, {attributes:true, childList:true, subtree:true});

return {dom,notifier,observeAttr,unobserveAttr,plugins,extend,safeExtend,def,getdesc,route,render,run,curry,each,DOMcontains,flatten,isDef,isUndef,isPrimitive,isNull,isFunc,isStr,isBool,isNum,isInt,isObj,isArr,isArrlike,isEmpty,isEl,isEq,isNode,isNodeList,isInput,isMap,isSet}
})();
