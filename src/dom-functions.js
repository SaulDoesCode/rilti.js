import {
  curry,
  flatten,
  run,
  queryAsync,
  isArr,
  isBool,
  isDef,
  isFunc,
  isInput,
  isMounted,
  // isNode,
  isNodeList,
  isNil,
  isNum,
  isObj,
  isStr,
  isPrimitive
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
export const vpend = (children, host, connector = 'appendChild', dfrag = frag(), noHostAppend) => {
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
    if (n instanceof window.Node || n instanceof Function) {
      continue
    } else if (isPrimitive(n)) {
      nodes[i] = new window.Text(n)
      continue
      // n = document.createRange().createContextualFragment(n).childNodes
    }

    const isnl = n instanceof window.NodeList
    if (isnl) {
      if (n.length < 2) {
        nodes[i] = n[0]
        continue
      }
      n = Array.from(n)
    } else if (isObj(n)) {
      n = Object.values(n)
    }

    if (isArr(n)) {
      if (!isnl) {
        n = prime.apply(undefined, n)
        if (n.length < 2) {
          nodes[i] = n[0]
          continue
        }
      }
      const nlen = n.length
      n.unshift(i, 1)
      nodes.splice.apply(nodes, n)
      n.slice(2, 0)
      i += nlen
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
  if (host instanceof Function) host = host()
  const nodeHost = host instanceof window.Node
  renderables = prime(renderables)
  if (nodeHost) {
    if ((connector === 'after' || connector === 'before') && !isMounted(host)) {
      once.mount(host, e => attach(host, connector, ...renderables))
    } else {
      vpend(renderables, host, connector)
    }
  } else if (isStr(host)) {
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
  node,
  host = document.body || 'body',
  connector = 'appendChild'
) => attach(host, connector, node)

export const domfn = {
  css (node, styles, prop) {
    if (isObj(styles)) {
      for (const key in styles) domfn.css(node, key, styles[key])
    } else if (isStr(styles)) {
      if (styles.indexOf('--') === 0) {
        node.style.setProperty(styles, prop)
      } else {
        node.style[styles] = prop
      }
    }
    return node
  },
  class (node, c, state) {
    if (!node.classList) return node
    if (isArr(node)) {
      for (let i = 0; i < node.length; i++) {
        domfn.class(node[i], c, state)
      }
      return node
    }
    if (isObj(c)) {
      for (const className in c) {
        domfn.class(
          node,
          className,
          isBool(c[className]) ? c[className] : undefined
        )
      }
    } else {
      if (isStr(c)) c = c.split(' ')
      if (isArr(c)) {
        const booleanState = isBool(state)
        for (var i = 0; i < c.length; i++) {
          node.classList[booleanState ? state ? 'add' : 'remove' : 'toggle'](c[i])
        }
      }
    }
    return node
  },
  hasClass: curry((node, name) => node.classList.contains(name)),
  attr (node, attr, val) {
    if (isObj(attr)) {
      for (const a in attr) {
        const present = isNil(attr[a])
        node[present ? 'removeAttribute' : 'setAttribute'](a, attr[a])
        attributeChange(node, a, undefined, attr[a], !present)
      }
    } else if (isStr(attr)) {
      const old = node.getAttribute(attr)
      if (isNil(val)) return old
      node.setAttribute(attr, val)
      attributeChange(node, attr, old, val)
    }
    return node
  },
  removeAttribute (node, ...attrs) {
    attrs = flatten(attrs)
    for (var i = 0; i < attrs.length; i++) {
      node.removeAttribute(attrs[i])
      attributeChange(node, attrs[i], undefined, undefined, false)
    }
    return node
  },
  attrToggle (node, name, state = !node.hasAttribute(name), val = node.getAttribute(name) || '') {
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
    Array.from(node.attributes).forEach(({name}) => {
      node.removeAttribute(name)
    })
    node.removeAttribute('class')
    return domfn.clear(node)
  },
  remove (node, after) {
    if (isFunc(node)) node = node()
    if (isArr(node)) return node.forEach(n => domfn.remove(n, after))
    if (isNum(after)) setTimeout(() => domfn.remove(node), after)
    else if (isMounted(node)) {
      run(() => node.remove())
    } else if (isNodeList(node)) {
      Array.from(node).forEach(n => domfn.remove(n))
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
