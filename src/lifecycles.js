import {mutateSet, isComponent} from './common.js'
import {updateComponent} from './components.js'
import {emit} from './dom-functions.js'
import {attributeChange} from './directives.js'

export const Created = mutateSet(new WeakSet())
export const Mounted = mutateSet(new WeakSet())
export const Unmounted = mutateSet(new WeakSet())

export const CR = (n, undone = !Created(n), component = isComponent(n)) => {
  if (undone && !component) {
    Created(n, true)
    emit(n, 'create')
  }
}

export const MNT = n => {
  const iscomponent = isComponent(n)
  CR(n, !Created(n), iscomponent)
  if (!Mounted(n)) {
    if (Unmounted(n)) {
      Unmounted(n, false)
      emit(n, 'remount')
    } else if (iscomponent) {
      updateComponent(n, 'mount')
    } else {
      Mounted(n, true)
      emit(n, 'mount')
    }
  }
}

export const UNMNT = n => {
  Mounted(n, false)
  Unmounted(n, true)
  emit(n, 'unmount')
}

export const MountNodes = n => updateComponent(n, 'mount') || MNT(n)
export const UnmountNodes = n => updateComponent(n, 'unmount') || UNMNT(n)

new window.MutationObserver(muts => {
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
    typeof attributeName === 'string' && attributeChange(muts[i].target, attributeName, muts[i].oldValue)
  }
}).observe(
  document,
  {attributes: true, attributeOldValue: true, childList: true, subtree: true}
)
