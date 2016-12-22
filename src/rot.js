(function (name, context, definition) {
  if (typeof module != 'undefined' && module.exports) module.exports = definition();
  else if (typeof define == 'function' && define.amd) define(name, definition);
  else context[name] = definition();
})('rot', this, function () {

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
  includes = curry((host,containee) => host.includes(containee)),
  Keys = Object.keys,
  every = (arr, fn) => Array.prototype.every.call(arr, fn),
  typestr = toString.call,
  type = (obj, str) => typestr(obj) === str,
  typeinc = str => obj => toString.call(obj).includes(str),
  isDef = o => o !== undefined,
  isUndef = o => o === undefined,
  isNull = o => o === null,
  isFunc = o => typeof o === 'function',
  isStr = o => typeof o === 'string',
  isBool = o => typeof o === 'boolean',
  isNum = o => !isBool(o) && !isNaN(Number(o)),
  isPrimitive = s => typeof s === 'string' || typeof s === 'number',
  isInt = val => isNum(val) && val % 1 === 0,
  isObj = typeinc('Object'),
  isArr = Array.isArray,
  isArrlike = o => o !== undefined && typeof o.length !== 'undefined',
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
  get = (obj, path) => new Promise((pass,fail) => {
        path.replace(/\[(\w+)\]/g, '.$1').replace(/^\./, '').split(".").map(step => {
            step in obj ? obj = obj[step] : obj = undefined;
        });
        isDef(obj) ? pass(obj) : fail();
  }),
  set = (obj, path, val) => new Promise((pass,fail) => {
      path = path.split(".");
      const last = path.length - 1;
      path.map((step, i) => {
          if (obj[step] == undefined) obj[step] = {};
          last == i ? obj[step] = val : obj = obj[step];
      });
      pass();
  }),
  each = (iterable, func) => {
      if (isFunc(func)) {
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
  omitProps = (obj, props) => {
    const temp = {};
    each(Keys(obj), key => {
      if(!props.includes(key)) def(temp, key, getdesc(obj, key));
    });
    return temp;
  },
  flatten = arr => Array.prototype.reduce.call(arr, (flat, toFlatten) => flat.concat(isArr(toFlatten) ? flatten(toFlatten) : toFlatten), []);

  const rename = (obj, keys, newkeys) => {
    each(keys, (key,i) => {
      def(obj, newkeys[i], getdesc(obj,key));
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
        if(isNode(element)) return Array.from(element.querySelectorAll(selector));
      } catch(e) {}
      return false;
  }

  const queryEach = (selector, element, func) => {
      if (isFunc(element)) {
          func = element;
          element = null;
      }
      const list = queryAll(selector, element);
      if (isArrlike(list)) each(list, func);
      return list;
  }

  const DOMcontains = (descendant, parent = doc) => parent == descendant || Boolean(parent.compareDocumentPosition(descendant) & 16);
  const arraysEqual = (a, b) => a == null || b == null ? false : a === b || a.length == b.length && every(a, (v,i) => v == b[i]);

  let NativeEventTypes = "DOMContentLoaded blur focus focusin focusout load resize scroll unload click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave change select submit keydown keypress keyup error contextmenu pointerdown pointerup pointermove pointerover pointerout pointerenter pointerleave touchstart touchend touchmove touchcancel";
  const isNativeEvent = evt => NativeEventTypes.includes(evt);

  const EventManager = curry((target, type, handle, options = false) => {
    if(isStr(target)) target = query(target);
    if(!target || !target.addEventListener) throw new Error('EventManager: Target Invalid');
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
          target.removeEventListener(type, handle);
          active = false;
          return this;
      },
      once() {
          this.off().active = true;
          target.addEventListener(type, function hn() {
              handle.apply(this, arguments);
              target.removeEventListener(event, hn);
          }, options);
          return this;
      }
    }
  }, 3);

  class informer {
    constructor() {
      this.handles = new Set();
      this.isInformer = true;
    }
    handle(once, handle) {
        if(isFunc(once)) {
          handle = once;
          once = false;
        }
        if(!isFunc(handle)) throw new TypeError('informer.handle : ought to be a function');
        const handles = this.handles;

        const activate = state => {
          handle._once = !!state;
          handles.add(handle);
          return handle;
        }

        handle.off = () => {
          handles.delete(handle);
          return handle;
        }
        handle.on = activate;
        handle.once = activate.bind(null, true);

        return activate(once);
    }
    has(v) {
      return this.handles.has(v);
    }
    on(handle) {
      return this.handle(handle);
    }
    once(handle) {
      return this.handle(true, handle);
    }
    off(handle) {
      this.handles.delete(handle);
    }
    get empty() {
      return this.handles.size == 0;
    }
    get size() {
      return this.handles.size;
    }
    inform(...args) {
      if(!arraysEqual(this.lastInform, args)) {
        this.lastInform = args;
        if (this.handles.size != 0) this.handles.forEach(hndl => {
          hndl(...args);
          if(hndl._once) hndl.off();
        });
      }
    }
    forceInform(...args) {
      this.lastInform = args;
      this.handles.forEach(hndl => {
        hndl(...args);
        if(hndl._once) hndl.off();
      });
    }
    static fromEvent(target, eventtype, once = false, options) {
        if(isStr(target) && isNativeEvent(target)) {
          options = once;
          once = eventtype;
          eventtype = target;
          target = root;
        } else target = query(target);
        if (!target.addEventListener) throw new Error("informer.fromEvent: target.addEventListener not found");
        if (arguments.length == 1) return informer.fromEvent.bind(null, target);
        if (!isStr(eventtype)) throw new TypeError("informer.fromEvent: eventtype isn't a string");
        if (!isBool(once)) {
            options = once;
            once = false;
        }
        let inf = new informer();
        const evtListener = EventManager(target, eventtype, e => {
          inf.inform(e,evtListener);
          if(once) inf = null;
        }, options)[once ? 'once' : 'on']();
        return inf;
    }
    static propHook(obj,key,hook) {
      const inf = new informer();
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
  }

const run = fn => doc.readyState != 'complete' ? informer.fromEvent('DOMContentLoaded', true).once(fn) : fn();
const plugins = {
 methods:{},
 handles:new Set()
};
def(plugins,'extend', {
  value:extend(plugins.methods),
  enumerable:false
});

const dffstr = html => doc.createRange().createContextualFragment(html || '');
const domfrag = inner => {
    if(isStr(inner)) return dffstr(inner);
    const dfrag = doc.createDocumentFragment();
    dfrag.appendChild(inner);
    return dfrag;
}

const Inner = (node, type) => {
    if(isNode(node.node)) node = node.node;
    type = isInput(node) ? 'value' : type;
    return function() {
        if (!arguments.length) return node[type];
        if (node[type] && node[type].length) node[type] = '';
        each(arguments, function handleArg(val) {
            if(isStr(val)) node[type] += val;
            else if(isArr(val)) each(val, handleArg);
            else if(isDef(val)) {
              if(val.appendTo) val.appendTo(node);
              else if(isNode(val)) node.appendChild(val);
              else if(isObj(val) && val.isInformer) val.on(Inner(node, type));
            }
        });
        return this;
    };
}

const on = curry((target, type, handle, options) => EventManager(target, type, handle, options).on(), 3);
const once = curry((target, type, handle, options) => EventManager(target, type, handle, options).once(), 3);

const domMethods = node => ({
  node,
  hasAttr:node.hasAttribute.bind(node),
  getAttr:node.getAttribute.bind(node),
  setAttr(attr, val) {
      const sa = node.setAttribute.bind(node);
      if (isUndef(val)) {
          if (isObj(attr)) each(attr, (v, a) => sa(a, v));
          else if (isStr(attr)) attr.includes('=') || attr.includes('&') ? each(attr.split('&'), Attr => {
              const eqsplit = Attr.split('=');
              sa(eqsplit[0], isDef(eqsplit[1]) ? eqsplit[1] : '');
          }) : sa(attr, '');
      } else sa(attr, '');
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
      else throw new TypeError('CSS : Styles is not an object or string pair');
      return this;
  },
  html: Inner(node, 'innerHTML'),
  Text: Inner(node, 'textContent'),
  on:(type, handle, options) => EventManager(node, type, handle, options).on(),
  once:(type, handle, options) => EventManager(node, type, handle, options).once(),
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
  get mounted() { return DOMcontains(node) },
  lifecycle:{},
  attrupdate : new informer(),
  observeAttr(name, handle, once = false) {
    return this.attrupdate[once ? 'once' : 'on']((attrname, ...details) => name === attrname && handle(attrname, ...details));
  }
});

const lifecycleStages = ['create', 'mount', 'destroy', 'update'];

function actualize(options, el) {
  if(!isNode(el)) el = isStr(el) ? query(el) : doc.createElement(options.tag);
  const dm = domMethods(el);
  el.dm = dm;
  if(options.class) el.className = options.class;
  if(options.inner) dm.html(options.inner);
  else if(options.text) dm.Text(options.text);
  if(options.style) dm.css(options.style);
  if(options.attr) dm.setAttr(options.attr);
  if(options.events) each(options.events, (val, key) => {
    if(isFunc(val)) options.events[key] = on(el, key, val);
    else if(isArr(val)) options.events[key] = on(el, key, ...val);
    else if(isObj(val)) {
      const {handle, options} = val;
      on(el, key, handle, options);
    }
  })
  dm.extend = extend(dm);
  each(lifecycleStages, stage => {
      dm.lifecycle[stage] = new informer();
      if(isObj(options.lifecycle) && isFunc(options.lifecycle[stage])) options.lifecycle[stage] = dm.lifecycle[stage][stage === 'update' ? 'on' : 'once'](options.lifecycle[stage]);
  });
  if(isObj(options.props)) extend(dm, options.props);
  if(plugins.methods) extend(dm, plugins.methods);
  if(plugins.handles) each(plugins.handles, handle => handle(options, dm, el));
  dm.lifecycle[dm.mounted ? 'mount' : 'create'].inform(dm, el);
  return dm;
}

const dom = curry((tag, data) => {
  if(!isStr(tag)) throw new TypeError('invalid element instantiation parameters');
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
        //if (el.attributes) each(el.attributes, attr => {
            //if (Directives.has(attr.name)) manageAttr(el, attr.name, attr.value, '', true);
        //});
    });
    if (mut.type == 'attributes' && mut.attributeName != 'style' && mut.target.dm) {
      const dm = mut.target.dm;
      const name = mut.attributeName;
      dm.attrupdate.inform(name, dm.getAttr(name), mut.oldValue, dm.hasAttr(name), dm);
    }
})).observe(doc, {
    attributes: true,
    childList: true,
    subtree: true
});

extend(dom,{
  extend,
  query,queryAll,queryEach,
  on,once
});

each(
  'picture img input list a script table td th tr article aside ul ol li h1 h2 h3 h4 h5 h6 div span pre code section button br label header i style nav menu main menuitem'.split(' '),
  tag => dom[tag] = dom(tag)
);

  return {
    informer,
    EventManager,
    isNativeEvent,
    dom,
    plugins,
    extend,
    safeExtend,
    def,
    getdesc,
    get,
    set,
    rename,
    run,
    curry,
    each,
    query,queryAll,queryEach,
    DOMcontains,
    arraysEqual,
    flatten,
    isDef,
    isUndef,
    isPrimitive,
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
