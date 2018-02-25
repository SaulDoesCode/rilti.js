/* global rilti */

rilti.debounce = (fn, wait = 0) => {
  let bounce
  return function () {
    clearTimeout(bounce)
    bounce = setTimeout(fn.bind(this), wait, ...arguments)
  }
}

rilti.throttle = (fn, wait) => {
  let throttling
  let lastFn
  let lastTime
  return function () {
    const ctx = this
    const args = arguments
    if (!throttling) {
      fn.apply(ctx, args)
      lastTime = Date.now()
      throttling = true
    } else {
      clearTimeout(lastFn)
      lastFn = setTimeout(() => {
        if (Date.now() - lastTime >= wait) {
          fn.apply(ctx, args)
          lastTime = Date.now()
        }
      }, wait - (Date.now() - lastTime))
    }
  }
}
