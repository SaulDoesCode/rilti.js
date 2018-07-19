import {mutateSet, run, queryEach} from './common.js'
import {emit} from './dom-functions.js'
import $ from './proxy-node.js'

/* const watched = Object.create(null)
const watch = (name, opts) => {
  if (opts == null) throw new TypeError(`attr.watch: useless watcher opts == null`)
  watched[name] = opts = Object.assign(Object.create(null), opts)
}
watch.update = (name, el, value = el.getAttribute(name)) => {}
*/

const Initiated = new Map()
const beenInitiated = (name, el) =>
  Initiated.has(name) && Initiated.get(name)(el)

export const attributeObserver = (el, name, opts) => {
  el = $(el)
  let {init, update, remove} = opts
  if (!init && !update && opts instanceof Function) {
    [init, update] = [opts, opts]
  }
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
  })

  const manager = () => {
    stop()
    if (Initiated.has(name)) Initiated.get(name)(el, false)
  }
  manager.start = () => {
    stop.on()
    Initiated.get(name)(el, true)
  }
  return (manager.stop = manager)
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
  if (value !== oldvalue) {
    emit(el, 'attr', {name, value, oldvalue, present})
  }
}
