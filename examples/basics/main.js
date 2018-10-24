/* global rilti */
const { dom, databind, component, isFunc, isNode, isRenderable, isProxyNode } = rilti
const { div, button } = dom

component('card-component', {
  bind: {
    name: {
      key: 'hello:innerText',
      val: 'There',
      views: {
        hello: val => `Hello ${val}!`
      }
    },
    toggle: {
      val: false,
      change (val, { host }) {
        host.class.toggle = val
      }
    }
  },
  on: {
    mouseover (e, el) {
      el.name = (el.toggle = !el.toggle) ? 'Saul' : 'Moon moo'
    }
  }
})

{
  const { component, componentReady, dom: { h1 }, $ } = rilti

  component('counter-button', {
    bind: {
      count: {
        key: 'clicks:innerText',
        val: 0,
        views: {
          clicks: count => `clicks: ${count}`
        }
      }
    },
    on: {
      click: (e, el) => ++el.count
    }
  })

  componentReady('body > counter-button', el => {
    const tellEm = h1['tell-em'](`You just won't stop clicking huh?`)
    el.$count.on.change(count => {
      if (count > 20 && count < 40 && !tellEm.mounted) tellEm.render('body')
      else if (count > 40 && count < 100) tellEm.txt += ' Seriously? '
      else if (count > 100) tellEm.txt = 'What? You want a prize or something?'
    })
  })
}
