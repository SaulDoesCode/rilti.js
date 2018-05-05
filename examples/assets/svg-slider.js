/* global rilti */
const {dom, svg, on} = rilti
const {circle, polygon} = svg

const handle = circle({
  attr: {
    cx: '114',
    cy: '100',
    r: '40',
    'stroke-width': '4',
    fill: '#fff'
  }
})

svg({
  $: 'body',
  onmousemove: ({clientX: cx, clientY: cy}) => handle.attr({cx, cy})
},
  circle({
    attr: {
      cx: '0',
      cy: '0',
      r: '55',
      'stroke-width': '55',
      fill: '#ccefef'
    }
  }),
  polygon({
    attr: {
      points: '220,140 276,130 470,250 213,354',
      fill: 'lime'
    }
  }),
  handle
)
