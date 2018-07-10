import {dom, component, on, once, each, isNum} from '../../../src/core.js'

export const clamp = (n, min, max) => Math.min(Math.max(n, min), max)

export const rangeInput = component('range-input', {
  create (range) {
    range.state({value: 0, valueX: 0, valueY: 0})
    const handle = range.handle = dom.div.handle({$: range})

    if (range.limit == null) range.limitX = range.limit = 100
    if (range.limit !== range.limitX) range.limitX = range.limit
    if (range.limitY == null) range.limitY = range.limit
    if (range.lockY == null) range.lockY = true

    range.setX = (value = range.value || 0, skipChecks) => {
      if (!skipChecks && value === Value) return
      if (value > range.limitX || value < 0) throw new Error('value out of range')
      if (!range.mounted) {
        range.once.mount(e => range.setX(value))
        return
      }
      if (!range.decimals) value = Math.round(value)

      const hWidth = handle.offsetWidth
      const Min = hWidth / 2
      const Max = range.offsetWidth - Min
      const hLeft = (value / range.limitX) * (Max - Min)
      handle.style.left = hLeft + 'px'

      Value = range.state.value = range.state.valueX = value
    }

    range.setY = (value = range.valueY || 0, skipChecks) => {
      if (!skipChecks && value === Value) return
      if (value > range.limitY || value < 0) throw new Error('value out of range')
      if (!range.mounted) {
        range.once.mount(e => range.setY(value))
        return
      }
      const hHeight = handle.offsetHeight
      const Min = hHeight / 2
      const Max = range.offsetHeight - Min
      const hTop = (value / range.limitY) * (Max - Min)
      handle.style.top = hTop + 'px'

      if (!range.decimals) value = Math.round(value)
      ValueY = range.state.valueY = value
    }

    let Value, ValueY

    Object.defineProperties(range(), {
      value: {get: () => Value, set: range.setX},
      valueX: {get: () => Value, set: range.setX},
      valueY: {get: () => ValueY, set: range.setY}
    })

    let rWidth
    let rHeight
    let rRect
    const move = (x = 0, y = 0) => {
      if (!range.lockX) {
        if (x < rRect.left) x = rRect.left
        else if (x > rRect.left + rWidth) x = rRect.left + rWidth
        x -= rRect.left

        const hWidth = handle.offsetWidth
        const min = hWidth / 2
        const max = rWidth - min

        const hLeft = clamp(x, min, max) - min
        handle.style.left = hLeft + 'px'

        // percentage or range value
        let value = (hLeft * range.limitX) / (max - min)
        if (!range.decimals) value = Math.round(value)
        if (value !== Value) {
          Value = range.state.value = range.state.valueX = value
        }
      }

      if (!range.lockY) {
        if (y < rRect.top) y = rRect.top
        else if (y > rRect.top + rWidth) y = rRect.top + rHeight
        y -= rRect.top

        const hHeight = handle.offsetHeight
        const min = hHeight / 2
        const max = range.offsetHeight - min

        const hTop = clamp(y, min, max) - min
        handle.style.top = hTop + 'px'
        let value = (hTop * range.limitY) / (max - min)
        if (!range.decimals) value = Math.round(value)
        if (value !== ValueY) {
          ValueY = range.state.valueY = value
        }
      }

      range.dispatchEvent(new window.CustomEvent('input'))
      if (range.update) range.update(range, handle)
    }

    const events = range.state.events = {
      move: on.pointermove(document, e => move(e.x, e.y)).off(),
      stop: on.pointerup(document, () => {
        events.move.off()
        events.start.on()
      }).off(),
      start: once.pointerdown([range, handle], () => {
        [rWidth, rHeight] = [range.offsetWidth, range.offsetHeight]
        rRect = range.getBoundingClientRect()
        events.move.on()
        events.stop.on()
      }).off()
    }
  },
  mount (range) {
    if (!range.lockY) range.handle.style.top = 0
    range.setX(); range.setY()
    range.state.events.start.on()
  },
  remount (range) {
    range.state.events.start.on()
  },
  unmount ({state: {events}}) { each(events, e => e.off()) },
  attr: {
    opts (range, val) {
      val.split(';')
        .filter(v => v != null && v.length)
        .map(pair => pair.trim().split(':').map(part => part.trim()))
        .forEach(([prop, value]) => {
          if (value.toLowerCase() === 'true') value = true
          else if (value.toLowerCase() === 'false') value = false
          else {
            const temp = Number(value)
            if (isNum(temp)) value = temp
          }
          if (prop === 'x' || prop === 'v') prop = 'valueX'
          else if (prop === 'y') prop = 'valueY'
          range[prop] = value
        })
    }
  }
})
