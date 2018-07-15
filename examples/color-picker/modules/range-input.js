import * as rilti from '../../../src/core.js'
const {dom, component, each, on, once, isNum, run} = rilti

// keep a number between a minimum and maximum ammount
const clamp = (n, min, max) => Math.min(Math.max(n, min), max)

// define element behavior
component('range-input', {
  // set up everything before element touches DOM
  create (range /* Proxy<Function => Element> */) {
    // local vars for easier logic
    let Value, ValueY

    // create element <div class="handle"> and append to <range-input>
    // also add property to range and get it as a const
    const handle = range.handle = dom.div.handle({$: range})

    // set the range limits at 0-100% by default for X and Y axis
    if (range.limit == null) range.limitX = range.limit = 100
    if (range.limit !== range.limitX) range.limitX = range.limit
    if (range.limitY == null) range.limitY = range.limit

    // set the X position by percentage/range number,
    // move the handle accordingly and change state
    range.setX = (value = range.value || 0, skipChecks) => {
      if (!skipChecks && value === Value) return
      if (value > range.limitX || value < 0) throw new Error('value out of range')

      // if the element is not in the dom
      // then wait for it to mount first
      if (!range.mounted) {
        range.once.mount(e => range.setX(value))
        return
      }

      // allow float values or round it to ints by default
      if (!range.decimals) value = Math.round(value)

      const hWidth = handle.offsetWidth
      // get pixel range
      const Min = hWidth / 2
      const Max = range.offsetWidth - Min
      // calculate pixel postion from range value
      const hLeft = (value / range.limitX) * (Max - Min)
      handle.style.left = hLeft + 'px'
      // update all the states
      Value = range.state.value = range.state.valueX = value
    }

    // same as setX but for Y axis
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
      // const hTop = (value / range.limitY) * (Max - Min)
      const hTop = (1 - value / range.limitY) * (Max - Min)
      handle.style.top = hTop + 'px'

      if (!range.decimals) value = Math.round(value)
      ValueY = range.state.valueY = value
    }

    // get the raw Element/Node and define (s/g)etters
    Object.defineProperties(range() /* -> <range-input> */, {
      value: {get: () => Value, set: range.setX},
      valueX: {get: () => Value, set: range.setX},
      valueY: {get: () => ValueY, set: range.setY}
    })

    let rWidth // range.offsetWidth
    let rHeight // range.offsetHeight
    let rRect // cache of range.getBoundingClientRect()
    // called when user moves the handle
    const move = (x = 0, y = 0) => {
      // check the the axis is not locked
      // for when you want to use range-input as a slider
      if (!range.lockX) {
        // adjust for relative position
        if (x < rRect.left) x = rRect.left
        else if (x > rRect.left + rWidth) x = rRect.left + rWidth
        x -= rRect.left

        const hWidth = handle.offsetWidth

        // get pixel range
        const min = hWidth / 2
        const max = rWidth - min

        // keep it inside the block
        const hLeft = clamp(x, min, max) - min
        handle.style.left = hLeft + 'px'

        // pixel position -> percentage/value
        let value = (hLeft * range.limitX) / (max - min)

        // round value to an int by default
        if (!range.decimals) value = Math.round(value)

        // set it if it's not the same as the old value
        if (value !== Value) {
          Value = range.state.value = range.state.valueX = value
        }
      }

      // now do below as above for Y axis
      if (!range.lockY) { // when it's not locked
        if (y < rRect.top) y = rRect.top
        else if (y > rRect.top + rWidth) y = rRect.top + rHeight
        y -= rRect.top

        const hHeight = handle.offsetHeight
        const min = hHeight / 2
        const max = range.offsetHeight - min

        const hTop = clamp(y, min, max) - min
        handle.style.top = hTop + 'px'
        // let value = (hTop * range.limitY) / (max - min)
        let value = range.limitY - (hTop * range.limitY) / (max - min)
        if (!range.decimals) value = Math.round(value)
        if (value !== ValueY) {
          ValueY = range.state.valueY = value
        }
      }

      // .dispatchEvent(new CustomEvent('input'))
      range.emit('input')
      // call an update function if it's present as a prop
      if (range.update) range.update(range, handle)
    }

    // track and manage starting, stopping and moving events
    // for .pointer(up/down/move) event types respectively.
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
    //    ^-- all the events are off at the start
    //        they get turned on when the element mounts
  },

  // when Element enters DOM set the positions
  mount (range) {
    if (!range.lockY) range.handle.style.top = 0
    range.setX()
    range.setY()
    // start listening for user interactions
    range.state.events.start.on()
  },

  // start listening again on DOM re-entry
  remount (range) {
    range.state.events.start.on()
  },

  // stop listening when removed from DOM
  unmount ({state: {events}}) { each(events, e => e.off()) },

  // track custom attribute to set some props conveniently
  attr: {
    opts (range, val) {
      run(() => // wait for DOMContentLoaded first
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
            if (prop === 'x' || prop === 'v') {
              range.setX(value, true)
            } else if (prop === 'y') {
              range.setY(value, true)
            } else {
              range[prop] = value
            }
          })
      )
    }
  }
})
