import * as rilti from '../../src/core.js'
import {} from './modules/range-input.js'
import {HSVaColor, parseToHSV} from './modules/colors.js'
const {component, dom} = window.rilti = rilti
const {div, section} = dom

component('color-picker', {
  create (el) {
    const stats = div.stats()
    const {state} = el
    let $color = HSVaColor.random()

    state({
      hue: $color.h,
      opacity: $color.a * 100
    })

    console.log($color)

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

      const hsla = $color.toHSLA().toString()
      ocean.handle.style.background = stats.txt = hsla
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
        binds: {
          value (v, ov) {
            $color.a = v / 100
            updateColor()
          }
        }
      })
    )

    Object.defineProperty(el(), 'color', {get: () => Object.assign({}, $color), set: updateColor})
    stats.appendTo(el)
    updateColor()
  },
  remount (el) {
    const {width} = el.getBoundingClientRect()
    el.style.left = ((el.parent.offsetWidth + width) / 2) + 'px'
  }
})
