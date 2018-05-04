const {dom, component, isFunc, isNode, isRenderable, isProxyNode} = rilti
const {div, button} = rilti.dom

component('card-component', {

})


var cc = dom['card-component']({
  $: 'body',
  state: {name: 'Saul'}
},
  ({state}) => state`Hello ${'name'}!`
)

button({
  $: 'body',
  state: {count: 0},
  onclick: (e, {state}) => ++state.count
},
  ({state}) => state`clicks: ${'count'}`
)
