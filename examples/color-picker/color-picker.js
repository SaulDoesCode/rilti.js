import * as rilti from '../../src/core.js'
import {} from './modules/range-input.js'
import {HSVaColor, parseToHSV} from './modules/colors.js'
const {component, dom} = window.rilti = rilti
const {div, section} = dom

component('color-picker', {
  create (el) {
    const {state} = el
    let $color = HSVaColor.random()
    state({hue: $color.h, opacity: $color.a * 100})

    const updateColor = color => {
      if (color != null) {
        if (typeof color === 'string') {
          $color = HSVaColor(...parseToHSV(color))
        } else {
          Object.assign($color, color)
        }
      }
      ocean.valueX = $color.s
      ocean.valueY = $color.v
      state.hueRange.setX($color.h)
      state.opacityRange.setX(Math.round($color.a * 100))

      ocean.style.background = `linear-gradient(to top, rgba(0, 0, 0, ${$color.a}), transparent),
        linear-gradient(to left, hsla(${$color.h}, 100%, 50%, ${$color.a}), rgba(255, 255, 255, ${$color.a}))`

      stats.txt = $color.toString()
      const {s, v, a} = $color
      const handleBorderColor = $color.clone({
        s: a < 1 ? s : 0,
        v: a < 1 ? v : s > 31 || v < 60 ? 100 : 0,
        a: 1
      })
      ocean.handle.style.borderColor = handleBorderColor.toHEX().toString()
      return $color
    }

    const ocean = state.ocean = dom['range-input'].ocean({
      $: el,
      oninput (e, {valueX, valueY}) {
        $color.s = valueX
        $color.v = valueY
        updateColor()
      }
    })

    section.controls({$: el},
      state.hueRange = dom['range-input'].hue({
        props: {limit: 360, lockY: true},
        binds: {
          value (v, ov, p, {handle}) {
            handle.style.backgroundColor = `hsl(${$color.h = v}, 100%, 50%)`
            updateColor()
          }
        }
      }),
      state.opacityRange = dom['range-input'].opacity({
        props: {lockY: true},
        binds: {
          value (v, ov) {
            $color.a = v / 100
            updateColor()
          }
        }
      })
    )

    const stats = div.stats({$: el})

    Object.defineProperty(el(), 'color', {get: () => Object.assign({}, $color), set: updateColor})
    updateColor()
  },
  remount (el) {
    const {width} = el.getBoundingClientRect()
    el.style.left = ((el.parent.offsetWidth + width) / 2) + 'px'
  }
})
