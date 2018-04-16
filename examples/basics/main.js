import * as rilti from '../../src/core.js'
window.rilti = rilti

const {$, dom, isFunc, isNode, isRenderable, isProxyNode} = rilti
const {div} = rilti.dom

const b = document.createElement('div')

console.log(b, $(b), $(b))

const el = document.createElement('div')
el.className = 'card'
el.textContent = 'See me?'

const $el = $(el)
console.log('$el() === el', $el() === el)

if ($(el).class.card) {
  $(el).attr({foo: 'bar'})
  console.log(el.getAttribute('foo'))
}

console.log(`isRenderable($el) === ${isRenderable($el)} && isProxyNode($el) === ${isProxyNode($el)}`)
