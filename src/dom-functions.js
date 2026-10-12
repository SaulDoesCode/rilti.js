/* global Text Node NodeList HTMLCollection CustomEvent Comment getComputedStyle */
import {
  curry,
  emitter,
  run,
  query,
  queryAll,
  queryAsync,
  isArr,
  isInput,
  isMounted,
  isNum,
  isFunc,
  isStr,
  isProxyNode,
  isPromise,
  isObj,
  infinify
} from './common.js'
import { once } from './event-manager.js'
import { frag } from './dom-generation.js'
import { MountNodes } from './lifecycles.js'
import { attributeChange } from './directives.js'
import $ from './proxy-node.js'

export const emit = (node, type, detail) => {
  node.dispatchEvent(typeof type !== 'string' ? type : new CustomEvent(type, { detail }))
  return node
}

// vpend - virtual append, add nodes and append them as a document fragment
export const vpend = (
  children,
  host,
  connector = 'appendChild',
  dfrag = frag(),
  noHostAppend
) => {
  const hostNode = isProxyNode(host) ? host() : host
  const added = []
  const add = child => {
    // deglove renderables hidden in (nested) functions
    let depth = 0
    while (child instanceof Function && depth++ < 25) {
      const next = depth === 1 ? child(host) : child()
      if (next === child) break
      child = next
    }
    if (child == null || child instanceof Function) return
    if (child === host || child === hostNode) return
    if (child instanceof Node) {
      dfrag.appendChild(child)
      added.push(child)
    } else {
      for (const c of prime(child)) add(c)
    }
  }
  for (let i = 0; i < children.length; i++) add(children[i])

  if (hostNode && !noHostAppend) {
    run(() => {
      hostNode[connector](dfrag)
      for (const child of added) {
        if (child.isConnected) MountNodes(child)
      }
    })
  }
  return added
}

// a placeholder that is swapped for whatever the promise resolves to
const pending = promise => {
  const marker = new Comment('rilti:pending')
  Promise.resolve(promise).then(result => {
    vpend(prime(result), marker, 'replaceWith')
  })
  return marker
}

/*
* prime takes an array of renderable entities
* and turns them into just nodes and functions
* (to be degloved later rather than sooner [by vpend])
* adjacent strings/numbers are merged into a single Text node
*/
export const prime = (...nodes) => {
  const out = []
  let text = null
  const flush = () => {
    if (text) out.push(new Text(text))
    text = null
  }
  const walk = n => {
    if (n == null || typeof n === 'boolean') return
    const type = typeof n
    if (type === 'string' || type === 'number' || type === 'bigint') {
      text = (text || '') + String(n)
      return
    }
    flush()
    if (n instanceof Node || n instanceof Function) {
      out.push(n)
    } else if (isPromise(n)) {
      out.push(pending(n))
    } else if (isArr(n) || n instanceof NodeList || n instanceof HTMLCollection) {
      for (const c of Array.from(n)) walk(c)
    } else if (n.constructor === Object) {
      for (const c of Object.values(n)) walk(c)
    } else {
      throw new Error(`illegal renderable: ${n}`)
    }
  }
  for (let i = 0; i < nodes.length; i++) walk(nodes[i])
  flush()
  return out
}

/*
* attach renderables to a host node via a connector
* like append, prepend, before, after
* independant of load state
*/
export const attach = (host, connector, ...renderables) => {
  if (host instanceof Function && !isProxyNode(host)) host = host()
  if (renderables.length === 1 && isArr(renderables[0])) {
    renderables = renderables[0]
  }
  if (isArr(host)) {
    host.push(...renderables)
    return renderables.length === 1 ? renderables[0] : renderables
  }

  const nodeHost = host instanceof Node || isProxyNode(host)
  renderables = prime(renderables)
  if (nodeHost) {
    if ((connector === 'after' || connector === 'before') && !isMounted(host)) {
      once.mount(host, e => attach(host, connector, ...renderables))
    } else {
      vpend(renderables, host, connector)
    }
  } else if (typeof host === 'string') {
    return queryAsync(host).then(h => attach(h, connector, ...renderables))
  }
  return renderables.length === 1 ? renderables[0] : renderables
}

/*
* render attaches a node to another
*
*/
export const render = (
  node,
  host = document.body || 'body',
  connector = 'appendChild'
) => attach(host, connector, node)

