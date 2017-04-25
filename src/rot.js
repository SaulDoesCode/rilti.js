/**
* rot.js alpha
* @licence MIT
* @repo SaulDoesCode/rot.js
* @author Saul van der Walt
**/
var rot = (() => {
"use strict";
const doc = document,
undef = void 0,
ArrProto = Array.prototype,
curry = (fn, arity = fn.length) => {
  const resolver = (...memory) => (...more) => {
    const local = memory.concat(more);
    return (local.length >= arity ? fn : resolver)(...local);
  }
  return resolver();
},
every = (arr, fn) => ArrProto.every.call(arr, fn),
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
isEmpty = val => val !== undef && !(isObj(val) ? Object.keys(val).length : isArrlike(val) ? val.length : val.size) || isFunc(val),
isNode = o => o && (o instanceof Node || o.pure instanceof Node),
isNodeList = nl => nl instanceof NodeList || (isArrlike(nl) && every(nl, isNode)),
isEl = typeinc('HTML'),
isInput = el => isEl(el) && 'INPUT TEXTAREA'.includes(el.tagName),
isMap = typeinc('Map'),
isSet = typeinc('Set'),
isEq = curry((o1,o2) => o1 === o2),
test = (match, ...cases) => cases.some(Case => match == Case || (isFunc(Case) && Case(match))),
each = (iterable, func) => {
  if (isDef(iterable) && isFunc(func)) {
    if(isArrlike(iterable)) iterable = Array.from(iterable);
    if(iterable.forEach) {
      iterable.forEach(func);
      return iterable;
    } else {
      let i = 0;
      if(isObj(iterable)) for (i in iterable) func(iterable[i], i, iterable);
      else if (isInt(iterable)) while (iterable != i) func(i += 1);
    }
  }
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
flatten = arr => isArrlike(arr) ? ArrProto.reduce.call(arr, (flat, toFlatten) => flat.concat(isArr(toFlatten) ? flatten(toFlatten) : toFlatten), []) : [arr],
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
//NativeEventTypes = "DOMContentLoaded hashchange blur focus focusin focusout load resize scroll unload click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave change select submit keydown keypress keyup error contextmenu pointerdown pointerup pointermove pointerover pointerout pointerenter pointerleave touchstart touchend touchmove touchcancel".split(" "),
//isNativeEvent = evt => NativeEventTypes.includes(evt),
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
  }

  const manager = {
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

evtsys = (handles = new Map, mngr) => mngr = {
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
    handles.has(type) && each(handles.get(type), handle => {
      handle(...args);
      if(handle.one) handle.off();
    });
  }
},
lifecycleStages = 'create mount destroy attr'.split(' ');

let LoadStack = new Set, ready = false, RouterActivate = false;
once(window, 'DOMContentLoaded', () => {
  ready = true;
  each(LoadStack, fn => fn()).clear();
  LoadStack = null;
});

const run = fn => ready ? fn() : LoadStack.add(fn),
render = (...args) => (node = 'body') => {
  if(isNode(node)) {
    node = dom(node);
    each(flatten(args), arg => test(arg, isSet, isArrlike) ? each(arg, a => node.append(a)) : node.append(arg));
  } else if(isStr(node)) run(() => {
      if(!isNode(
        node = dom(node == 'body' ? doc.body : node)
      )) err('render: invalid target');
      each(flatten(args), arg => test(arg, isSet, isArrlike) ? each(arg, a => node.append(a)) : node.append(arg));
  });
},
refl = Reflect,
ReflectSet = refl.set.bind(refl),
ReflectGet = refl.get.bind(refl),
newProxy = (val, handles) => new Proxy(val, handles),
htmlstr = html => doc.createRange().createContextualFragment(html || ''),
domfrag = inner => isPrimitive(inner) ? htmlstr(inner) : doc.createDocumentFragment(),
plugins = extend(options => safeExtend(rot, options), { methods:{}, handles:new Set }),

dom_methods = {
  replace:(node, prox, val) => node.replaceWith ? node.replaceWith(val) : node.parentNode.replaceChild(val, node),
  clone:n => dom(n.cloneNode()),
  css(node, prox, styles, prop) {
      isObj(styles) ? each(styles, (prop, key) => node.style[key] = prop) :
      isStr(styles) && isStr(prop) ? node.style[styles] = prop : terr('.css("" || {}) only');
      return prox;
  },
  inner(node, prox, ...args) {
    prox.html = '';
    each(flatten(args), val => {
        if(val.appendTo) {
          !prox.children.includes(val) && val.inf.emit('mount', val);
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
      each(args, arg => dfrag.appendChild(isNode(arg.pure) ? arg.pure : isNode(arg) ? arg : htmlstr(arg)));
      node.appendChild(dfrag);
      return prox;
  },
  prepend(node, prox, ...args) {
      const dfrag = domfrag();
      each(args, arg => dfrag.appendChild(isNode(arg.pure) ? arg.pure : isNode(arg) ? arg : htmlstr(arg)));
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
  find(node, prox, selector) {
    let child = query(selector, node);
    if(isNode(child)) return dom(child);
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

ProxiedNodes = new Map,

dom = newProxy(element => {
  if(isStr(element)) element = query(element);
  if(isEl(element)) {
    if(ProxiedNodes.has(element)) return ProxiedNodes.get(element);

    const attr = newProxy((attr, val) => {
      if(isObj(attr)) each(attr, (a, v) => element.setAttribute(a,v));
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
    });

    const classes = newProxy((c, state = !element.classList.contains(c)) => {
      state = state ? 'add' : 'remove';
      c.includes(' ') ? each(c.split(' '), cls => element.classList[state](cls)) :
      element.classList[state](c);
      return elementProxy;
    }, {
      get(_, key) {
        return element.classList.contains(key);
      },
      set(cls, key, val) {
        return cls(key, val);
      },
      deleteProperty(_, key) {
        return !element.classList.remove(key);
      }
    });

    const informer = evtsys(),
    listeners = new Set,

    ProxListener = fn => newProxy(fn.bind(element, element), {
      get(fn, key) {
        return fn(key);
      },
      set(fn, key, val) {
        if(isFunc(val)) return fn(key, val);
      }
    }), On = ProxListener(on), Once = ProxListener(once),
    dt = 'data:',
    data = {
      on:(mode, fn) => informer.on(dt+mode, fn),
      once:(mode, fn) => informer.once(dt+mode, fn),
      emit(mode, ...args) {
        informer.emit(dt+mode, ...args);
        return data;
      },
      isInput: isInput(element),
    },
    autobind = v => isFunc(v) ? v.bind(element) : v,
    getdata = key => {
      const val = autobind(ReflectGet(data, key));
      data.emit('get', val).emit('get:'+key, val);
      return val;
    },

    inputHTML = data.isInput ? 'value' : 'innerHTML',
    textContent = data.isInput ? 'value' : 'textContent',

    elementProxy = newProxy(element, {
      get(el, key) {
        return key in dom_methods ? dom_methods[key].bind(el, el, elementProxy) :
        key == 'children' ? ArrProto.map.call(el.children, child => dom(child)) :
        key in el ? autobind(ReflectGet(el, key)) :
        key == 'class' ? classes :
        key == 'attr' ? attr :
        key == 'pure' ? el :
        key == 'listeners' ? listeners :
        test(key, 'informer', 'inf') ? informer :
        key == 'on' ? On :
        key == 'once' ? Once :
        key == 'html' ? el[inputHTML] :
        key == 'txt' ? el[textContent] :
        key == 'mounted' ? DOMcontains(element) :
        key == 'rect' ? el.getBoundingClientRect() :
        key == "data" ? data :
        key in data ? getdata(key) :
        key in plugins.methods ? plugins.methods[key].bind(el, el, elementProxy) : undef;
      },
      set(el, key, val, prox) {
        if(val != undef) {
          key == 'class' && isStr(val) ? classes(val, true) :
          test(key, 'html', 'txt') ? el[key == 'txt' ? textContent : inputHTML] = isFunc(val) ? val(prox[key]) : val :
          key == 'render' && test(val, isNode, isStr) ? render(el)(val) :
          key in el ? ReflectSet(el, key, val) :
          key == 'css' && isObj(val) ? prox.css(val) :
          key == 'attr' && isObj(val) ? attr(val) :
          ReflectSet(data.emit('set', val).emit('set:'+key, val), key, val);
        }
        return true;
      },
      deleteProperty(el, key) {
        if(key == 'self') el.remove();
        else return refl.deleteProperty(data, key);
      }
    });
    informer.once('destroy', () => ProxiedNodes.delete(element));
    ProxiedNodes.set(element, elementProxy);
    return elementProxy;
  }
}, {
  get:(d, key) => key in d ? ReflectGet(d, key) : create.bind(undef, key),
  set:(d,key) => ReflectSet(d,key)
}),

create = (tag, options, ...children) => {
  const el = dom(doc.createElement(tag));
  if(test(options, isArrlike, isNode)) {
    children = test(options, isStr, isNode) ? [options] : options;
    options = null;
  } else if(isObj(options)) {

    for(let handle of plugins.handles) handle(options, el);

    each(options, (val, key) => {
      if(key != 'render') {
        if(key == 'lifecycle') each(lifecycleStages, stage => {
          if(isFunc(val[stage])) el.inf.once(stage, (...args) => val[stage].apply(el, args));
        });
        else if(key == 'attr') el.attr = val;
        else if(test(key,'class','className')) el.className = val;
        else if(test(key,'style','css')) el.css(val);
        else if(test(key,'on', 'once')) each(val, (handle, type) => el[key][type] = handle);
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
  !(el.tagName.includes('-') || el.mounted) && el.inf.emit('create', el);
  if(options && options.render) el.render = options.render;
  return el;
},

router = evtsys(),
route = (hash, fn) => {
  if(!RouterActivate) {
      RouterActivate = true;
      on(window, 'hashchange', () => router.emit(router.has(location.hash) ? location.hash : 'default', location.hash));
  }
  if(isFunc(hash)) {
    fn = hash;
    hash = 'default';
  }
  if(location.hash === hash) fn();
  return router.on(hash, fn);
},
mountORdestroy = (stack, type) => {
  if (stack.length > 0)
    for(let el of stack)
      if(isEl(el) && !el.tagName.includes('-')) (el = dom(el)).inf.emit(type , el);
}

(dom.extend = extend(dom))({query,queryAll,queryEach,on,once,htmlstr});

new MutationObserver(muts => {
  for(let mut of muts) {
    let {removedNodes, addedNodes, target, attributeName} = mut;
    mountORdestroy(addedNodes, 'mount');
    mountORdestroy(removedNodes, 'destroy');
    if(attributeName != 'style' && isEl(target))
        (target = dom(target)).inf.emit('attr:'+attributeName, target.attr[attributeName], mut.oldValue, target.attr.has(attributeName), target);
  }
}).observe(doc, {attributes:true, childList:true, subtree:true});

return {
  dom,
  evtsys,
  plugins,
  extend,
  safeExtend,
  def,
  getdesc,
  route,
  render,
  run,
  curry,
  each,
  DOMcontains,
  flatten,
  isDef,
  isUndef,
  isPrimitive,
  //isNativeEvent,
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
}
})();
