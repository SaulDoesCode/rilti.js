import {isArr, isFunc, isObj, isPromise, isStr, isRegExp} from './common.js'
// import emitter from './emitter.js'

const binder = () => {
  const binder = {
    binds: new Map(),
    bound: new Set(),
    get (host, key) {
      if (binder.binds.has(host)) {
        return binder.binds.get(host).get(key)
      }
    },
    set (host, key, bind) {
      if (!binder.binds.has(host)) {
        binder.binds.set(host, new Map())
      }
      binder.bound.add(bind)
      binder.binds.get(host).set(key, bind)
    },
    delete (host, key) {
      if (binder.binds.has(host)) {
        binder.bound.delete(binder.binds.get(host).get(key))
        binder.binds.get(host).delete(key)
        if (!binder.binds.get(host).size) {
          binder.binds.delete(host)
        }
      }
    },
    update () {
      binder.bound.forEach(bind => bind())
    },
    clear () {
      binder.bound.forEach(bind => bind.revoke())
      binder.bound.clear()
      binder.binds.forEach(hostmap => hostmap.clear())
      binder.clear()
    }
  }
  return binder
}

export const state = ({val, pre, prescreen, screen, pass, fail, views, binds, revoked}) => {
  const Binds = binder()
  let isRevoked = false

  const bind = (host, key, viewName, revoke) => {
    const viewBound = isStr(viewName)
    if (viewBound && !(viewName in view)) {
      throw new Error('state.bind: cannot create bind to undefined view')
    }
    let bind
    if (isFunc(key)) {
      bind = viewBound ? () => key(host, view[viewName]) : () => key(host, val)
    } else {
      bind = viewBound ? () => { host[key] = view[viewName] } : () => { host[key] = val }
    }
    bind.revoke = () => {
      Binds.delete(host, key)
      revoke()
    }
    Binds.set(host, key, bind)
    return bind
  }

  bind.input = input => {
    const bind = () => { input.value = val }
    const onchange = e => { mutate(input.value.trim()) }
    input.addEventListener('input', onchange)
    bind.revoke = () => {
      input.removeEventListener('input', onchange)
      Binds.delete(input, 'value')
    }
    bind.reinstate = () => {
      bind.revoke()
      Binds.set(input, 'value', bind)
      input.addEventListener('input', onchange)
    }
    Binds.set(input, 'value', bind)
    return bind
  }

  const view = () => val
  const createView = (key, fn) => {
    if (!isFunc(fn)) throw new TypeError('a view should be a function')
    Object.defineProperty(view, key, { get: () => fn(val) })
  }

  if (isObj(views)) {
    for (const key in views) createView(key, views[key])
  }

  if (isArr(binds)) {
    binds.forEach(b => {
      isArr(b) ? bind(...b) : isObj(b) && bind(b.host, b.prop, b.viewName)
    })
    Binds.update()
  }

  if (screen !== undefined && isRegExp(screen)) {
    const regexp = screen
    screen = val => isStr(val) && regexp.test(val)
  }

  const mutate = newval => {
    if (isRevoked || newval === val) return
    if (isFunc(newval)) newval = newval(val)

    if (newval === undefined) {
      throw new Error('state.mutate: cannot create mutation from undefined')
    } else if (isFunc(newval)) {
      throw new TypeError('state: cannot accept function values')
    }

    if (isPromise(newval)) {
      return newval.then(nv => mutate(nv), err => fail(newval, err))
    }

    if (pre) {
      if (prescreen || !prescreen(newval, val)) {
        fail(newval, new Error('failed prescreen'))
      } else {
        newval = pre(newval, val)
      }
    }

    if (screen && !screen(newval, val)) {
      if (fail) fail(newval, new Error('failed screening'))
    } else {
      val = newval
      Binds.update()
      if (pass) pass(val)
    }
  }

  const manager = {
    bind,
    view,
    createView,
    mutate,
    binds: Binds,
    revoke () {
      Binds.clear()
      isRevoked = true
      revoked()
    }
  }

  return Object.freeze(manager)
}
/*

export const stateCollection = model => {
  if (!isObj(model)) {
    throw new Error('stateCollection needs a model object')
  }

  for (let key in model) {
    if (isObj(model[key])) {
      model[key] = state(model[key])
    }
  }

  return model
}

*/