export const domfn = {
  css (node, styles, prop) {
    if (styles == null) {
      return getComputedStyle(node)
    } else if (isObj(styles)) {
      for (const key in styles) domfn.css(node, key, styles[key])
    } else if (typeof styles === 'string') {
      if (prop == null) {
        const style = getComputedStyle(node)
        if (!styles) return style
        return styles[0] === '-' ? style.getPropertyValue(styles) : style[styles]
      } else if (styles[0] === '-') {
        node.style.setProperty(styles, prop)
      } else {
        node.style[styles] = prop
      }
    }
    return node
  },

  class (node, c, state) {
    if (isArr(node)) {
      for (let i = 0; i < node.length; i++) {
        domfn.class(node[i], c, state)
      }
      return node
    }
    if (isProxyNode(node)) node = node()
    if (!node || c == null || !node.classList) return node

    if (isObj(c)) {
      for (const name in c) domfn.class(node, name, !!c[name])
    } else {
      if (typeof c === 'string') c = c.split(/\s+/).filter(Boolean)
      if (isArr(c)) {
        const noState = typeof state !== 'boolean'
        for (let i = 0; i < c.length; i++) {
          node.classList[noState ? 'toggle' : state ? 'add' : 'remove'](c[i])
        }
      }
    }
    return node
  },

  hasClass: curry((node, name) => node.classList.contains(name)),

  attr (node, attr, val) {
    if (isObj(attr)) {
      for (const a in attr) {
        const old = node.getAttribute(a)
        const present = attr[a] != null
        present ? node.setAttribute(a, attr[a]) : node.removeAttribute(a)
        attributeChange(node, a, old, present ? String(attr[a]) : null, present)
      }
    } else if (typeof attr === 'string') {
      const old = node.getAttribute(attr)
      if (val == null) return old
      node.setAttribute(attr, val)
      attributeChange(node, attr, old, String(val), true)
    }
    return node
  },

  removeAttribute (node, ...attrs) {
    for (const attr of attrs.flat(Infinity)) {
      const old = node.getAttribute(attr)
      node.removeAttribute(attr)
      attributeChange(node, attr, old, null, false)
    }
    return node
  },

  attrToggle (
    node,
    name,
    state = !node.hasAttribute(name),
    val = node.getAttribute(name) || ''
  ) {
    const old = node.getAttribute(name)
    state ? node.setAttribute(name, val) : node.removeAttribute(name)
    attributeChange(node, name, old, state ? val : null, state)
    return node
  },

  emit,

  append (node, ...children) {
    attach(node, 'appendChild', ...children)
    return node
  },

  prepend (node, ...children) {
    attach(node, 'prepend', ...children)
    return node
  },

  appendTo (node, host) {
    attach(host, 'appendChild', node)
    return node
  },

  prependTo (node, host) {
    attach(host, 'prepend', node)
    return node
  },

  clear (node) {
    node[isInput(node) ? 'value' : 'textContent'] = ''
    return node
  },

  refurbish (node) {
    for (const { name } of node.attributes) {
      node.removeAttribute(name)
    }
    node.removeAttribute('class')
    return domfn.clear(node)
  },

  remove (node, after) {
    if (node instanceof Function) node = node()
    if (isArr(node) || node instanceof NodeList) {
      for (const n of Array.from(node)) domfn.remove(n, after)
    } else if (isNum(after)) {
      setTimeout(() => domfn.remove(node), after)
    } else if (node instanceof Node) {
      // same queue as appends so append-then-remove keeps its order
      run(() => node.remove())
    }
    return node
  },

  replace (node, newnode) {
    if (newnode instanceof Function) newnode = newnode()
    if (isProxyNode(node)) node = node()
    run(() => node.replaceWith(newnode))
    return newnode
  },

  find (node, query, pure) {
    query = queryAll(query, node)
    return pure ? query : query.map(n => $(n))
  },

  findOne (node, q, pure) {
    if (pure) return query(q, node)
    q = query(q, node)
    return q ? $(q) : q
  }
}
domfn.empty = domfn.clear

export const databind = ops => {
  const core = emitter()
  core.ops = ops
  core.host = ops.host
  core.val = ops.val != null ? ops.val : ''
  if (!ops.views) ops.views = {}
  core.change = val => {
    if (val === core.val) return
    if (core.ops.change) {
      const out = core.ops.change(val, core)
      if (out != null && out !== val) val = out
    }
    core.emit.change(core.val = val)
    if (core.ops.views) {
      for (const name in core.ops.views) {
        const out = core.ops.views[name](val, core)
        if (out != null) core.emit[name](out, core)
      }
    }
  }

  core.view = infinify((key, fn) => {
    if (key in core.ops.views) {
      return fn ? fn(core.ops.views[key](core.val, core), core) : core.ops.views[key](core.val, core)
    }
    if (!isFunc(fn)) throw new TypeError('databind view needs function')
    core.ops.views[key] = fn
  })

  core.stop = () => {
    for (const bind of core.binds) {
      bind.off()
      if (bind.inputUpdaters) bind.inputUpdaters.off()
    }
    core.binds.clear()
    core.change = () => {}
  }

  core.binds = new Set()
  core.bind = new Proxy((host, key, view) => {
    if (isStr(key) && key.includes(':')) [view, key] = key.split(':')
    let inputUpdaters
    if (isInput(host)) {
      // bind(input, 'viewName') renders a view into the input's value
      if (view == null && isStr(key) && key in core.ops.views) view = key
      key = 'value'
      const inputUpdate = e => {
        core.change(host[key])
      }
      inputUpdaters = $(host).on({
        input: inputUpdate,
        keyup: inputUpdate,
        blur: inputUpdate,
        focus: inputUpdate
      })
    }
    const handle = core.on[isStr(view) ? view : 'change'](val => {
      if (host[key] !== val) host[key] = val
    })
    if (inputUpdaters) handle.inputUpdaters = inputUpdaters
    host[key] = isStr(view) ? core.view(view) : core.val
    core.binds.add(handle)
    return handle
  }, {
    get (_, key) {
      if (key in core) return Reflect.get(core, key)
      if (key in core.ops.views) return core.ops.views[key](core.val, core)
    },
    set (_, key, val) {
      if (key === 'change') core.ops.change = val
      else if (key === 'val') core.val = val
      else Reflect.set(core, key, val)
      return true
    }
  })

  core.text = view => {
    const text = new Text()
    text.boundby = core.bind(text, 'textContent', view)
    return text
  }

  if (core.host && core.ops.key) {
    core.bind(core.host, core.ops.key)
  }

  return core
}
