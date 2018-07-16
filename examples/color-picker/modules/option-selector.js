import * as rilti from '../../../src/core.js'
const {dom, component, $} = rilti

component('option-selector', {
  mount (os) {
    os.active = os.findOne('os-item.active')
    if (!os.active) {
      try {
        (os.active = os.findOne('os-item')).class.active = true
      } catch (e) {
        throw new Error('option-selector: must contain os-item(s) to select')
      }
    }
    os.on.click(({target}) => {
      if (
        target != null &&
        (target = $(target)).matches('os-item') &&
        target !== os.active
      ) {
        if (os.active) (os.lastActive = os.active).class.active = false
        target.class.active = true
        os.active = target
      }
    })
  },
  props: {
    accessors: {
      label: {
        get: os => os.attr.label || '',
        set (os, val) { os.attr.label = val }
      },
      selected: {
        get: os => os.active && os.active.txt
      }
    }
  },
  attr: {
    label (os, val) {
      if (!os.lbl) os.lbl = dom.label().prependTo(os)
      os.lbl.txt = val.trim()
    }
  }
})

component('os-item', {
  create (os) {

  }
})
