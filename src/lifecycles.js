/* global CustomEvent MutationObserver */
import {mutateSet, isComponent} from './common.js'
import {updateComponent} from './components.js'
import {attributeChange} from './directives.js'

export const Created = mutateSet(new WeakSet())
export const Mounted = mutateSet(new WeakSet())
export const Unmounted = mutateSet(new WeakSet())

const dispatch = (n, state) => {
  n.dispatchEvent(new CustomEvent(state))
}

export const CR = (n, undone = !Created(n), component = isComponent(n)) => {
  if (undone && !component) {
    Created(n, true)
    dispatch(n, 'create')
  }
}

export const MNT = (n, iscomponent = isComponent(n)) => {
  CR(n, !Created(n), iscomponent)
  if (!Mounted(n) && n.parentNode) {
    if (Unmounted(n)) {
      Unmounted(n, false)
      dispatch(n, 'remount')
      return
    }
    if (!iscomponent) Mounted(n, true)
    dispatch(n, 'mount')
  }
}

export const UNMNT = n => {
  Mounted(n, false)
  Unmounted(n, true)
  dispatch(n, 'unmount')
}

export const MountNodes = n => updateComponent(n, 'mount') || MNT(n)
export const UnmountNodes = n => updateComponent(n, 'unmount') || UNMNT(n)

new MutationObserver(muts => {
  for (const mut of muts) {
    const {addedNodes, removedNodes, attributeName} = mut
    if (addedNodes.length) {
      for (const node of addedNodes) MountNodes(node)
    }
    if (removedNodes.length) {
      for (const node of removedNodes) UnmountNodes(node)
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
