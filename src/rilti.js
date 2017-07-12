/**
* rilti.js alpha
* @licence MIT
* @repo SaulDoesCode/rilti.js
* @author Saul van der Walt
**/
var rilti = (root => {
"use strict";

const doc = document,
undef = void 0,
NULL = null,
forEach = 'forEach',
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
isEmpty = val => (val == undef || val == NULL || isFunc(val)) || !(isObj(val) ? Object.keys(val).length : isArrlike(val) ? val.length : val.size),
isNode = o => o && (isInstance(o, Node) || isInstance(o.pure, Node)),
isNodeList = nl => isInstance(nl,NodeList) || (isArrlike(nl) && arrMeth('every',nl,isNode)),
isEl = typeinc('HTML'),
isInput = el => isEl(el) && 'INPUT TEXTAREA'.includes(el.tagName),
isMap = typeinc('Map'),
isSet = typeinc('Set'),
isEq = curry((o1,...vals) => vals.every(isFunc(o1) ? i => o1(i) : i => o1 === i), 2),
test = (match, ...cases) => cases.some(Case => match == Case || (isFunc(Case) && Case(match))),
each = (iterable, func, i = 0) => {
  if(!isEmpty(iterable)) {
    iterable[forEach] ? iterable[forEach](func) : isArrlike(iterable) && arrMeth(forEach, iterable, func);
    if(isObj(iterable)) {
      const keys = Object.keys(iterable), max = keys.length;
      while(i < max) {
        func(iterable[keys[i]], keys[i], iterable);
        i++;
      }
    }
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
    each(props, prop => {
      desc = getdesc(props, prop);
      if(isNode(host.pure)) {
        if(desc.get) host.getter(prop, desc.get);
        if(desc.set) host.setter(prop, desc.get);
        if(desc.value) host[prop] = desc.value;
        return;
      }
      if(desc.get) desc.get = desc.get.bind(host);
      if(desc.set) desc.set = desc.set.bind(host);
      if(isFunc(desc.value)) desc.value = desc.value.bind(host);
      def(host, prop, desc);
    });
  }
},
flatten = arr => isArrlike(arr) ? arrMeth("reduce", arr, (flat, toFlatten) => flat.concat(isArr(toFlatten) ? flatten(toFlatten) : toFlatten), []) : [arr],
query = (selector, element = doc) => (isStr(element) ? doc.querySelector(element) : element).querySelector(selector),
queryAll = (selector, element = doc) => Array.from((isStr(element) ? query(element) : element).querySelectorAll(selector)),
queryEach = (selector, func, element = doc) => (!isFunc(func) && ([func, element] = [element, doc]), each(queryAll(selector, element), func)),
DOMcontains = (descendant, parent = doc) => parent == descendant || Boolean(parent.compareDocumentPosition(descendant) & 16),
terr = msg => {throw new TypeError(msg)}, err = msg => {throw new Error(msg)},
EventManager = curry((state, target, type, handle, options = false, once) => {
  if(test(target, isNode, isStr)) target = dom(target);
  if(!target.addEventListener) err('bad event target');

  function handler(evt) {
    handle.call(target, evt, target);
    once && target.removeEventListener(type, handler);
  }

  const remove = () => {
    target.removeEventListener(type, handler);
    target.eventListeners && target.eventListeners.delete(manager);
  },
  add = mode => {
    once = !!mode;
    remove();
    target.addEventListener(type, handler, options);
    target.eventListeners && target.eventListeners.add(manager);
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
notifierHandle = (handles, mngr, type, handle, one) => {
  handle.one = !!one;
  handle.type = type;
  handle.off = () => (mngr.off(type, handle), handle);
  (handles.has(type) ? handles : handles.set(type, new Set)).get(type).add(handle);
  return handle;
},
notifier = (mngr = {}, handles = new Map) => extend(mngr, {
  on:(type, handle) => notifierHandle(handles, mngr, type, handle),
  once:(type, handle) => notifierHandle(handles, mngr, type, handle, true),
  off:(type, handle) => ((handles.has(type) && !handles.get(type).delete(handle).size) && handles.delete(type), mngr),
  has:type => handles.has(type),
  emit:(type, ...args) => (each(handles.get(type), handle => {
    handle(...args);
    handle.one && handle.off();
  }), mngr)
}),

route = notifier((hash, fn) => {
  if(!route.active) {
      route.active = true;
      on(root, 'hashchange', () => route.emit(route.has(location.hash) ? location.hash : 'default', location.hash));
  }
  if(isFunc(hash)) [fn, hash] = [hash, 'default'];
  if(location.hash == hash || (!location.hash && hash == 'default')) fn();
  return route.on(hash, fn);
}),

lifecycleStages = ['create','mount','destroy','attr'],

run = fn => ready ? fn() : LoadStack.push(fn),
html = html => html.pure ? html.pure : isNode(html) ? html : doc.createRange().createContextualFragment(html || ''),
domfrag = inner => isPrimitive(inner) ? html(inner) : doc.createDocumentFragment(),
vpend = (args, dfrag = domfrag()) => (each(flatten(args), arg => dfrag.appendChild(html(arg))), dfrag),
autoQuery = n => isStr(n) ? query(n) : n,

domMethods = {
  replace:(node, prox, val) => node.replaceWith ? node.replaceWith(val) : node.parentNode.replaceChild(val, node),
  clone(node, prox) {
    const clone = dom(node.cloneNode());
    each(prox.eventListeners, l => l.reseat(clone));
    each(prox.setters, (fn, prop) => clone.setters.set(prop, fn));
    each(prox.getters, (fn, prop) => clone.getters.set(prop, fn));
    each(prox.methods, (fn, prop) => clone.methods.set(prop, fn));
    each(prox.data, (val, prop) => clone.methods.set(prop, val));
    each(prox.childNodes, n => clone.append(n = domMethods.clone(n.pure, n)));
    return clone;
  },
  css:(node, prox, styles, prop) => (isObj(styles) ? each(styles, (p, key) => node.style[key] = p) : isEq(isStr,styles,prop) ? node.style[styles] = prop : terr('"" or {} only)'), prox),
  attrToggle:(node, prox, name, state = !node.hasAttribute(name)) => (node[state ? 'setAttribute' : 'removeAttribute'](name,''), prox),
  inner(node, prox, ...args) {
    prox.html = '';
    each(flatten(args), val => {
        if(val.appendTo) {
          !prox.children.includes(val) && val.$emit('mount', val);
          val.appendTo(node);
        } else {
          if(isFunc(val)) val = val.call(prox, prox);
          prox.append(val);
        }
    });
    return prox;
  },
  setter:(node, prox, key, fn) => (isFunc(fn) && prox.setters.set(key, fn.bind(prox)), prox),
  getter:(node, prox, key, fn) => (isFunc(fn) && prox.getters.set(key, fn.bind(prox)), prox),
  append:(node, prox, ...args) => (node.appendChild(vpend(args)), prox),
  prepend:(node, prox, ...args) => (node.prepend(vpend(args)), prox),
  appendTo:(node, prox, val) => (autoQuery(val).appendChild(node), prox),
  prependTo:(node, prox, val) => (autoQuery(val).prepend(node), prox),
  remove:(node, prox, after) => (isNum(after) ? setTimeout(() => node.remove(), after) : node.remove(), prox),
  find:(node, prox, selector) => dom(query(selector, node))
},
render = (...args) => (node = 'body') => {
  if(isNode(node)) domMethods.append(node, NULL, args);
  if(isStr(node)) node == 'head' ? domMethods.append(doc.head, NULL, args) : run(() => isNode(node = dom(node == 'body' ? doc[node] : node)) ? node.append(args) : err('render: invalid target'));
},
plugins = extend(options => safeExtend(rilti, options), {
  method(key, method) {
    if(isFunc(method)) domMethods[key] = method;
  },
  handles:new Set
}),

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
    eventifier = state => new Proxy(EventManager(state, element), { get:(evtMngr, type) => evtMngr(type) }),
    autobind = v => isFunc(v) ? v.bind(element) : v,

    eventListeners = new Set,
    getters = new Map,
    setters = new Map,
    methods = new Map,
    data = notifier(new Map),
    isinput = data.set('isInput', isInput(element)).get('isInput'),
    inputHTML = isinput ? 'value' : 'innerHTML',
    textContent = isinput ? 'value' : 'textContent',

    elementProxy = new Proxy(element, {
      get(el, key) {
          isStr(key) && data.emit('get', key).emit('get:'+key);
          return key in domMethods ? domMethods[key].bind(el, el, elementProxy) :
          key == 'class' ? classes :
          key == 'attr' ? attr :
          key == 'pure' ? el :
          test(key, 'on','once') ? eventifier(key) :
          test(key, '$on','$once','$emit') ? data[key.slice(1)] :
          key == 'html' ? el[inputHTML] :
          key == 'txt' ? el[textContent] :
          key == 'eventListeners' ? eventListeners :
          key == 'getters' ? getters :
          key == 'setters' ? setters :
          key == 'methods' ? methods :
          key == 'data' ? data :
          getters.has(key) ? getters.get(key).call(elementProxy) :
          methods.has(key) ? methods.get(key).bind(elementProxy) :
          key == 'children' ? arrMeth('map', el.children, child => dom(child)) :
          key == 'childNodes' ? arrMeth('map', el.childNodes, child => dom(child)) :
          key == 'parent' ? dom(element.parentNode) :
          key in el ? autobind(Reflect.get(el, key)) :
          key == 'mounted' ? DOMcontains(element) :
          key == 'rect' ? el.getBoundingClientRect() :
          data.get(key);
      },
      set(el, key, val) {
        if(val != undef) {
          key == 'class' && isStr(val) ? classes(val, true) :
          test(key, 'html', 'txt') ? el[key == 'txt' ? textContent : inputHTML] = isFunc(val) ? val(elementProxy[key]) : val :
          key == 'render' && test(val, isNode, isStr) ? render(el)(val) :
          key == 'css' ? prox.css(val) :
          key == 'attr' ? attr(val) :
          setters.has(key) ? setters.get(key).call(elementProxy, val) :
          key in el ? Reflect.set(el, key, val) :
          isFunc(val) ? methods.set(key, val.bind(elementProxy)) :
          isPrimitive(val) && data.set(key, val);
          (isStr(val) && !test(key, 'txt', 'html', 'attr')) && data.emit('set', val).emit('set:'+key, val);
        }
        return true;
      },
      deleteProperty(el, key) {
        key == 'self' ? el.remove() :
        data.has(key) ? data.delete(key) :
        getters.has(key) ? getters.delete(key) :
        setters.has(key) ? setters.delete(key) :
        methods.has(key) ? methods.delete(key) : query(key, el).remove();
        return true;
      }
    });
    data.once('destroy', () => {
      element.isDestroyed = true;
      ProxyNodes.delete(element.pure);
    });
    ProxyNodes.set(element, elementProxy);
    return elementProxy;
  }
}, {
  get:(d, key) => key in d ? Reflect.get(d, key) : create.bind(NULL, key),
  set:(d,key) => Reflect.set(d,key)
}),

create = (tag, options, ...children) => {
  const el = dom(doc.createElement(tag));
  if(test(options, isArrlike, isNode)) children = test(options, isStr, isNode) ? [options, ...children] : options;
  else if(isObj(options)) {
    each(options, (val, key) => {
      if(key != 'render') {
        if(key == 'lifecycle') each(lifecycleStages, stage => isFunc(val[stage]) && el[stage == 'create' ? '$once' : '$on'](stage, val[stage].bind(el)));
        else if(key == 'attr') el.attr(val);
        else if(test(key,'class','className')) el.className = val;
        else if(test(key,'style','css')) el.css(val);
        else if(test(key,'on','once')) each(val, (handle, type) => el[key](type, handle));
        else if(test(key,'props','data') && isObj(val)) reseat(el,val);
        else if(isFunc(val) || (key in el)) el[key] = val;
        else if(isPrimitive(val)) el.attr(key, val);
      }
    });
    each(plugins.handles, handle => handle(options, el));
  }
  !isEmpty(children) && el.inner(...children);
  !(el.isComponent || el.mounted) && el.$emit('create', el);
  if(options && options.render) render(el)(options.render);
  return el;
},

mountORdestroy = (stack, type) => {
  if(stack.length > 0) for(let el of stack) if(isEl(el) && !el.isComponent && ProxyNodes.has(el)) dom(el).$emit(type, el);
},

txtBind = curry((prop, val, el) => {
  if(isPrimitive(val)) el.data[prop] = val;
  const txtNode = doc.createTextNode(el.data[prop]),
  changeHandle = el.$on('set:'+prop, val => txtNode.textContent = val);
  el.$once('destroy', changeHandle.off);
  el.$once('stop:'+prop, changeHandle.off);
  return txtNode;
}),

intervalManager = (interval, fn, destroySync, intervalID, mngr = ({
  stop:() => (clearInterval(intervalID), mngr),
  start() {
    intervalID = setInterval(fn, interval);
    isNode(destroySync) && mngr.destroySync(dom(destroySync));
    return mngr;
  },
  destroySync:el => el.$once('destroy', () => mngr.stop())
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
  if(attributeName && (attributeName != 'style' && ProxyNodes.has(target))) {
    checkAttr(attributeName, target = dom(target), oldValue);
    target.$emit('attr:'+attributeName,target,target.attr[attributeName],oldValue);
  }
})).observe(doc, {attributes:true, childList:true, subtree:true});

return {dom,notifier,observeAttr,unobserveAttr,plugins,intervalManager,extend,safeExtend,reseat,def,getdesc,route,render,run,curry,each,DOMcontains,flatten,isDef,isUndef,isPrimitive,isNull,isFunc,isStr,isBool,isNum,isInt,isObj,isArr,isArrlike,isEmpty,isEl,isEq,isNode,isNodeList,isInput,isMap,isSet}
})(window);
