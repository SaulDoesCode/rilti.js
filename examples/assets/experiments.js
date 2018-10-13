/* global rilti performance localStorage location */
/*
const COUNT = 10000
const stats = JSON.parse(localStorage.getItem('stats') || `{"count": ${COUNT}, "dom": [], "fastdom": []}`)
const updateStats = (mode, ms) => {
  stats[mode].push(ms)
  localStorage.setItem('stats', JSON.stringify(stats))
}

const riltiGoFast = (fast = true, count = COUNT) => {
  const mode = fast ? 'fastdom' : 'dom'
  const {span} = rilti[mode]
  const start = performance.now()
  while (count > 1) {
    span({
      $: document.body,
      css: {
        background: '#fff',
        width: '110px',
        color: 'dimgrey',
        textAlign: 'center',
        height: '110px',
        margin: '5px',
        padding: '4px',
        float: 'left',
        boxShadow: '0 1px 4px hsla(0,0%,0%,.3)'
      }
    },
      'damn daniel, back at it again with those white spans ',
      count--
    )
  }

  const ms = performance.now() - start
  console.log(`
    rilti.${mode} took: ${ms}ms,
    rendering ${count} white spans.
  `)
  updateStats(mode, ms)
}

const its = localStorage.getItem('iterations')
const iterations = its === null ? 20 : Number(its)

const mode = localStorage.getItem('fastmode') === 'true'
localStorage.setItem('fastmode', !mode)

setTimeout(() => {
  riltiGoFast(mode)
  setTimeout(() => {
    document.body.textContent = ''
    localStorage.setItem('iterations', iterations - 1)
    if (iterations > 1) location.reload()
  }, 500)
}, 500)
*/
/*
const {isNode, isStr, render, query} = rilti

const chain = (node, fast) => {
  const dom = rilti[fast ? 'fastdom' : 'dom']
  const stack = []
  stack.isChain = true
  const link = (tag, args, host) => {
    if (tag !== undefined) {
      const next = dom[tag].apply(undefined, args)
      stack.push(next)
      if (host) render(next, host)
    } else {
      stack.push(...args)
      if (host) render(args, host)
    }
  }
  if (isNode(node) || isStr(node)) {
    if (document.body && isStr(node)) node = query(node)
    if (!node) throw new Error('rilti.chain: invalid/non-existing host node')
    stack.push(node)
    return new Proxy(stack, {
      get: (_, tag, proxy) => tag === 'children' ? stack : (...args) => {
        if (args[0] && args[0].isChain) {
          link(undefined, args[0].children, node)
        } else {
          link(tag, args, node)
        }
        return proxy
      }
    })
  } else {
    return new Proxy(stack, {
      get: (_, tag, proxy) => tag === 'children' ? stack : (...args) => {
        link(tag, args)
        return proxy
      }
    })
  }
}

const stack = chain('body')
.header(
  chain().h1('Have at it laddies!')
)
.div(
  'Help I need somebody!'
)

const start = performance.now()
let i = 1
while (i < 101) {
  stack.span({class: 'num-block'}, i++)
}
console.log('that took: ' + (performance.now() - start) + 'ms')
*/


const infinify = (fn, reflect = false) => new Proxy(fn, {
  get: (fn, key) =>
    (reflect && key in fn && Reflect.get(fn, key)) || fn.bind(undefined, key)
})

const emitter = (host = {}, listeners = new Map()) => Object.assign(host, {
  listeners,
  emit: infinify((event, ...data) => {
    if (listeners.has(event)) {
      listeners.get(event).forEach(h => h.apply(undefined, data))
    }
  }),
  emitForof: infinify((event, ...data) => {
    if (listeners.has(event)) {
      for (const h of listeners.get(event)) h.apply(undefined, data)
    }
  }),
  on: infinify((event, handler) => {
    if (!listeners.has(event)) listeners.set(event, new Set())
    listeners.get(event).add(handler)
    return () => host.off(event, handler)
  }),
  once: infinify((event, handler) => host.on(event, function h () {
    handler(...arguments)
    host.off(event, h)
  })),
  off: infinify((event, handler) => {
    if (listeners.has(event)) {
      // ls = listener Set
      const ls = listeners.get(event)
      ls.delete(handler)
      if (!ls.size) listeners.delete(event)
    }
  })
})

const test = (forof = false, count = 1000000) => {
  const start = performance.now()
  const em = emitter()
  const results = new Set()
  em.on.x(v => results.add((v+2) * 434))
  if (forof) {
    while (count > 1) em.emitForof.x(--count)
  } else {
    while (count > 1) em.emit.x(--count)
  }
  console.log((forof ? 'forof' : 'forEach') + ' took: ' + (performance.now() - start) + 'ms')
  console.log(results)
}

test()
test(true)
test()
test(true)
test()
test(true)
