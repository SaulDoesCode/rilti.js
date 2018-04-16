import {ComponentSymbol, run, queryEach, isObj, isStr} from './common.js'
import {Mounted, Unmounted, Created} from './lifecycles.js'
import {dom, assimilate} from './dom-generation.js'
import {emit} from './dom-functions.js'
import {on} from './event-manager.js'
import {$} from './proxy-node.js'
import {attributeObserver} from './directives.js'

export const components = new Map()
export const component = (tagName, config) => {
  if (tagName.indexOf('-') === -1) {
    throw new Error(`component: ${tagName} tagName is un-hyphenated`)
  }
  components.set(tagName.toUpperCase(), config)
  run(() => queryEach(tagName, updateComponent))
  return dom[tagName]
}

export const updateComponent = (el, config, stage, afterProps) => {
  if (el.nodeType !== 1 || !components.has(el.tagName)) return
  if (isStr(config)) [stage, config] = [config, components.get(el.tagName)]
  else if (!isObj(config)) config = components.get(el.tagName)

  const {create, mount, remount, unmount, props, methods, attr} = config
  const proxied = $(el)

  if (!Created(el)) {
    el[ComponentSymbol] = el.tagName
    methods && assimilate.methods(el, methods)
    props && assimilate.props(el, props)
    afterProps && assimilate.props(el, afterProps)
    Created(el, true)
    create && create.call(el, proxied)
    emit(el, 'create')
    if (isObj(attr)) {
      for (const name in attr) attributeObserver(el, name, attr[name])
    }
    remount && on.remount(el, remount.bind(el, proxied))
  }
  if (!Mounted(el) && stage === 'mount') {
    if (Unmounted(el)) {
      remount && remount.call(el, proxied)
      emit(el, 'remount')
    } else {
      Mounted(el, true)
      mount && mount.call(el, proxied)
      emit(el, stage)
    }
  } else if (stage === 'unmount') {
    Mounted(el, false)
    Unmounted(el, true)
    unmount && unmount.call(el, proxied)
    emit(el, stage)
  }
  return el
}
