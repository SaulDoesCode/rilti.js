/**
* rilti.js alpha
* @licence MIT
* @repo SaulDoesCode/rilti.js
* @author Saul van der Walt
**/
var rilti = (() => {
"use strict";

const doc = document, root = window, undef = void 0, NULL = null, forEach = 'forEach',
curry = (fn, arity = fn.length, resolver = (...memory) => (...more) => ((more.length + memory.length) >= arity ? fn : resolver)(...memory.concat(more))) => resolver(),
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
each = (iterable, func, i = 0) => {
  if(!isEmpty(iterable)) {
    isArrlike(iterable) ? arrMeth(forEach, iterable, func) : iterable[forEach] && iterable[forEach](func);
    if(isObj(iterable)) for (i in iterable) func(iterable[i], i, iterable);
  } else if (isInt(iterable)) while (iterable != i) func(i++);
  return iterable;
},
def = curry(Object.defineProperty),
getdesc = Object.getOwnPropertyDescriptor,
extend = curry((host, obj) => (each(Object.keys(obj), key => def(host,key, getdesc(obj, key))), host)),
safeExtend = (host, obj) => (each(Object.keys(obj), key => !(key in host) && def(host,key, getdesc(obj, key))),host),
reseat = (host, props) => {
  if(!isEmpty(props)) {
    let desc;
    for(let prop in props) {
        desc = getdesc(props, prop);
        if(desc.get) desc.get = desc.get.bind(host);
        if(desc.set) desc.set = desc.set.bind(host);
        if(isFunc(desc.value)) desc.value = desc.value.bind(host);
        def(host, prop, desc);
    }
  }
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
EventManager = curry((state, target, type, handle, options = false, once) => {
  if(test(target, isNode, isStr)) target = dom(target);
  if(!target.addEventListener) err('bad evt target');

  function wrapper(evt) {
    handle.call(target, evt, target);
    once && target.removeEventListener(type, wrapper);
  }

  const remove = () => target.removeEventListener(type, wrapper),
  add = mode => {
    once = !!mode;
    remove();
    target.addEventListener(type, wrapper, options);
  },
  manager = {
    on:() => (add(), manager),
    once:() => (add(true), manager),
    off:() => (remove(), manager)
  }
  return manager[state]();
}, 4),
once = EventManager('once'), on = EventManager('on'),
notifierHandle = (handles, type, handle, one) => {
  handle.one = !!one;
  handle.type = type;
  handle.off = () => handles.has(type) && !handles.get(type).delete(handle).size && handles.delete(type);
  (handles.has(type) ? handles : handles.set(type, new Set)).get(type).add(handle);
  return handle;
},
notifier = (mngr = {}, handles = new Map) => extend(mngr, {
  on:(type, handle) => notifierHandle(handles, type, handle),
  once:(type, handle) => notifierHandle(handles, type, handle, true),
  off:(type, handle) => ((handles.has(type) && !handles.get(type).delete(handle).size) && handles.delete(type), mngr),
  has:type => handles.has(type),
  emit:(type, ...args) => (handles.has(type) && handles.get(type)[forEach](handle => {
    handle(...args);
    handle.one && handle.off();
  }), mngr)
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
  if(location.hash == hash || (!location.hash && hash == 'default')) fn();
  return route.on(hash, fn);
}),
lifecycleStages = ['create','mount','destroy','attr'],

run = fn => ready ? fn() : LoadStack.push(fn),
html = html => isNode(html) ? html : doc.createRange().createContextualFragment(html || ''),
domfrag = inner => isPrimitive(inner) ? html(inner) : doc.createDocumentFragment(),
plugins = extend(options => safeExtend(rilti, options), { methods:{}, handles:new Set }),
vpend = args => {
  const dfrag = domfrag();
  each(flatten(args), arg => dfrag.appendChild(isNode(arg.pure) ? arg.pure : html(arg)));
  return dfrag;
},

dom_methods = {
  replace:(node, prox, val) => node.replaceWith ? node.replaceWith(val) : node.parentNode.replaceChild(val, node),
  clone:n => dom(n.cloneNode(true)),
  css:(node, prox, styles, prop) => (isObj(styles) ? each(styles, (p, key) => node.style[key] = p) : isStr(styles) && isStr(prop) ? node.style[styles] = prop : terr('"" or {} only)'), prox),
  attrToggle:(node, prox, name, state = !node.hasAttribute(name)) => (node[state ? 'setAttribute' : 'removeAttribute'](name,''), prox),
  inner(node, prox, ...args) {
    prox.html = '';
    each(flatten(args), val => {
        if(val.appendTo) {
          !prox.children.includes(val) && val.data.emit('mount', val);
          val.appendTo(node);
        } else {
          if(isFunc(val)) val = val.call(prox, prox);
          if(isPrimitive(val)) val = doc.createTextNode(val);
          if(isNode(val)) prox.append(val);
        }
    });
    return prox;
  },
  append:(node, prox, ...args) => (node.appendChild(vpend(args)), prox),
  prepend:(node, prox, ...args) => (node.prepend(vpend(args)), prox),
  appendTo:(node, prox, val) => ((isStr(val) ? query(val) : val).appendChild(node), prox),
  prependTo:(node, prox, val) => ((isStr(val) ? query(val) : val).prepend(node), prox),
  remove:(node, prox, after) => (isNum(after) ? setTimeout(() => node.remove(), after) : node.remove(), prox),
  find:(node, prox, selector) => dom(query(selector, node))
},
render = (...args) => (node = 'body') => {
  if(isNode(node)) dom_methods.append(node, NULL, args);
  if(isStr(node)) run(() => isNode(node = dom(node == 'body' ? doc.body : node)) ? node.append(args) : err('render: invalid target'));
},

observedAttributes = new Map,
attrInit = (el,name) => (el[name+"_init"] = true, el),
observeAttr = (name, stages) => {
  let {init, update, destroy} = stages;
  observedAttributes.set(name, stages);
  run(() => queryEach(`[${name}]`, el => init(attrInit(el = dom(el),name), el.attr[name])));
},
unobserveAttr = name => observedAttributes.delete(name),
checkAttr = (name, el, oldValue) => {
  if(observedAttributes.has(name)) {
      const val = el.getAttribute(name), observedAttr = observedAttributes.get(name);
      if(isPrimitive(val)) {
          if(!el[name+"_init"]) observedAttr.init(attrInit(el,name), val);
          else observedAttr.update && val != oldValue && observedAttr.update(el, val, oldValue);
      } else observedAttr.destroy && observedAttr.destroy(el, val, oldValue);
  }
},

ProxyNodes = new Map,
dom = new Proxy((element, within) => {
  if(isStr(element)) element = query(element, within);
  if(!element || element.pure) return element;
  if(ProxyNodes.has(element)) return ProxyNodes.get(element);
  if(isNode(element)) {
    const attr = new Proxy((attr, val) => isObj(attr) ? each(attr, (v, a) => {
        element.setAttribute(a,v);
        checkAttr(a, element);
      }) : isPrimitive(val) ? element.setAttribute(attr, val) : element.getAttribute(attr), {
      get:(_, key) => key == 'has' ? name => element.hasAttribute(name) : element.getAttribute(key),
      set:(atr, key, val) => !atr(key, val),
      deleteProperty:(_, key) => !element.removeAttribute(key)
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

    eventifier = state => new Proxy(EventManager(state, element), {
      get:(evtMngr, type) => evtMngr(type),
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
      get:(el, key) => key in dom_methods ? dom_methods[key].bind(el, el, elementProxy) :
          key == 'children' ? arrMeth('map', el.children, child => dom(child)) :
          key == 'childNodes' ? arrMeth('map', el.childNodes, child => dom(child)) :
          key in el ? autobind(Reflect.get(el, key)) :
          key == 'class' ? classes :
          key == 'attr' ? attr :
          key == 'pure' ? el :
          test(key, 'on','once') ? eventifier(key) :
          key == 'html' ? el[inputHTML] :
          key == 'txt' ? el[textContent] :
          key == 'mounted' ? DOMcontains(element) :
          key == 'parent' ? dom(element.parentNode) :
          key == 'rect' ? el.getBoundingClientRect() :
          key == 'data' ? data :
          key in data ? getdata(key) :
          key in plugins.methods && plugins.methods[key].bind(el, el, elementProxy),
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
    data.once('destroy', () => {
      element.isDestroyed = true;
      ProxyNodes.delete(element.pure);
    });
    ProxyNodes.set(element, elementProxy);
    return elementProxy;
  }
}, {
  get:(d, key) => key in d ? Reflect.get(d, key) : create.bind(undef, key),
  set:(d,key) => Reflect.set(d,key)
}),

create = (tag, options, ...children) => {
  const el = dom(doc.createElement(tag));
  if(test(options, isArrlike, isNode)) children = test(options, isStr, isNode) ? [options, ...children] : options;
  else if(isObj(options)) {
    each(plugins.handles, handle => handle(options, el));
    each(options, (val, key) => {
      if(key != 'render') {
        if(key == 'lifecycle') each(lifecycleStages, stage => isFunc(val[stage]) && el.data[stage == 'create' ? 'once' : 'on'](stage, val[stage].bind(el)));
        else if(key == 'attr') el.attr(val);
        else if(test(key,'class','className')) el.className = val;
        else if(test(key,'style','css')) el.css(val);
        else if(test(key,'on','once')) each(val, (handle, type) => el[key](type, handle));
        else if(test(key,'props','data') && isObj(val)) reseat(el,val);
        else if(isFunc(val) || (key in el)) el[key] = val;
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
},
txtBind = (prop, val) => el => {
  if(isPrimitive(val)) el.data[prop] = val
  const txtNode = doc.createTextNode(el.data[prop]);
  el.data.on('set:'+prop, val => txtNode.textContent = val);
  return txtNode;
},
intervalManager = (interval, fn, destroySync, intervalID, mngr = ({
  stop:() => (clearInterval(intervalID), mngr),
  start() {
    intervalID = setInterval(fn, interval);
    isNode(destroySync) && mngr.destroySync(dom(destroySync));
    return mngr;
  },
  destroySync:el => el.data.once('destroy', () => mngr.stop())
})) => mngr.start();

let LoadStack = [], ready = false;
once(root, 'DOMContentLoaded', () => {
  ready = true;
  each(LoadStack, fn => fn());
  LoadStack = NULL;
});

(dom.extend = extend(dom))({query,queryAll,queryEach,on,once,html,txtBind});

new MutationObserver(muts => each(muts, ({addedNodes, removedNodes, target, attributeName, oldValue}) => {
  mountORdestroy(addedNodes, 'mount');
  mountORdestroy(removedNodes, 'destroy');
  if(attributeName && (attributeName != 'style' && isEl(target) && ProxyNodes.has(target))) {
    checkAttr(attributeName, target = dom(target), oldValue);
    target.data.emit('attr:'+attributeName,target,target.attr[attributeName],oldValue);
  }
})).observe(doc, {attributes:true, childList:true, subtree:true});

return {dom,notifier,observeAttr,unobserveAttr,plugins,intervalManager,extend,safeExtend,reseat,def,getdesc,route,render,run,curry,each,DOMcontains,flatten,isDef,isUndef,isPrimitive,isNull,isFunc,isStr,isBool,isNum,isInt,isObj,isArr,isArrlike,isEmpty,isEl,isEq,isNode,isNodeList,isInput,isMap,isSet}
})();
