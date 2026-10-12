import { run, queryEach, isObj, isStr, isFunc, isInput, mutateSet } from './common.js'
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

component.plugins = null
component.plugin = plugin => {
  if (isObj(plugin)) {
    if (!component.plugins) component.plugins = Object.create(null)
    for (const key in plugin) {
      if (!(key in component.plugins)) component.plugins[key] = new Set()
      component.plugins[key].add(plugin[key])
    }
  }
}

const runPlugins = (stage, el, ...args) => {
  const set = component.plugins && component.plugins[stage]
  if (set) for (const fn of set) fn.call(el, ...args)
}

// component lifecycle state, kept apart from plain node state
// so a component registered after its elements exist still initializes
const Initialized = mutateSet(new WeakSet())
const CMounted = mutateSet(new WeakSet())
const CUnmounted = mutateSet(new WeakSet())

export const updateComponent = function (el, config, stage, afterProps) {
  if (!el || el.nodeType !== 1 || !components.has(el.tagName)) return
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

  if (!Initialized(el)) {
    Initialized(el, true)
    if (bind) {
      const isinput = isInput(el)
      for (const key in bind) {
        // copy: the config is shared between every instance
        const b = databind({ ...bind[key], host: proxied, isinput })
        Object.defineProperty(el, key, { get () { return b.val }, set: b.change, configurable: true })
        Object.defineProperty(el, '$' + key, { value: b, configurable: true })
      }
    }

    if (methods) assimilate.methods(el, methods)
    if (props) assimilate.props(el, props)
    if (afterProps) assimilate.props(el, afterProps)
    Created(el, true)
    if (create) create.call(el, proxied)

    runPlugins('config', el, config, proxied, el)
    runPlugins('create', el, proxied, el)

    dispatch(el, 'create')

    if (isObj(config.on)) proxied.on(config.on)
    if (isObj(config.once)) proxied.once(config.once)

    if (isObj(attr)) {
      el[ObservedAttrsSymbol] = Object.create(null)
      for (const name in attr) {
        el[ObservedAttrsSymbol][name] = attributeObserver(el, name, attr[name])
      }
    }

    el.componentReady = true
    dispatch(el, 'componentReady')
  }

  if (stage === 'unmount') {
    if (CMounted(el) && !el.isConnected) {
      CMounted(el, false)
      CUnmounted(el, true)
      Mounted(el, false)
      Unmounted(el, true)
      runPlugins('unmount', el, proxied, el)
      for (const name in el[ObservedAttrsSymbol]) {
        el[ObservedAttrsSymbol][name].stop()
      }
      if (unmount) unmount.call(el, proxied)
      dispatch(el, 'unmount')
    }
  } else if (!CMounted(el) && el.isConnected) {
    CMounted(el, true)
    Mounted(el, true)
    if (CUnmounted(el)) {
      CUnmounted(el, false)
      Unmounted(el, false)
      runPlugins('remount', el, proxied, el)
      for (const name in el[ObservedAttrsSymbol]) {
        el[ObservedAttrsSymbol][name].start()
      }
      if (remount) remount.call(el, proxied)
      dispatch(el, 'remount')
    } else {
      runPlugins('mount', el, proxied, el)
      if (mount) mount.call(el, proxied)
      dispatch(el, 'mount')
    }
  }
  return el
}

export const componentReady = (el, fn) => new Promise(resolve => run(() => {
  el = $(el)
  if (el.componentReady) {
    resolve(el)
    if (fn) fn(el)
    return
  }
  el.once.componentReady(e => {
    resolve(el)
    if (fn) fn(el)
  })
}))
