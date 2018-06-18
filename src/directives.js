import {mutateSet, run, queryEach} from './common.js'
import {emit} from './dom-functions.js'
import $ from './proxy-node.js'

const Initiated = new Map()
const beenInitiated = (name, el) => (
  Initiated.has(name) && Initiated.get(name)(el)
)

export const attributeObserver = (el, name, opts) => {
  el = $(el)
  const {init, update, remove} = opts
  const intialize = (present, value) => {
    if (present && !beenInitiated(name, el)) {
      if (init) init(el, value)
      if (!Initiated.has(name)) {
        Initiated.set(name, mutateSet(new WeakSet()))
      }
      Initiated.get(name)(el, true)
      return true
    }
    return beenInitiated(name, el)
  }
  let removedBefore = false
  let old = el.getAttribute(name)
  intialize(el.hasAttribute(name), old)
  const stop = el.on.attr(({
    detail: {name: attrName, value, oldvalue, present}
  }) => {
    if (
      attrName === name &&
      old !== value &&
      value !== oldvalue &&
      intialize(present, value)
    ) {
      if (present) {
        if (update) update(el, value, old)
        removedBefore = false
      } else if (!removedBefore) {
        if (remove) remove(el, value, old)
        removedBefore = true
      }
      old = value
    }
  }).off
  return () => {
    stop()
    if (Initiated.has(name)) Initiated.get(name)(el, false)
  }
}

export const directives = new Map()
export const directive = (name, opts) => {
  const directive = new Map()
  directive.init = el => {
    if (!beenInitiated(name, el)) {
      directive.set(el, attributeObserver(el, name, opts))
    }
  }
  directive.stop = el => {
    if (directive.has(el)) directive.get(el)()
  }
  directives.set(name, directive)
  run(() => queryEach('[' + name + ']', n => attributeChange(n, name)))
  return directive
}

export const attributeChange = (
  el,
  name,
  oldvalue,
  value = el.getAttribute(name),
  present = el.hasAttribute(name)
) => {
  if (directives.has(name)) directives.get(name).init($(el))
  emit(el, 'attr', {name, value, oldvalue, present})
}
