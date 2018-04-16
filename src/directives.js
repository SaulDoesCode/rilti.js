import {mutateSet, run, queryEach} from './common.js'
import {emit} from './dom-functions.js'
import $ from './proxy-node.js'

const Initiated = new Map()
const beenInitiated = (attrName, el) => (
  Initiated.has(attrName) && Initiated.get(attrName)(el)
)

export const attributeObserver = (el, attrName, opts) => {
  el = $(el)
  const {init, update, remove} = opts
  const intialize = (present, value) => {
    if (present && !beenInitiated(attrName, el)) {
      if (init) {
        init(el, value)
      }
      if (!Initiated.has(attrName)) {
        Initiated.set(attrName, mutateSet(new WeakSet()))
      }
      Initiated.get(attrName)(el, true)
      return true
    }
    return beenInitiated(attrName, el)
  }
  let removedBefore = false
  let old = el.getAttribute(attrName)
  intialize(el.hasAttribute(attrName), old)
  const stop = el.on.attr(({detail: {name, value, oldvalue, present}}) => {
    if (
      attrName === name &&
      old !== value &&
      value !== oldvalue &&
      intialize(present, value)
    ) {
      if (present) {
        if (update) {
          update(el, value, old)
        }
        removedBefore = false
      } else if (!removedBefore) {
        if (remove) {
          remove(el, value, old)
        }
        removedBefore = true
      }
      old = value
    }
  }).off
  return () => {
    stop()
    if (Initiated.has(attrName)) {
      Initiated.get(attrName)(el, false)
    }
  }
}

export const directives = new Map()
export const directive = (name, {init, update, remove, accessors, toggle}) => {
  const directive = new Map()
  directive.init = el => {
    if (!beenInitiated(name, el)) {
      directive.set(
        el,
        attributeObserver(el, name, {init, update, remove})
      )
    }
  }
  directive.stop = el => {
    if (directive.has(el)) {
      directive.get(el)()
    }
  }
  directives.set(name, directive)
  run(() => {
    queryEach('[' + name + ']', n => {
      attributeChange(n, name)
    })
  })
}

export const attributeChange = (el, name, oldvalue, value = el.getAttribute(name), present = el.hasAttribute(name)) => {
  if (directives.has(name)) {
    directives.get(name).init($(el))
  }
  emit(el, 'attr', {name, value, oldvalue, present})
}
