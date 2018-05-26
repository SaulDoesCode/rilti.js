import {
  curry,
  run,
  queryAsync,
  isArr,
  isDef,
  isFunc,
  isInput,
  isMounted,
  isNodeList,
  isNum,
  isProxyNode
} from './common.js'
import {once} from './event-manager.js'
import {frag} from './dom-generation.js'
import {MNT} from './lifecycles.js'
import {attributeChange} from './directives.js'

export const emit = (node, type, detail) => {
  node.dispatchEvent(new window.CustomEvent(type, {detail}))
  return node
}

// vpend - virtual append, add nodes and get them as a document fragment
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
      if ((child = child(host)) === host) {
        continue
      } else if (child instanceof Function) {
        let lvl = 0
        let ishost = false
        while (child instanceof Function && lvl < 25) {
          child = child()
          if ((ishost = child === host)) break
          lvl++
        }
        if (ishost) continue
      }
    }
    if (typeof child === 'string') {
      if (!child.length) continue
      child = new window.Text(child)
    } else if (isArr(child)) {
      child = vpend(child, host, connector, dfrag, true)
    }
    if (child instanceof window.Node) {
      dfrag.appendChild(child)
      children[i] = child
    }
  }
  if (host && !noHostAppend) {
    run(() => {
      host[connector](dfrag)
      for (let i = 0; i < children.length; i++) {
        children[i] && children[i].dispatchEvent && MNT(children[i])
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
    if (n == null || typeof n === 'boolean') {
      nodes.splice(i, 1)
      continue
    }
    if (n instanceof window.Node || n instanceof Function) {
      continue
    } else if (typeof n === 'string' || typeof n === 'number') {
      const nextI = i + 1
      if (nextI < nodes.length) {
        const next = nodes[nextI]
        if (typeof next === 'string' || typeof next === 'number') {
          nodes[i] = new window.Text(String(n) + String(next))
          nodes.splice(nextI, 1)
          i--
        } else {
          nodes[i] = new window.Text(String(n))
        }
      }
      continue
    }

    const isnl = n instanceof window.NodeList
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
        n = prime.apply(undefined, n)
        if (n.length < 2) {
          nodes[i] = n[0]
          i--
          continue
        }
      }
      nodes.splice(i, 1, ...n)
      i--
    } else if (isDef(n)) {
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
  const nodeHost = host instanceof window.Node || isProxyNode(host)
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
  return renderables.length < 2 ? renderables[0] : renderables
}

/*
* render attaches a node to another
*
*/
export const render = (
  node, host = document.body || 'body', connector = 'appendChild'
) => attach(host, connector, node)

export const domfn = {
  css (node, styles, prop) {
    if (styles.constructor === Object) {
      for (const key in styles) domfn.css(node, key, styles[key])
    } else if (typeof styles === 'string') {
      if (styles[0] === '-') {
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
        const boolState = typeof state === 'boolean'
        for (let i = 0; i < c.length; i++) {
          node.classList[boolState ? state ? 'add' : 'remove' : 'toggle'](c[i])
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
        attributeChange(node, a, undefined, attr[a], !present)
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
      attributeChange(node, attrs[0], undefined, undefined, false)
    } else {
      for (let i = 0; i < attrs.length; i++) {
        if (isArr(attrs[i])) {
          attrs.splice(i, 1, ...attrs[i])
          i--
        }
        node.removeAttribute(attrs[i])
        attributeChange(node, attrs[i], undefined, undefined, false)
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
    for (let i = 0; i < node.attributes.length; i++) {
      node.removeAttribute(node.attributes[i].name)
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
    if (isFunc(newnode)) newnode = newnode()
    run(() => node.replaceWith(newnode))
    return newnode
  }
}
domfn.empty = domfn.clear
