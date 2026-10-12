/*
* rilti a framework for all and none
* @author Saul van der Walt
* @license MIT
*/
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.rilti = {}));
})(this, (function (exports) { 'use strict';

  /* global Node NodeList Element SVGElement HTMLInputElement HTMLTextAreaElement */
  const ProxyNodeSymbol = Symbol('Proxy Node');

  const isProxyNode = o => isFunc(o) && o[ProxyNodeSymbol] === true;

  const isComponent$1 = el => el != null && el.tagName != null && el.tagName.includes('-');

  const isArr = Array.isArray;

  const isNil = o => o == null;

  const isDef = o => o != null;

  const isFunc = o => o instanceof Function;

  const isBool = o => typeof o === 'boolean';

  const isObj = o => o != null && o.constructor === Object;

  const isStr = o => typeof o === 'string';

  const isNum = o => typeof o === 'number' && !isNaN(o);

  const isInt = o => isNum(o) && o % 1 === 0;

  const isArrlike = o => o != null && (isArr(o) || (
    !(o instanceof Function || o instanceof Node) &&
    o.length % 1 === 0
  ));

  const isNode = o => o instanceof Node;

  const isNodeList = (o, arr = true) => o instanceof NodeList || (arr && allare(o, isNode));

  const isPrimitive = o => {
    o = typeof o;
    return o === 'string' || o === 'number' || o === 'boolean'
  };

  const isEl = o => o instanceof Element;

  const isPromise = o => o != null && typeof o === 'object' && isFunc(o.then);

  const isRegExp = o => o instanceof RegExp;

  const isEmpty = o => isNil(o) || !((isObj(o) ? Object.keys(o) : o).length || o.size);

  const isMounted = (child, parent = document) => {
    if (isProxyNode(child)) child = child();
    if (isNodeList(child)) return Array.from(child).every(n => isMounted(n, parent))
    if (!(child instanceof Node)) return false
    return parent === child || (parent === document
      ? child.isConnected
      : parent.contains(child))
  };

  const isSvg = o => {
    if (isProxyNode(o)) o = o();
    return o instanceof SVGElement
  };

  const isInput = (o, contentEditable) => {
    if (isProxyNode(o)) o = o();
    return o instanceof HTMLInputElement || o instanceof HTMLTextAreaElement || (
      !!contentEditable &&
      o instanceof Element &&
      o.getAttribute('contenteditable') === 'true'
    )
  };

  const isRenderable = o => o instanceof Node ||
    isProxyNode(o) || isPrimitive(o) || allare(o, isRenderable);

  /*
  * allare checks whether all items in an array are like a given param
  * it's similar to array.includes but allows functions
  */
  const allare = (arr, like) => {
    if (isArrlike(arr)) {
      const isfn = like instanceof Function;
      for (let i = 0; i < arr.length; i++) {
        if (!(isfn ? like(arr[i]) : arr[i] === like)) {
          return false
        }
      }
      return true
    }
    return false
  };

  /*
  * compose a typical function composition functions
  * @ example compose(x => x + 1, x => x + 1)(1) === 3
  */
  const compose = (...fns) => fns.reduce((a, b) => (...args) => a(b(...args)));

  /*
  * curry a function
  * and optionally
  * set the arity or pre bound arguments
  */
  const curry = (fn, arity = fn.length, ...args) => arity <= args.length
    ? fn(...args)
    : curry.bind(null, fn, arity, ...args);

  const assign = Object.assign;

  /*
  * flatten recursively spreads out nested arrays
  * to make the entire array one dimentional
  * @example flatten([1, [2, [3]], 4, [5]]) -> [1, 2, 3, 4, 5]
  * @example flatten(x) -> [x]
  */
  const flatten = (arr, result = [], encaptulate = true) => {
    if (encaptulate && !isArr(arr)) return [arr]
    for (let i = 0; i < arr.length; i++) {
      isArr(arr[i]) ? flatten(arr[i], result) : result.push(arr[i]);
    }
    return result
  };

  /*
  * runAsync runs a function when the browser is idle
  * (falls back to a macrotask where requestIdleCallback is unsupported)
  */
  const runAsync = (fn, ...args) => typeof requestIdleCallback === 'function'
    ? requestIdleCallback(() => fn(...args))
    : setTimeout(fn, 0, ...args);

  /*
  * soon runs a function in a microtask, i.e. before the next paint
  */
  const soon = (fn, ...args) => queueMicrotask(() => fn(...args));

  /*
  * run runs a function on DOMContentLoaded,
  * or in a microtask if document.body is already present
  */
  const run = (fn, ...args) => {
    if (document.body || document.readyState !== 'loading') {
      soon(fn, ...args);
    } else {
      window.addEventListener('DOMContentLoaded', () => fn(...args), { once: true });
    }
  };

  /*
  *
  * DOM Query Selector Functions
  *
  */
  const query = (selector, host = document) => {
    if (isProxyNode(selector)) return selector()
    if (isNode(selector)) return selector
    host = query(host);
    return host == null ? null : host.querySelector(selector)
  };

  const queryAsync = (selector, host) => new Promise((resolve, reject) => {
    const find = () => {
      const result = query(selector, host);
      if (result == null) {
        reject(new Error("queryAsync: couldn't find " + selector));
      } else {
        resolve(result);
      }
    };
    document.body ? find() : run(find);
  });

  /*
  *  queryAll(selector String|Node, host = document String|Node)
  *  it returns an array of elements matching a selector,
  *  a nicer querySelectorAll essentially.
  */
  const queryAll = (selector, host = document) => {
    host = query(host);
    return host == null ? [] : Array.from(host.querySelectorAll(selector))
  };

  const queryEach = (selector, fn, host = document) => {
    if (!isFunc(fn)) [fn, host] = [host, document];
    return each(queryAll(selector, host), fn)
  };

  /*
  * each iterates over arrays, objects, integers,
  * and anything implementing .forEach
  */
  const each = (iterable, fn) => {
    if (iterable != null) {
      if (isObj(iterable)) {
        for (const key in iterable) {
          fn(iterable[key], key, iterable);
        }
      } else if (isArrlike(iterable)) {
        const len = iterable.length;
        let i = 0;
        while (i !== len) fn(iterable[i], i++, iterable);
      } else if (iterable.forEach) {
        iterable.forEach(fn);
      } else if (isInt(iterable)) {
        let i = 0;
        while (i < iterable) fn(i++, iterable);
      }
    }
    return iterable
  };

  /*
  * infinify takes a function that has a string (like an event type or key)
  * and returns a proxy which binds the key of any get operation
  * as that initial string argument enabling a very natural feeling API
  * @scope infinify(func) -> Proxy<func>
  * @example const emit = infinify(emitFN); emit.anyEvent(details)
  */
  const infinify = (fn, reflect) => new Proxy(fn, {
    get: reflect === true
      ? (fn, key) => key in fn ? Reflect.get(fn, key) : fn.bind(null, key)
      : (fn, key) => fn.bind(null, key)
  });

  /*
  * mutateSet is an abstraction over Set and WeakSet
  * it combines all basic Set ops into a single function
  */
  const mutateSet = set => (n, state) =>
    set[state == null ? 'has' : state ? 'add' : 'delete'](n);

  const unsafeKeys = new Set(['__proto__', 'constructor', 'prototype']);

  const copyprop = (host, obj, key) => {
    Object.defineProperty(host, key, Object.getOwnPropertyDescriptor(obj, key));
    return host
  };

  /*
  * merge(host Object|Array, target Object|Array)
  * merge objects together deeply.
  * it copies prop descriptions instead of raw values.
  */
  const merge = (host, target) => {
    if (isArr(host) && isArr(target)) {
      for (const val of target) if (!host.includes(val)) host.push(val);
    } else if (merge.able(host) && merge.able(target)) {
      for (const key of Object.keys(target)) {
        // refuse keys that could pollute prototypes
        if (unsafeKeys.has(key)) continue
        if (Object.prototype.hasOwnProperty.call(host, key)) {
          const old = host[key];
          const val = target[key];
          if (merge.able(old) && merge.able(val)) {
            merge(old, val);
          } else if (val != null) {
            copyprop(host, target, key);
          }
        } else {
          copyprop(host, target, key);
        }
      }
    }
    return host
  };

  merge.able = o => isArr(o) ||
    (o != null && typeof o === 'object' && !isFunc(o.then));

  const emitter = (host = Object.create(null), listeners = new Map()) => Object.assign(host, {
    emit: infinify((event, ...data) => soon(() => {
      if (listeners.has(event)) {
        for (const h of [...listeners.get(event)]) h(...data);
      }
    })),
    on: infinify((event, handler) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(handler);
      const manager = () => host.off(event, handler);
      manager.off = manager;
      manager.on = () => {
        manager();
        return host.on(event, handler)
      };
      manager.once = () => {
        manager();
        return host.once(event, handler)
      };
      return manager
    }),
    once: infinify((event, handler) => host.on(event, function h (...args) {
      host.off(event, h);
      handler(...args);
    })),
    off: infinify((event, handler) => {
      if (listeners.has(event)) {
        const ls = listeners.get(event);
        ls.delete(handler);
        if (!ls.size) listeners.delete(event);
      }
    })
  });

  /* global Node NodeList */

  // attach on/off helpers to a collection of listener handles
  // without clobbering the handles themselves
  const manage = (result, handles) => Object.defineProperties(result, {
    off: {
      configurable: true,
      value: () => {
        for (const h of handles) h();
        return result
      }
    },
    on: {
      configurable: true,
      value: mode => {
        for (const h of handles) h.on(mode);
        return result
      }
    }
  });

  const listen = function (once, target, type, fn, options = false) {
    if (isStr(target)) target = queryAll(target);
    if (target instanceof NodeList) target = Array.from(target);
    if (isArr(target) && target.length === 1) target = target[0];

    if (isArr(target) ? !target.length : !target.addEventListener) {
      throw new Error('nil/empty event target(s)')
    }

    const typeobj = isObj(type);
    if (type == null || !(typeobj || isStr(type))) {
      throw new TypeError('cannot listen to nil or invalid event type')
    }

    if (isArr(target)) {
      const handles = target.map(t => listen(once, t, type, fn, options));
      return manage(handles, handles)
    }

    if (typeobj) {
      // never mutate the caller's object, it is often shared (component configs)
      const handles = {};
      for (const name of Object.keys(type)) {
        handles[name] = listen(once, target, name, type[name], options);
      }
      return manage(handles, Object.values(handles))
    }

    if (target instanceof Node && !(options && options.proxy)) target = $(target);

    let wrapper;
    if (typeof fn === 'string' && options instanceof Function) {
      // delegation: on.click(host, '.selector', handler, options)
      const matcher = fn;
      fn = options;
      options = arguments[5];
      if (options == null) options = false;
      wrapper = function (event) {
        const t = event.target;
        const match = t != null && t !== this && t.closest instanceof Function
          ? t.closest(matcher)
          : null;
        if (match != null && match !== this && (!this.contains || this.contains(match))) {
          if (off.once) off();
          fn.call(this, event, target, match);
        }
      };
    } else {
      wrapper = function (event) {
        if (off.once) off();
        fn.call(this, event, target);
      };
    }

    const on = mode => {
      if (mode != null && mode !== off.once) off.once = !!mode;
      target.addEventListener(type, wrapper, options);
      off.ison = true;
      return off
    };

    const off = assign(() => {
      target.removeEventListener(type, wrapper, options);
      off.ison = false;
      return off
    }, { target, on, once });
    off.off = off;

    return on()
  };

  const infinifyListen = {
    get: (ln, type) => (tgt, fn, opts) => ln(tgt, type, fn, opts)
  };

  const on = new Proxy(listen.bind(null, false), infinifyListen);
  const once = new Proxy(listen.bind(null, true), infinifyListen);
  const EventManager = curry(listen, 3);

  /* global Node Text */

  const html = (input, host) => {
    if (input instanceof Function) input = input(host);
    if (isNum(input)) input = String(input);
    if (typeof input === 'string') {
      return Array.from(
        document.createRange().createContextualFragment(input).childNodes
      )
    } else if (input instanceof Node) {
      return input
    } else if (isArr(input)) {
      return input.map(i => html(i, host))
    }
    throw new Error('.html: unrenderable input')
  };

  const h = (strs, ...args) => {
    let result = '';
    for (let i = 0; i < args.length; i++) result += strs[i] + args[i];
    result += strs[strs.length - 1];

    const template = document.createElement('template');
    template.innerHTML = result;
    const { content } = template;

    content.collect = ({ attr = 'ref', keep, assign = {}, proxy = true } = {}) => {
      Array.from(content.querySelectorAll('[' + attr + ']')).reduce((a, el) => {
        const ref = el.getAttribute(attr).trim();
        if (!keep) el.removeAttribute(attr);
        a[ref] = proxy ? $(el) : el;
        return a
      }, assign);
      return assign
    };

    return content
  };

  const frag = inner => {
    const fragment = document.createDocumentFragment();
    if (inner != null) {
      const nodes = html(inner);
      isArr(nodes) ? fragment.append(...nodes.flat(Infinity)) : fragment.append(nodes);
    }
    return fragment
  };

  const assimilate = Object.assign(
    (el, { props, methods }, noProps) => {
      if (!noProps && props) assimilate.props(el, props);
      if (methods) assimilate.methods(el, methods);
    },
    {
      props (el, props) {
        const proxied = $(el);
        for (const prop in props) {
          const val = props[prop];
          if (prop in el) {
            el[prop] = val;
          } else if (prop === 'accessors') {
            for (const key in val) {
              const { set = val[key], get = val[key] } = val[key];
              const accessors = {};
              if (set instanceof Function) {
                accessors.set = set.bind(el, proxied);
              }
              if (get instanceof Function) {
                accessors.get = get.bind(el, proxied);
              }
              Object.defineProperty(el, key, accessors);
            }
          } else if (val instanceof Function && !isProxyNode(val)) {
            el[prop] = val.call(el, proxied);
          } else {
            copyprop(el, props, prop);
          }
        }
      },
      methods (el, methods) {
        const proxied = $(el);
        for (const name in methods) {
          Object.defineProperty(el, name, { value: methods[name].bind(el, proxied) });
        }
      }
    }
  );

  // fooBar -> foo-bar
  const tagify = str => str.replace(/[A-Z]/g, c => '-' + c.toLowerCase()).replace(/^-/, '');

  const toClasses = str => str.replace(/_/g, '-').split('.').filter(Boolean);

  // dom.div.card.big(...) -> <div class="card big">
  // each step returns a fresh generator so stored chains are never mutated
  const classChain = (fn, classes) => new Proxy(function () {
    const el = fn.apply(null, arguments);
    if (classes.length) (isProxyNode(el) ? el() : el).classList.add(...classes);
    return el
  }, {
    get: (target, cls) => typeof cls === 'symbol' || cls === 'then'
      ? Reflect.get(target, cls)
      : classChain(fn, [...classes, ...toClasses(cls)])
  });

  const infinifyDOM = (gen, tag) => {
    if (typeof tag === 'symbol') return Reflect.get(gen, tag)
    if (Object.prototype.hasOwnProperty.call(gen, tag)) return gen[tag]
    if (tag === 'then') return undefined
    const make = gen.bind(null, tagify(tag));
    return (gen[tag] = new Proxy(make, {
      get: (fn, cls) => typeof cls === 'symbol' || cls === 'then'
        ? Reflect.get(fn, cls)
        : classChain(fn, toClasses(cls))
    }))
  };

  const body = (...args) =>
    attach(document.body || 'body', 'appendChild', ...args);

  const text = (options, txt = '') => isPrimitive(options)
    ? dom(new Text(options))
    : dom(new Text(txt), options);

  const reserved = ['$', 'id', 'render', 'children', 'html', 'class', 'className'];
  const ns = 'http://www.w3.org/2000/svg';
  const svgEL = (tag, ops, ...children) => {
    const el = document.createElementNS(ns, tag);
    if (isObj(ops)) {
      for (const key in ops) {
        if (isPrimitive(ops[key]) && !reserved.includes(key) && !(key in domfn)) {
          el.setAttribute(key, ops[key]);
          delete ops[key];
        }
      }
    }
    return dom(el, ops, ...children)
  };
  const svg = new Proxy(svgEL.bind(null, 'svg'), {
    get: (_, tag) => infinifyDOM(svgEL, tag)
  });

  const dom = new Proxy(Object.assign((tag, ops, ...children) => {
    let pure = false;
    if (typeof tag === 'string' && tag[0] === '$') {
      tag = tag.slice(1);
      pure = true;
    }
    const el = typeof tag === 'string' ? document.createElement(tag) : tag;

    const iscomponent = components.has(el.tagName);
    let componentHandled = false;

    let proxied;
    if (!isObj(ops)) {
      if (!pure) proxied = $(el);
    } else {
      const { cycle, bind } = ops;
      if (ops.pure) pure = true;
      if (!pure) proxied = $(el);

      assimilate(el, ops, iscomponent);

      let val;
      // snapshot keys: event handles get written back onto ops below
      for (const key of Object.keys(ops)) {
        if ((val = ops[key]) == null) continue

        if (key[0] === 'o' && key[1] === 'n') {
          const isOnce = key[2] === 'c' && key[3] === 'e';
          const i = isOnce ? 4 : 2;
          const mode = key.slice(0, i);
          const type = key.slice(i);
          const evtfn = EventManager(isOnce);
          const args = isArr(val) ? val : [val];
          if (type.length) {
            if (!isObj(ops[mode])) ops[mode] = {};
            ops[mode][type] = evtfn(el, type, ...args);
          } else {
            ops[mode] = evtfn(el, ...args);
          }
        } else if (key in el) {
          if (el[key] instanceof Function) {
            isArr(val) ? el[key].apply(el, val) : el[key](val);
          } else {
            el[key] = ops[key];
          }
        } else if (key in domfn) {
          val = isArr(val) ? domfn[key](el, ...val) : domfn[key](el, val);
          if (val !== el) ops[key] = val;
        }
      }

      if (bind) {
        const isinput = isInput(el);
        for (const key in bind) {
          if (key in el) throw new Error('databind overwrites property')
          bind[key].host = proxied || el;
          bind[key].isinput = isinput;
          const b = databind(bind[key]);
          Object.defineProperty(bind, key, {
            get () { return b.val },
            set: b.change
          });
          Object.defineProperty(bind, '$' + key, {
            value: b
          });
        }
        el.bind = bind;
      }

      if (iscomponent) {
        updateComponent(el, null, null, ops.props);
        componentHandled = true;
      }

      if (cycle) {
        const { mount, create, remount, unmount } = cycle;
        if (create) once.create(el, create.bind(el, proxied || el));
        if (mount) once.mount(el, mount.bind(el, proxied || el));
        if (unmount) cycle.unmount = on.unmount(el, unmount.bind(el, proxied || el));
        if (remount) cycle.remount = on.remount(el, remount.bind(el, proxied || el));
      }

      const host = ops.$ || ops.render;
      if (host) attach(host, 'appendChild', el);
      else if (ops.renderAfter) attach(ops.renderAfter, 'after', el);
      else if (ops.renderBefore) attach(ops.renderBefore, 'before', el);
    }

    if (el.nodeType !== 3 /* el != Text */) {
      if (isProxyNode(ops)) {
        if (ops !== proxied) children.unshift(ops);
      } else if (ops instanceof Function) {
        const result = ops.call(el, proxied || el);
        if (result !== el && result !== proxied && (isRenderable(result) || isPromise(result))) {
          children.unshift(result);
        }
      } else if (isArr(ops) || isRenderable(ops) || isPromise(ops)) {
        children.unshift(ops);
      }

      if (children.length) attach(proxied || el, 'appendChild', children);
    }

    iscomponent
      ? !componentHandled && updateComponent(el)
      : CR(el, true, iscomponent);

    return proxied || el
  }, { text, body, svg, frag, html }), { get: infinifyDOM });

  /* global Text Node NodeList HTMLCollection CustomEvent Comment getComputedStyle */

  const emit = (node, type, detail) => {
    node.dispatchEvent(typeof type !== 'string' ? type : new CustomEvent(type, { detail }));
    return node
  };

  // vpend - virtual append, add nodes and append them as a document fragment
  const vpend = (
    children,
    host,
    connector = 'appendChild',
    dfrag = frag(),
    noHostAppend
  ) => {
    const hostNode = isProxyNode(host) ? host() : host;
    const added = [];
    const add = child => {
      // deglove renderables hidden in (nested) functions
      let depth = 0;
      while (child instanceof Function && depth++ < 25) {
        const next = depth === 1 ? child(host) : child();
        if (next === child) break
        child = next;
      }
      if (child == null || child instanceof Function) return
      if (child === host || child === hostNode) return
      if (child instanceof Node) {
        dfrag.appendChild(child);
        added.push(child);
      } else {
        for (const c of prime(child)) add(c);
      }
    };
    for (let i = 0; i < children.length; i++) add(children[i]);

    if (hostNode && true) {
      run(() => {
        hostNode[connector](dfrag);
        for (const child of added) {
          if (child.isConnected) MountNodes(child);
        }
      });
    }
    return added
  };

  // a placeholder that is swapped for whatever the promise resolves to
  const pending = promise => {
    const marker = new Comment('rilti:pending');
    Promise.resolve(promise).then(result => {
      vpend(prime(result), marker, 'replaceWith');
    });
    return marker
  };

  /*
  * prime takes an array of renderable entities
  * and turns them into just nodes and functions
  * (to be degloved later rather than sooner [by vpend])
  * adjacent strings/numbers are merged into a single Text node
  */
  const prime = (...nodes) => {
    const out = [];
    let text = null;
    const flush = () => {
      if (text) out.push(new Text(text));
      text = null;
    };
    const walk = n => {
      if (n == null || typeof n === 'boolean') return
      const type = typeof n;
      if (type === 'string' || type === 'number' || type === 'bigint') {
        text = (text || '') + String(n);
        return
      }
      flush();
      if (n instanceof Node || n instanceof Function) {
        out.push(n);
      } else if (isPromise(n)) {
        out.push(pending(n));
      } else if (isArr(n) || n instanceof NodeList || n instanceof HTMLCollection) {
        for (const c of Array.from(n)) walk(c);
      } else if (n.constructor === Object) {
        for (const c of Object.values(n)) walk(c);
      } else {
        throw new Error(`illegal renderable: ${n}`)
      }
    };
    for (let i = 0; i < nodes.length; i++) walk(nodes[i]);
    flush();
    return out
  };

  /*
  * attach renderables to a host node via a connector
  * like append, prepend, before, after
  * independant of load state
  */
  const attach = (host, connector, ...renderables) => {
    if (host instanceof Function && !isProxyNode(host)) host = host();
    if (renderables.length === 1 && isArr(renderables[0])) {
      renderables = renderables[0];
    }
    if (isArr(host)) {
      host.push(...renderables);
      return renderables.length === 1 ? renderables[0] : renderables
    }

    const nodeHost = host instanceof Node || isProxyNode(host);
    renderables = prime(renderables);
    if (nodeHost) {
      if ((connector === 'after' || connector === 'before') && !isMounted(host)) {
        once.mount(host, e => attach(host, connector, ...renderables));
      } else {
        vpend(renderables, host, connector);
      }
    } else if (typeof host === 'string') {
      return queryAsync(host).then(h => attach(h, connector, ...renderables))
    }
    return renderables.length === 1 ? renderables[0] : renderables
  };

  /*
  * render attaches a node to another
  *
  */
  const render = (
    node,
    host = document.body || 'body',
    connector = 'appendChild'
  ) => attach(host, connector, node);

  const domfn = {
    css (node, styles, prop) {
      if (styles == null) {
        return getComputedStyle(node)
      } else if (isObj(styles)) {
        for (const key in styles) domfn.css(node, key, styles[key]);
      } else if (typeof styles === 'string') {
        if (prop == null) {
          const style = getComputedStyle(node);
          if (!styles) return style
          return styles[0] === '-' ? style.getPropertyValue(styles) : style[styles]
        } else if (styles[0] === '-') {
          node.style.setProperty(styles, prop);
        } else {
          node.style[styles] = prop;
        }
      }
      return node
    },

    class (node, c, state) {
      if (isArr(node)) {
        for (let i = 0; i < node.length; i++) {
          domfn.class(node[i], c, state);
        }
        return node
      }
      if (isProxyNode(node)) node = node();
      if (!node || c == null || !node.classList) return node

      if (isObj(c)) {
        for (const name in c) domfn.class(node, name, !!c[name]);
      } else {
        if (typeof c === 'string') c = c.split(/\s+/).filter(Boolean);
        if (isArr(c)) {
          const noState = typeof state !== 'boolean';
          for (let i = 0; i < c.length; i++) {
            node.classList[noState ? 'toggle' : state ? 'add' : 'remove'](c[i]);
          }
        }
      }
      return node
    },

    hasClass: curry((node, name) => node.classList.contains(name)),

    attr (node, attr, val) {
      if (isObj(attr)) {
        for (const a in attr) {
          const old = node.getAttribute(a);
          const present = attr[a] != null;
          present ? node.setAttribute(a, attr[a]) : node.removeAttribute(a);
          attributeChange(node, a, old, present ? String(attr[a]) : null, present);
        }
      } else if (typeof attr === 'string') {
        const old = node.getAttribute(attr);
        if (val == null) return old
        node.setAttribute(attr, val);
        attributeChange(node, attr, old, String(val), true);
      }
      return node
    },

    removeAttribute (node, ...attrs) {
      for (const attr of attrs.flat(Infinity)) {
        const old = node.getAttribute(attr);
        node.removeAttribute(attr);
        attributeChange(node, attr, old, null, false);
      }
      return node
    },

    attrToggle (
      node,
      name,
      state = !node.hasAttribute(name),
      val = node.getAttribute(name) || ''
    ) {
      const old = node.getAttribute(name);
      state ? node.setAttribute(name, val) : node.removeAttribute(name);
      attributeChange(node, name, old, state ? val : null, state);
      return node
    },

    emit,

    append (node, ...children) {
      attach(node, 'appendChild', ...children);
      return node
    },

    prepend (node, ...children) {
      attach(node, 'prepend', ...children);
      return node
    },

    appendTo (node, host) {
      attach(host, 'appendChild', node);
      return node
    },

    prependTo (node, host) {
      attach(host, 'prepend', node);
      return node
    },

    clear (node) {
      node[isInput(node) ? 'value' : 'textContent'] = '';
      return node
    },

    refurbish (node) {
      for (const { name } of node.attributes) {
        node.removeAttribute(name);
      }
      node.removeAttribute('class');
      return domfn.clear(node)
    },

    remove (node, after) {
      if (node instanceof Function) node = node();
      if (isArr(node) || node instanceof NodeList) {
        for (const n of Array.from(node)) domfn.remove(n, after);
      } else if (isNum(after)) {
        setTimeout(() => domfn.remove(node), after);
      } else if (node instanceof Node) {
        // same queue as appends so append-then-remove keeps its order
        run(() => node.remove());
      }
      return node
    },

    replace (node, newnode) {
      if (newnode instanceof Function) newnode = newnode();
      if (isProxyNode(node)) node = node();
      run(() => node.replaceWith(newnode));
      return newnode
    },

    find (node, query, pure) {
      query = queryAll(query, node);
      return pure ? query : query.map(n => $(n))
    },

    findOne (node, q, pure) {
      if (pure) return query(q, node)
      q = query(q, node);
      return q ? $(q) : q
    }
  };
  domfn.empty = domfn.clear;

  const databind = ops => {
    const core = emitter();
    core.ops = ops;
    core.host = ops.host;
    core.val = ops.val != null ? ops.val : '';
    if (!ops.views) ops.views = {};
    core.change = val => {
      if (val === core.val) return
      if (core.ops.change) {
        const out = core.ops.change(val, core);
        if (out != null && out !== val) val = out;
      }
      core.emit.change(core.val = val);
      if (core.ops.views) {
        for (const name in core.ops.views) {
          const out = core.ops.views[name](val, core);
          if (out != null) core.emit[name](out, core);
        }
      }
    };

    core.view = infinify((key, fn) => {
      if (key in core.ops.views) {
        return fn ? fn(core.ops.views[key](core.val, core), core) : core.ops.views[key](core.val, core)
      }
      if (!isFunc(fn)) throw new TypeError('databind view needs function')
      core.ops.views[key] = fn;
    });

    core.stop = () => {
      for (const bind of core.binds) {
        bind.off();
        if (bind.inputUpdaters) bind.inputUpdaters.off();
      }
      core.binds.clear();
      core.change = () => {};
    };

    core.binds = new Set();
    core.bind = new Proxy((host, key, view) => {
      if (isStr(key) && key.includes(':')) [view, key] = key.split(':');
      let inputUpdaters;
      if (isInput(host)) {
        // bind(input, 'viewName') renders a view into the input's value
        if (view == null && isStr(key) && key in core.ops.views) view = key;
        key = 'value';
        const inputUpdate = e => {
          core.change(host[key]);
        };
        inputUpdaters = $(host).on({
          input: inputUpdate,
          keyup: inputUpdate,
          blur: inputUpdate,
          focus: inputUpdate
        });
      }
      const handle = core.on[isStr(view) ? view : 'change'](val => {
        if (host[key] !== val) host[key] = val;
      });
      if (inputUpdaters) handle.inputUpdaters = inputUpdaters;
      host[key] = isStr(view) ? core.view(view) : core.val;
      core.binds.add(handle);
      return handle
    }, {
      get (_, key) {
        if (key in core) return Reflect.get(core, key)
        if (key in core.ops.views) return core.ops.views[key](core.val, core)
      },
      set (_, key, val) {
        if (key === 'change') core.ops.change = val;
        else if (key === 'val') core.val = val;
        else Reflect.set(core, key, val);
        return true
      }
    });

    core.text = view => {
      const text = new Text();
      text.boundby = core.bind(text, 'textContent', view);
      return text
    };

    if (core.host && core.ops.key) {
      core.bind(core.host, core.ops.key);
    }

    return core
  };

  /* global Node */

  // weak so proxied nodes can still be garbage collected
  const ProxiedNodes = new WeakMap();

  const hasOwn = (o, key) => Object.prototype.hasOwnProperty.call(o, key);

  const $ = node => {
    if (isProxyNode(node)) return node
    if (typeof node === 'string') {
      node = query(node);
      if (!node) throw new Error('$: no match')
    }
    if (node == null || typeof node !== 'object') {
      throw new TypeError(`$ needs a Node: ${String(node)}`)
    }
    if (ProxiedNodes.has(node)) return ProxiedNodes.get(node)
    if (!(node instanceof Node)) {
      throw new TypeError(`$ needs a Node: ${String(node)}`)
    }

    const Class = new Proxy((c, state) => {
      domfn.class(node, c, state);
      return proxy
    }, {
      get: (fn, key) => typeof key === 'symbol'
        ? Reflect.get(fn, key)
        : !!node.classList && node.classList.contains(key),
      set (fn, key, val) {
        fn(key, !!val);
        return true
      },
      deleteProperty (_, key) {
        if (node.classList) node.classList.remove(key);
        return true
      }
    });

    let Attr;
    if (isEl(node)) {
      const getAttr = node.getAttribute.bind(node);
      const hasAttr = node.hasAttribute.bind(node);
      const rmAttr = domfn.removeAttribute.bind(null, node);
      Attr = new Proxy((attr, val) => {
        const result = domfn.attr(node, attr, val);
        return result === node ? proxy : result
      }, {
        get: (fn, key) => typeof key === 'symbol'
          ? Reflect.get(fn, key)
          : key === 'has' ? hasAttr : key === 'remove' ? rmAttr : getAttr(key),
        set (fn, key, val) {
          key === 'remove' ? rmAttr(val) : fn(key, val);
          return true
        },
        deleteProperty (_, key) {
          domfn.removeAttribute(node, key);
          return true
        }
      });
    }

    const isinput = isInput(node);
    const textContent = isinput ? 'value' : 'textContent';
    const innerHTML = isinput ? 'value' : node.nodeType === 3 ? textContent : 'innerHTML';

    const once = infinify(EventManager(true, node), false);
    const on = infinify(EventManager(false, node), false);

    const proxy = new Proxy(
      Object.assign(fn => {
        if (fn instanceof Function && !isProxyNode(fn)) {
          fn.call(node, proxy, node);
        }
        return node
      }, {
        class: Class,
        attr: Attr,
        on,
        once,
        emit: emit.bind(null, node),
        render: render.bind(null, node),
        [ProxyNodeSymbol]: true
      }),
      {
        get (fn, key) {
          if (key in fn && !(key in Function.prototype)) return fn[key]
          else if (key === 'txt') return node[textContent]
          else if (key === 'html') return node[innerHTML]
          else if (key === 'mounted') return isMounted(node)
          else if (key === 'children') return Array.from(node.children)
          else if (key === '$children') return Array.prototype.map.call(node.children, $)
          else if (key === 'parent' && node.parentNode) return $(node.parentNode)
          else if (key in domfn) {
            return (...args) => {
              const result = domfn[key](node, ...args);
              return result === node || result === proxy ? proxy : result
            }
          }

          const val = node[key];
          // bind native (prototype) methods so they work on SVG/Text/etc too,
          // but leave the user's own function props untouched
          return isFunc(val) && !hasOwn(node, key) ? val.bind(node) : val
        },
        set (fn, key, val) {
          if (key === 'class') domfn.class(node, val, isObj(val) ? undefined : true);
          else if (key === 'attr') domfn.attr(node, val);
          else if (key === 'css') domfn.css(node, val);
          else if (key === 'txt') node[textContent] = val;
          else if (key === 'html' || key === 'children') {
            if (isStr(val)) {
              node[innerHTML] = val;
            } else {
              node[textContent] = '';
              vpend(prime(val), node);
            }
          } else {
            node[key] = val;
          }
          return true
        }
      }
    );
    ProxiedNodes.set(node, proxy);

    return proxy
  };

  /* global CustomEvent */

  /* const watched = Object.create(null)
  const watch = (name, opts) => {
    if (opts == null) throw new TypeError(`attr.watch: useless watcher opts == null`)
    watched[name] = opts = Object.assign(Object.create(null), opts)
  }
  watch.update = (name, el, value = el.getAttribute(name)) => {}
  */

  const Initiated = new Map();
  const beenInitiated = (name, el) => Initiated.has(name) && Initiated.get(name)(el);

  const attributeObserver = (el, name, opts) => {
    el = $(el);
    let { init, update, remove } = opts;
    if (!init && !update && opts instanceof Function) {
      [init, update] = [opts, opts];
    }
    const intialize = (present, value) => {
      if (present && !beenInitiated(name, el)) {
        if (init) init(el, value);
        if (!Initiated.has(name)) {
          Initiated.set(name, mutateSet(new WeakSet()));
        }
        Initiated.get(name)(el, true);
        return true
      }
      return beenInitiated(name, el)
    };
    let removedBefore = false;
    let old = el.attr[name];
    intialize(el.attr.has(name), old);
    const stop = el.on.attr(({ name: attrName, value, oldvalue, present }) => {
      if (
        attrName === name &&
        old !== value &&
        value !== oldvalue &&
        intialize(present, value)
      ) {
        if (present) {
          if (update) update(el, value, old);
          removedBefore = false;
        } else if (!removedBefore) {
          if (remove) remove(el, value, old);
          removedBefore = true;
        }
        old = value;
      }
    });

    const manager = () => {
      stop();
      if (Initiated.has(name)) Initiated.get(name)(el, false);
    };
    manager.start = () => {
      stop.on();
      Initiated.get(name)(el, true);
    };
    return (manager.stop = manager)
  };

  const directives = new Map();
  const directive = (name, opts) => {
    const directive = new Map();
    directive.init = el => {
      if (!beenInitiated(name, el)) {
        directive.set(el, attributeObserver(el, name, opts));
      }
    };
    directive.stop = el => {
      if (directive.has(el)) directive.get(el)();
    };
    directives.set(name, directive);
    run(() => queryEach('[' + name + ']', n => attributeChange(n, name)));
    return directive
  };

  // last value an 'attr' event was dispatched with, per element & attribute.
  // domfn.attr reports changes synchronously and the MutationObserver
  // reports them again later; this keeps that from firing twice.
  const lastSeen = new WeakMap();

  const attributeChange = (
    el,
    name,
    oldvalue,
    value = el.getAttribute(name),
    present = el.hasAttribute(name)
  ) => {
    if (directives.has(name)) directives.get(name).init($(el));
    let seen = lastSeen.get(el);
    if (!seen) lastSeen.set(el, (seen = new Map()));
    if (seen.has(name) && seen.get(name) === value) return
    seen.set(name, value);
    if (value !== oldvalue) {
      el.dispatchEvent(assign(new CustomEvent('attr'), {
        name,
        value,
        oldvalue,
        present
      }));
    }
  };

  /* global CustomEvent MutationObserver Element */

  const Created = mutateSet(new WeakSet());
  const Mounted = mutateSet(new WeakSet());
  const Unmounted = mutateSet(new WeakSet());

  const dispatch = (n, state) => {
    n.dispatchEvent(new CustomEvent(state));
  };

  // only registered components get special treatment,
  // unregistered custom-elements are treated like any other node
  const isComponent = n => n.nodeType === 1 && components.has(n.tagName);

  const CR = (n, undone = !Created(n), component = isComponent(n)) => {
    if (undone && !component) {
      Created(n, true);
      dispatch(n, 'create');
    }
  };

  const eachChild = (n, fn) => {
    // snapshot: handlers may add/remove children while we walk
    if (n.childNodes && n.childNodes.length) {
      for (const child of Array.from(n.childNodes)) fn(child);
    }
  };

  const MNT = (n, iscomponent = isComponent(n)) => {
    CR(n, !Created(n), iscomponent);
    if (Mounted(n) || !n.isConnected) return
    if (!iscomponent) Mounted(n, true);
    if (Unmounted(n)) {
      Unmounted(n, false);
      dispatch(n, 'remount');
    } else {
      dispatch(n, 'mount');
    }
    eachChild(n, MountNodes);
    if (n instanceof Element) {
      for (const attr of directives.keys()) {
        if (n.hasAttribute(attr)) attributeChange(n, attr, null, n.getAttribute(attr), true);
      }
    }
  };

  const UNMNT = n => {
    if (!Mounted(n) || n.isConnected) return
    Mounted(n, false);
    Unmounted(n, true);
    dispatch(n, 'unmount');
    eachChild(n, UnmountNodes);
  };

  const MountNodes = n => {
    if (updateComponent(n, 'mount')) {
      eachChild(n, MountNodes);
    } else {
      MNT(n);
    }
  };

  const UnmountNodes = n => {
    if (updateComponent(n, 'unmount')) {
      eachChild(n, UnmountNodes);
    } else {
      UNMNT(n);
    }
  };

  if (typeof document !== 'undefined' && typeof MutationObserver !== 'undefined') {
    new MutationObserver(muts => {
      for (const mut of muts) {
        const { addedNodes, removedNodes, attributeName } = mut;
        // a node moved within the document shows up as removed + added,
        // so judge by where it actually is now
        for (const node of removedNodes) {
          if (!node.isConnected) UnmountNodes(node);
        }
        for (const node of addedNodes) {
          if (node.isConnected) MountNodes(node);
        }
        if (attributeName != null) {
          attributeChange(mut.target, attributeName, mut.oldValue);
        }
      }
    }).observe(document, {
      attributes: true,
      attributeOldValue: true,
      childList: true,
      subtree: true
    });
  }

  const ObservedAttrsSymbol = Symbol('observed-attrs');
  const components = new Map();
  const component = (tagName, config) => {
    if (isFunc(config)) config = config();
    if (!tagName.includes('-')) {
      throw new Error(`component: ${tagName} tagName is un-hyphenated`)
    }
    components.set(tagName.toUpperCase(), config);
    run(() => queryEach(tagName, el => updateComponent(el)));
    queryEach(tagName, el => updateComponent(el));
    return dom[tagName]
  };

  component.plugins = null;
  component.plugin = plugin => {
    if (isObj(plugin)) {
      if (!component.plugins) component.plugins = Object.create(null);
      for (const key in plugin) {
        if (!(key in component.plugins)) component.plugins[key] = new Set();
        component.plugins[key].add(plugin[key]);
      }
    }
  };

  const runPlugins = (stage, el, ...args) => {
    const set = component.plugins && component.plugins[stage];
    if (set) for (const fn of set) fn.call(el, ...args);
  };

  // component lifecycle state, kept apart from plain node state
  // so a component registered after its elements exist still initializes
  const Initialized = mutateSet(new WeakSet());
  const CMounted = mutateSet(new WeakSet());
  const CUnmounted = mutateSet(new WeakSet());

  const updateComponent = function (el, config, stage, afterProps) {
    if (!el || el.nodeType !== 1 || !components.has(el.tagName)) return
    if (isStr(config)) [stage, config] = [config, components.get(el.tagName)];
    else if (!isObj(config)) config = components.get(el.tagName);

    const {
      create,
      mount,
      remount,
      unmount,
      props,
      methods,
      bind,
      attr
    } = config;
    const proxied = $(el);

    if (!Initialized(el)) {
      Initialized(el, true);
      if (bind) {
        const isinput = isInput(el);
        for (const key in bind) {
          // copy: the config is shared between every instance
          const b = databind({ ...bind[key], host: proxied, isinput });
          Object.defineProperty(el, key, { get () { return b.val }, set: b.change, configurable: true });
          Object.defineProperty(el, '$' + key, { value: b, configurable: true });
        }
      }

      if (methods) assimilate.methods(el, methods);
      if (props) assimilate.props(el, props);
      if (afterProps) assimilate.props(el, afterProps);
      Created(el, true);
      if (create) create.call(el, proxied);

      runPlugins('config', el, config, proxied, el);
      runPlugins('create', el, proxied, el);

      dispatch(el, 'create');

      if (isObj(config.on)) proxied.on(config.on);
      if (isObj(config.once)) proxied.once(config.once);

      if (isObj(attr)) {
        el[ObservedAttrsSymbol] = Object.create(null);
        for (const name in attr) {
          el[ObservedAttrsSymbol][name] = attributeObserver(el, name, attr[name]);
        }
      }

      el.componentReady = true;
      dispatch(el, 'componentReady');
    }

    if (stage === 'unmount') {
      if (CMounted(el) && !el.isConnected) {
        CMounted(el, false);
        CUnmounted(el, true);
        Mounted(el, false);
        Unmounted(el, true);
        runPlugins('unmount', el, proxied, el);
        for (const name in el[ObservedAttrsSymbol]) {
          el[ObservedAttrsSymbol][name].stop();
        }
        if (unmount) unmount.call(el, proxied);
        dispatch(el, 'unmount');
      }
    } else if (!CMounted(el) && el.isConnected) {
      CMounted(el, true);
      Mounted(el, true);
      if (CUnmounted(el)) {
        CUnmounted(el, false);
        Unmounted(el, false);
        runPlugins('remount', el, proxied, el);
        for (const name in el[ObservedAttrsSymbol]) {
          el[ObservedAttrsSymbol][name].start();
        }
        if (remount) remount.call(el, proxied);
        dispatch(el, 'remount');
      } else {
        runPlugins('mount', el, proxied, el);
        if (mount) mount.call(el, proxied);
        dispatch(el, 'mount');
      }
    }
    return el
  };

  const componentReady = (el, fn) => new Promise(resolve => run(() => {
    el = $(el);
    if (el.componentReady) {
      resolve(el);
      if (fn) fn(el);
      return
    }
    el.once.componentReady(e => {
      resolve(el);
      if (fn) fn(el);
    });
  }));

  exports.$ = $;
  exports.Created = Created;
  exports.Mounted = Mounted;
  exports.Unmounted = Unmounted;
  exports.allare = allare;
  exports.attributeObserver = attributeObserver;
  exports.component = component;
  exports.componentReady = componentReady;
  exports.components = components;
  exports.compose = compose;
  exports.curry = curry;
  exports.databind = databind;
  exports.directive = directive;
  exports.directives = directives;
  exports.dom = dom;
  exports.domfn = domfn;
  exports.each = each;
  exports.emitter = emitter;
  exports.flatten = flatten;
  exports.h = h;
  exports.html = html;
  exports.isArr = isArr;
  exports.isArrlike = isArrlike;
  exports.isBool = isBool;
  exports.isComponent = isComponent$1;
  exports.isDef = isDef;
  exports.isEl = isEl;
  exports.isEmpty = isEmpty;
  exports.isFunc = isFunc;
  exports.isInput = isInput;
  exports.isInt = isInt;
  exports.isMounted = isMounted;
  exports.isNil = isNil;
  exports.isNode = isNode;
  exports.isNodeList = isNodeList;
  exports.isNum = isNum;
  exports.isObj = isObj;
  exports.isPrimitive = isPrimitive;
  exports.isPromise = isPromise;
  exports.isProxyNode = isProxyNode;
  exports.isRegExp = isRegExp;
  exports.isRenderable = isRenderable;
  exports.isStr = isStr;
  exports.isSvg = isSvg;
  exports.merge = merge;
  exports.on = on;
  exports.once = once;
  exports.prime = prime;
  exports.query = query;
  exports.queryAll = queryAll;
  exports.queryAsync = queryAsync;
  exports.queryEach = queryEach;
  exports.render = render;
  exports.run = run;
  exports.runAsync = runAsync;
  exports.svg = svg;

}));
