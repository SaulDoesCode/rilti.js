const {dom, component, isFunc, isNode, isRenderable, isProxyNode} = rilti
const {div, button} = rilti.dom

component('card-component', {
  state: {name: 'Saul'},
  create (el) {
    el.html = el.state`Hello ${'name'}!`
  }
})

component('counter-button', {
  state: {count: 0},
  on: {
    click: (e, {state}) => ++state.count
  },
  create (el) {
    el.css = {
      position: 'relative',
      display: 'block',
      margin: '5px',
      padding: '5px 10px'
    }
    el.html = el.state`clicks: ${'count'}`
  }
})
