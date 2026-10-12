/* global CustomEvent MutationObserver Element */
import { mutateSet } from './common.js'
import { updateComponent, components } from './components.js'
import { attributeChange, directives } from './directives.js'

export const Created = mutateSet(new WeakSet())
export const Mounted = mutateSet(new WeakSet())
export const Unmounted = mutateSet(new WeakSet())

export const dispatch = (n, state) => {
  n.dispatchEvent(new CustomEvent(state))
}

// only registered components get special treatment,
// unregistered custom-elements are treated like any other node
const isComponent = n => n.nodeType === 1 && components.has(n.tagName)

export const CR = (n, undone = !Created(n), component = isComponent(n)) => {
  if (undone && !component) {
    Created(n, true)
    dispatch(n, 'create')
  }
}

const eachChild = (n, fn) => {
  // snapshot: handlers may add/remove children while we walk
  if (n.childNodes && n.childNodes.length) {
    for (const child of Array.from(n.childNodes)) fn(child)
  }
}

export const MNT = (n, iscomponent = isComponent(n)) => {
  CR(n, !Created(n), iscomponent)
  if (Mounted(n) || !n.isConnected) return
  if (!iscomponent) Mounted(n, true)
  if (Unmounted(n)) {
    Unmounted(n, false)
    dispatch(n, 'remount')
  } else {
    dispatch(n, 'mount')
  }
  eachChild(n, MountNodes)
  if (n instanceof Element) {
    for (const attr of directives.keys()) {
      if (n.hasAttribute(attr)) attributeChange(n, attr, null, n.getAttribute(attr), true)
    }
  }
}

export const UNMNT = n => {
  if (!Mounted(n) || n.isConnected) return
  Mounted(n, false)
  Unmounted(n, true)
  dispatch(n, 'unmount')
  eachChild(n, UnmountNodes)
}

export const MountNodes = n => {
  if (updateComponent(n, 'mount')) {
    eachChild(n, MountNodes)
  } else {
    MNT(n)
  }
}

export const UnmountNodes = n => {
  if (updateComponent(n, 'unmount')) {
    eachChild(n, UnmountNodes)
  } else {
    UNMNT(n)
  }
}

if (typeof document !== 'undefined' && typeof MutationObserver !== 'undefined') {
  new MutationObserver(muts => {
    for (const mut of muts) {
      const { addedNodes, removedNodes, attributeName } = mut
      // a node moved within the document shows up as removed + added,
      // so judge by where it actually is now
      for (const node of removedNodes) {
        if (!node.isConnected) UnmountNodes(node)
      }
      for (const node of addedNodes) {
        if (node.isConnected) MountNodes(node)
      }
      if (attributeName != null) {
        attributeChange(mut.target, attributeName, mut.oldValue)
      }
    }
  }).observe(document, {
    attributes: true,
    attributeOldValue: true,
    childList: true,
    subtree: true
  })
}
