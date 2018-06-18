import {ComponentSymbol, run, queryEach, isObj, isStr} from './common.js'
import {Mounted, Unmounted, Created} from './lifecycles.js'
import {dom, assimilate} from './dom-generation.js'
import {emit} from './dom-functions.js'
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
component.plugin = plugin => {
  if (isObj(plugin)) {
    if (!component.plugins) component.plugins = {}
    for (const key in plugin) {
      if (!(key in component.plugins)) component.plugins[key] = new Set()
      component.plugins.add(plugin[key])
    }
  }
}

export const updateComponent = (el, config, stage, afterProps) => {
  if (el.nodeType !== 1 || !components.has(el.tagName)) return
  if (isStr(config)) [stage, config] = [config, components.get(el.tagName)]
  else if (!isObj(config)) config = components.get(el.tagName)

  const {
    create,
    mount,
    remount,
    unmount,
    props,
    methods,
    attr,
    state
  } = config
  const proxied = $(el)

  if (!Created(el)) {
    proxied.state = Object.assign({}, state, proxied.state)
    el[ComponentSymbol] = el.tagName

    methods && assimilate.methods(el, methods)
    props && assimilate.props(el, props)
    afterProps && assimilate.props(el, afterProps)
    Created(el, true)
    create && create.call(el, proxied)

    if (component.plugins) {
      component.plugins.config.forEach(fn => {
        fn.bind(el, config, proxied, el)
      })
      component.plugins.create.forEach(fn => {
        fn.bind(el, proxied, el)
      })
    }

    emit(el, 'create')

    isObj(config.on) && proxied.on(config.on)
    isObj(config.once) && proxied.once(config.once)

    if (isObj(attr)) {
      for (const name in attr) attributeObserver(el, name, attr[name])
    }
    remount && proxied.on.remount(remount.bind(el, proxied))
  }
  if (!Mounted(el) && stage === 'mount') {
    if (Unmounted(el)) {
      component.plugins && component.plugins.remount.forEach(fn => {
        fn.bind(el, proxied, el)
      })
      remount && remount.call(el, proxied)
      emit(el, 'remount')
    } else {
      Mounted(el, true)
      component.plugins && component.plugins.mount.forEach(fn => {
        fn.bind(el, proxied, el)
      })
      mount && mount.call(el, proxied)
      emit(el, stage)
    }
  } else if (stage === 'unmount') {
    Mounted(el, false)
    Unmounted(el, true)
    component.plugins && component.plugins.unmount.forEach(fn => {
      fn.bind(el, proxied, el)
    })
    unmount && unmount.call(el, proxied)
    emit(el, stage)
  }
  return el
}
