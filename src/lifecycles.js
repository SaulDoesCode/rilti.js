/* global CustomEvent MutationObserver */
import {mutateSet, isComponent} from './common.js'
import {updateComponent} from './components.js'
import {attributeChange} from './directives.js'

export const Created = mutateSet(new WeakSet())
export const Mounted = mutateSet(new WeakSet())
export const Unmounted = mutateSet(new WeakSet())

export const CR = (n, undone = !Created(n), component = isComponent(n)) => {
  if (undone && !component) {
    Created(n, true)
    n.dispatchEvent(new CustomEvent('create'))
  }
}

export const MNT = (n, iscomponent = isComponent(n)) => {
  CR(n, !Created(n), iscomponent)
  if (!Mounted(n)) {
    if (Unmounted(n)) {
      Unmounted(n, false)
      n.dispatchEvent(new CustomEvent('remount'))
    } else if (iscomponent) {
      n.dispatchEvent(new CustomEvent('mount'))
    } else {
      Mounted(n, true)
      n.dispatchEvent(new CustomEvent('mount'))
    }
  }
}

export const UNMNT = n => {
  Mounted(n, false)
  Unmounted(n, true)
  n.dispatchEvent(new CustomEvent('unmount'))
}

export const MountNodes = n => updateComponent(n, 'mount') || MNT(n)
export const UnmountNodes = n => updateComponent(n, 'unmount') || UNMNT(n)

new MutationObserver(muts => {
  for (let i = 0; i < muts.length; i++) {
    const {addedNodes, removedNodes, attributeName} = muts[i]
    if (addedNodes.length) {
      for (let x = 0; x < addedNodes.length; x++) {
        MountNodes(addedNodes[x])
      }
    }
    if (removedNodes.length) {
      for (let x = 0; x < removedNodes.length; x++) {
        UnmountNodes(removedNodes[x])
      }
    }
    if (typeof attributeName === 'string') {
      attributeChange(muts[i].target, attributeName, muts[i].oldValue)
    }
  }
})
  .observe(document,
    {attributes: true, attributeOldValue: true, childList: true, subtree: true}
  )
