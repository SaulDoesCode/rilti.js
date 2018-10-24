import { run, queryEach, isObj, isStr, isFunc, isMounted, isInput } from './common.js'
import { Mounted, Unmounted, Created, dispatch } from './lifecycles.js'
import { dom, assimilate } from './dom-generation.js'
import { databind } from './dom-functions.js'
import { $ } from './proxy-node.js'
import { attributeObserver } from './directives.js'

export const ObservedAttrsSymbol = Symbol('observed-attrs')
export const components = new Map()
export const component = (tagName, config) => {
  if (isFunc(config)) config = config()
  if (!tagName.includes('-')) {
    throw new Error(`component: ${tagName} tagName is un-hyphenated`)
  }
  components.set(tagName.toUpperCase(), config)
  run(() => queryEach(tagName, el => updateComponent(el)))
  queryEach(tagName, el => updateComponent(el))
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

export const updateComponent = function (el, config, stage, afterProps) {
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
    bind,
    attr
  } = config
  const proxied = $(el)

  if (!Created(el)) {
    if (bind) {
      const isinput = isInput(el)
      for (const key in bind) {
        bind[key].host = proxied
        bind[key].isinput = isinput
        const b = databind(bind[key])
        Object.defineProperty(el, key, { get () { return b.val }, set: b.change })
        Object.defineProperty(el, '$' + key, { value: b })
      }
    }

    if (methods) assimilate.methods(el, methods)
    if (props) assimilate.props(el, props)
    if (afterProps) assimilate.props(el, afterProps)
    Created(el, true)
    if (create) create.call(el, proxied)

    if (component.plugins) {
      component.plugins.config.forEach(fn => {
        fn.bind(el, config, proxied, el)
      })
      component.plugins.create.forEach(fn => {
        fn.bind(el, proxied, el)
      })
    }

    dispatch(el, 'create')

    if (isObj(config.on)) proxied.on(config.on)
    if (isObj(config.once)) proxied.once(config.once)

    if (isObj(attr)) {
      el[ObservedAttrsSymbol] = Object.create(null)
      for (const name in attr) {
        el[ObservedAttrsSymbol][name] = attributeObserver(el, name, attr[name])
      }
    }
    if (remount) proxied.on.remount(remount.bind(el, proxied))

    el.componentReady = true
    dispatch(el, 'componentReady')
  }

  if (!Mounted(el) && (stage === 'mount' || isMounted(el))) {
    if (Unmounted(el)) {
      component.plugins && component.plugins.remount.forEach(fn => {
        fn.bind(el, proxied, el)
      })
      for (const name in el[ObservedAttrsSymbol]) {
        el[ObservedAttrsSymbol][name].start()
      }
      if (remount) remount.call(el, proxied)
      dispatch(el, 'remount')
    } else {
      Mounted(el, true)
      component.plugins && component.plugins.mount.forEach(fn => {
        fn.bind(el, proxied, el)
      })
      if (mount) mount.call(el, proxied)
      dispatch(el, 'mount')
    }
  } else if (stage === 'unmount') {
    Mounted(el, false)
    Unmounted(el, true)
    component.plugins && component.plugins.unmount.forEach(fn => {
      fn.bind(el, proxied, el)
    })
    for (const name in el[ObservedAttrsSymbol]) {
      el[ObservedAttrsSymbol][name].stop()
    }
    if (unmount) unmount.call(el, proxied)
    dispatch(el, stage)
  }
  return el
}

export const componentReady = (el, fn) => run(() => {
  el = $(el)
  if (el.componentReady) return fn(el)
  el.once.componentReady(e => fn(el))
})
