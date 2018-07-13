import {component, dom} from '../../src/core.js'
import {} from './modules/range-input.js'
import {HSVaColor, parseToHSV} from './modules/colors.js'

const {div, section} = dom

component('color-picker', {
  create (el) {
    const {state} = el
    state({hue: 0, opacity: 100})

    let $color = HSVaColor.random()
    console.log($color)
    const stats = div.stats()

    const updateColor = color => {
      if (color != null) {
        if (typeof color === 'string') {
          $color = HSVaColor(...parseToHSV(color))
        } else {
          Object.assign($color, color)
        }
        ocean.valueX = $color.s
        ocean.valueY = $color.v
        state.hueRange.value = $color.h
        state.opacityRange.value = Math.round($color.a * 100)
      }

      /*
      ocean.style.background = `linear-gradient(to top, rgba(0, 0, 0, ${$color.a}), transparent),
        linear-gradient(to left, hsla(${$color.h}, 100%, 50%, ${$color.a}), rgba(255, 255, 255, ${$color.a}))`
      */

      ocean.style.background = `linear-gradient(to bottom, rgba(0, 0, 0, ${$color.a}), transparent),
        linear-gradient(to left, hsla(${$color.h}, 100%, 50%, ${$color.a}), rgba(255, 255, 255, ${$color.a}))`
      ocean.handle.style.background = $color.toHSLA().toString()
      stats.txt = $color.toHSLA().toString()
      return $color
    }

    const ocean = state.ocean = dom['range-input'].ocean({
      $: el,
      props: {lockY: false},
      oninput (e, {valueX, valueY}) {
        $color.s = valueX
        $color.v = valueY
        updateColor()
      }
    })

    section.controls({$: el},
      state.hueRange = dom['range-input'].hue({
        props: {limit: 360},
        binds: {
          value (v, ov, p, {handle}) {
            handle.style.backgroundColor = `hsl(${$color.h = v}, 100%, 50%)`
            updateColor()
          }
        }
      }),
      state.opacityRange = dom['range-input'].opacity({
        props: {value: 100},
        binds: {
          value (v, ov) {
            $color.a = v / 100
            updateColor()
          }
        }
      })
    )

    stats.appendTo(el)
    updateColor($color)
    Object.defineProperty(el(), 'color', {get: () => Object.assign({}, $color), set: updateColor})
  },
  remount (el) {
    console.log('mount', el)
    const {width} = el.getBoundingClientRect()
    el.style.left = ((el.parent.offsetWidth + width) / 2) + 'px'
  },
  destroy ({state: {movable}}) {
    movable.revoke()
  }
})
