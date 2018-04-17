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
    }
  }
  return binder
}

export const state = ({val, pre, prescreen, type, screen, pass, fail, views, binds}) => {
  const Binds = binder()

  const bind = (host, key, viewName) => {
    const viewBound = isStr(viewName)
    if (viewBound && !(viewName in view)) {
      throw new Error('state.bind: cannot create bind to undefined view')
    }
    let bind
    if (isFunc(key)) {
      bind = viewBound ? () => key(host, view[viewName]) : () => key(host, view())
    } else {
      bind = viewBound ? () => { host[key] = view[viewName] } : () => { host[key] = view() }
    }
    Binds.set(host, key, bind)
    return {
      revoke () {
        Binds.delete(host, key)
      }
    }
  }

  const view = () => val

  if (isObj(views)) {
    for (let key in views) {
      if (isFunc(views[key])) {
        Object.defineProperty(view, key, {get: () => views[key](val)})
      }
    }
  }

  if (isArr(binds)) {
    binds.forEach(([host, key, viewName]) => {
      bind(host, key, viewName)
    })
    Binds.update()
  }

  if (screen !== undefined && isRegExp(screen)) {
    const regexp = screen
    screen = val => isStr(val) && regexp.test(val)
  }

  const mutate = newval => {
    if (isFunc(newval)) {
      newval = newval(val)
    }

    if (newval === undefined) {
      throw new Error('state.mutate: cannot create mutation from undefined')
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
    mutate,
    view: Object.freeze(view)
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
