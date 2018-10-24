/* global Text Node NodeList CustomEvent */
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
  isNodeList,
  isNum,
  isFunc,
  isStr,
  isProxyNode,
  infinify
} from './common.js'
import { once } from './event-manager.js'
import { frag } from './dom-generation.js'
import { MNT } from './lifecycles.js'
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
  for (let i = 0; i < children.length; i++) {
    let child = children[i]
    if (child instanceof Function) {
      if ((child = child(host)) === host) continue
      else if (child instanceof Function) {
        let lvl = 0
        let ishost = false
        let lastchild
        while (child instanceof Function && lvl < 25) {
          lastchild = child
          child = child()
          if ((ishost = child === host) || lastchild === child) break
          lvl++
        }
        if (ishost) continue
      }
    }

    if (child == null) continue
    const ctr = child.constructor
    if (ctr === String || ctr === Number) {
      if (!child.length) continue
      child = new Text(child)
    } else if (isArr(child)) {
      child = vpend(child, host, connector, dfrag, true)
    }

    if (child instanceof Node) {
      dfrag.appendChild(child)
      children[i] = child
    }
  }
  if (host && !noHostAppend) {
    run(() => {
      host[connector](dfrag)
      for (const child of children) {
        if (child != null && child.dispatchEvent) MNT(child)
      }
    })
  }
  return children
}

/*
* prime takes an array of renderable entities
* and turns them into just nodes and functions
* (to be degloved later rather than sooner [by vpend])
*/
export const prime = (...nodes) => {
  for (let i = 0; i < nodes.length; i++) {
    let n = nodes[i]
    const ntype = typeof n
    if (n == null || ntype === 'boolean') {
      nodes.splice(i, 1)
      continue
    }
    if (n instanceof Node || n instanceof Function) {
      continue
    } else if (ntype === 'string' || ntype === 'number') {
      const nextI = i + 1
      if (nextI < nodes.length) {
        const next = nodes[nextI]
        const nexttype = typeof next
        if (nexttype === 'string' || nexttype === 'number') {
          nodes[i] = String(n) + String(next)
          nodes.splice(nextI, 1)
          i--
        }
      } else {
        nodes[i] = new Text(String(n))
      }
      continue
    }

    const isnl = n instanceof NodeList
    if (isnl) {
      if (n.length < 2) {
        nodes[i] = n[0]
        continue
      }
      n = Array.from(n)
    } else if (n.constructor === Object) {
      n = Object.values(n)
    }

    if (isArr(n)) {
      if (!isnl) {
        n = prime.apply(null, n)
        if (n.length < 2) {
          nodes[i] = n[0]
          i--
          continue
        }
      }
      nodes.splice(i, 1, ...n)
      i--
    } else if (n != null) {
      throw new Error(`illegal renderable: ${n}`)
    }
  }
  return nodes
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
  } if (isArr(host)) {
    host.push(...renderables)
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
      if (document.defaultView) {
        return document.defaultView.getComputedStyle(node)
      }
    } else if (styles.constructor === Object) {
      for (const key in styles) domfn.css(node, key, styles[key])
    } else if (typeof styles === 'string') {
      if (prop == null) {
        if (styles && styles[0] === '-') return node.getPropertyValue(styles)
        if (document.defaultView) {
          const style = document.defaultView.getComputedStyle(node)
          if (style) return styles ? style[styles] : style
        }
      } else if (styles[0] === '-') {
        node.style.setProperty(styles, prop)
      } else {
        node.style[styles] = prop
      }
    }
    return node
  },

  class (node, c, state) {
    if (!node || c == null || !node.classList) return node

    if (isArr(node)) {
      for (let i = 0; i < node.length; i++) {
        domfn.class(node[i], c, state)
      }
      return node
    }

    if (c.constructor === Object) {
      for (const name in c) domfn.class(node, name, c[name])
    } else {
      if (typeof c === 'string') c = c.split(' ')
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
    if (attr.constructor === Object) {
      for (const a in attr) {
        const present = attr[a] == null
        node[present ? 'removeAttribute' : 'setAttribute'](a, attr[a])
        attributeChange(node, a, null, attr[a], !present)
      }
    } else if (typeof attr === 'string') {
      const old = node.getAttribute(attr)
      if (val == null) return old
      node.setAttribute(attr, val)
      attributeChange(node, attr, old, val)
    }
    return node
  },

  removeAttribute (node, ...attrs) {
    if (attrs.length === 1) {
      node.removeAttribute(attrs[0])
      attributeChange(node, attrs[0], null, null, false)
    } else {
      for (let i = 0; i < attrs.length; i++) {
        if (isArr(attrs[i])) {
          attrs.splice(i, 1, ...attrs[i])
          i--
        }
        node.removeAttribute(attrs[i])
        attributeChange(node, attrs[i], null, null, false)
      }
    }
    return node
  },

  attrToggle (
    node,
    name,
    state = !node.hasAttribute(name),
    val = node.getAttribute(name) || ''
  ) {
    node[state ? 'setAttribute' : 'removeAttribute'](name, val)
    attributeChange(node, name, state ? val : null, state ? null : val, state)
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
    if (isArr(node)) {
      for (let i = 0; i < node.length; i++) domfn.remove(node[i], after)
    } else if (isNum(after)) {
      setTimeout(() => domfn.remove(node), after)
    } else if (isMounted(node)) {
      run(() => node.remove())
    } else if (isNodeList(node)) {
      for (let i = 0; i < node.length; i++) domfn.remove(node[i])
    }
    return node
  },

  replace (node, newnode) {
    if (newnode instanceof Function) newnode = newnode()
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
  delete ops.val
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
    core.bind = core.change = null
  }

  core.binds = new Set()
  core.bind = new Proxy((host, key, view) => {
    if (isStr(key) && key.includes(':')) [view, key] = key.split(':')
    if (isInput(host)) {
      [view, key] = [key, 'value']
      const inputUpdate = e => {
        core.change(host[key])
      }
      var inputUpdaters = ops.host.on({
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

  if (core.ops.host) core.bind(core.ops.host, core.ops.key)

  return core
}
