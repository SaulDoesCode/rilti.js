import { describe, it, expect } from 'vitest'
import {
  $,
  dom,
  svg,
  on,
  merge,
  emitter,
  component,
  isPromise,
  isMounted,
  domfn
} from '../src/core.js'
import { frag } from '../src/dom-generation.js'

const tick = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms))
const click = el => el.dispatchEvent(new MouseEvent('click', { bubbles: true }))

describe('security', () => {
  it('merge refuses prototype polluting keys', () => {
    merge({}, JSON.parse('{"__proto__": {"polluted": true}}'))
    merge({}, JSON.parse('{"constructor": {"prototype": {"polluted": true}}}'))
    expect({}.polluted).toBeUndefined()
    expect(Object.prototype.polluted).toBeUndefined()
  })

  it('merge still merges nested own keys', () => {
    const a = { x: { y: 1 }, list: [1] }
    merge(a, { x: { z: 2 }, list: [2] })
    expect(a).toEqual({ x: { y: 1, z: 2 }, list: [1, 2] })
  })
})

describe('common', () => {
  it('isPromise does not throw on null', () => {
    expect(isPromise(null)).toBe(false)
    expect(isPromise({ then () {} })).toBe(true)
  })

  it('isMounted accepts proxy nodes', async () => {
    const el = dom.div()
    expect(isMounted(el)).toBe(false)
    document.body.append(el())
    expect(isMounted(el)).toBe(true)
    el().remove()
  })

  it('emitter.once fires a single time', async () => {
    const e = emitter()
    let count = 0
    e.once.ping(() => count++)
    e.emit.ping()
    e.emit.ping()
    await tick()
    expect(count).toBe(1)
  })
})

describe('rendering', () => {
  it('renders numbers next to nodes', async () => {
    const el = dom.div(5, dom.span('x'), 6)
    await tick()
    expect(el().textContent).toBe('5x6')
  })

  it('does not skip the renderable after null/false', async () => {
    const el = dom.div([null, 7, false, 8, 'a', undefined, ['b', [9]]])
    await tick()
    expect(el().textContent).toBe('78ab9')
  })

  it('renders promises once they resolve', async () => {
    let done
    const el = dom.div('a', new Promise(resolve => { done = resolve }), 'c')
    await tick()
    expect(el().textContent).toBe('ac')
    done(dom.b('b'))
    await tick()
    expect(el().textContent).toBe('abc')
    expect(el().querySelector('b')).not.toBeNull()
  })

  it('renders a proxy node passed as ops exactly once', async () => {
    const child = dom.span('only once')
    const el = dom.div(child)
    await tick()
    expect(el().children.length).toBe(1)
  })

  it('frag returns a DocumentFragment', () => {
    const f = frag('<i>1</i><i>2</i>')
    expect(f).toBeInstanceOf(DocumentFragment)
    expect(f.childNodes.length).toBe(2)
  })

  it('$-prefixed tags with ops stay pure (unproxied)', () => {
    const el = dom.$div({ id: 'pure' })
    expect(el).toBeInstanceOf(HTMLDivElement)
  })
})

describe('dom proxy', () => {
  it('does not throw on symbol access', () => {
    expect(() => String(dom[Symbol.toStringTag])).not.toThrow()
    expect(() => dom.div[Symbol.iterator]).not.toThrow()
    expect(() => dom.div.card[Symbol.iterator]).not.toThrow()
    expect(() => svg[Symbol.iterator]).not.toThrow()
  })

  it('is not thenable, so it can be returned from async functions', async () => {
    expect(dom.then).toBeUndefined()
    expect(dom.div.then).toBeUndefined()
  })

  it('stored class chains are not mutated by later chaining', () => {
    const Card = dom.div.card
    Card.big()
    const el = Card()()
    expect([...el.classList]).toEqual(['card'])
    expect([...dom.div.a.b_c.d()().classList]).toEqual(['a', 'b-c', 'd'])
  })

  it('camelCase tags become hyphenated', () => {
    expect(dom.myElement()().tagName).toBe('MY-ELEMENT')
  })
})

describe('proxy node', () => {
  it('setting .class and deleting a class works', () => {
    const el = dom.div()
    el.class = 'a b'
    expect(el().className).toBe('a b')
    el.class.c = true
    expect(el.class.c).toBe(true)
    expect(() => { delete el.class.a }).not.toThrow()
    expect(el.class.a).toBe(false)
  })

  it('setting .attr with an object works', () => {
    const el = dom.div()
    el.attr = { foo: 'bar' }
    expect(el().getAttribute('foo')).toBe('bar')
    expect(() => { delete el.attr.foo }).not.toThrow()
    expect(el().hasAttribute('foo')).toBe(false)
  })

  it('binds native methods that are not on HTMLElement', () => {
    const t = $(new Text('hello'))
    expect(() => t.splitText(2)).not.toThrow()
    const s = $(document.createElementNS('http://www.w3.org/2000/svg', 'rect'))
    expect(() => s.getAttribute('x')).not.toThrow()
  })

  it('leaves the user\'s own function props unbound', () => {
    const el = dom.div()
    const fn = function () {}
    el.handler = fn
    expect(el.handler).toBe(fn)
  })
})

describe('domfn', () => {
  it('class works on arrays and tolerates extra whitespace', () => {
    const els = [document.createElement('i'), document.createElement('i')]
    domfn.class(els, '  a   b ', true)
    expect(els.every(e => e.className === 'a b')).toBe(true)
  })

  it('attrToggle reports the right old/new values', () => {
    const el = dom.div()
    const events = []
    el.on.attr(e => events.push([e.oldvalue, e.value, e.present]))
    el.attrToggle('hidden', true, 'yes')
    el.attrToggle('hidden', false)
    expect(events).toEqual([[null, 'yes', true], ['yes', null, false]])
  })

  it('css reads custom properties', () => {
    const el = dom.div()
    document.body.append(el())
    el.css('--size', '4px')
    expect(el.css('--size').trim()).toBe('4px')
    el().remove()
  })
})

describe('events', () => {
  it('fires one attr event per change on mounted elements', async () => {
    const el = dom.div({ render: document.body })
    await tick()
    let count = 0
    el.on.attr(() => count++)
    el.attr('data-x', '1')
    await tick()
    expect(count).toBe(1)
    el().remove()
  })

  it('does not mutate the handler object it is given', () => {
    const el = dom.div()
    const handlers = { click () {} }
    const handles = el.on(handlers)
    expect(handlers.click).toBeInstanceOf(Function)
    expect(handles.click).not.toBe(handlers.click)
    expect(handles.off).toBeInstanceOf(Function)
    expect(el().off).toBeUndefined()
  })

  it('removes capture listeners', () => {
    const el = dom.div()
    let count = 0
    const off = on.click(el, () => count++, { capture: true })
    click(el())
    off()
    click(el())
    expect(count).toBe(1)
  })

  it('delegates to descendants of matching elements', () => {
    const host = dom.div()
    const btn = document.createElement('button')
    btn.className = 'btn'
    const inner = document.createElement('span')
    btn.append(inner)
    host().append(btn)
    const matched = []
    on.click(host, '.btn', (e, target, match) => matched.push(match))
    click(inner)
    expect(matched).toEqual([btn])
  })
})

describe('lifecycles', () => {
  it('only mounts children once they are actually in the document', async () => {
    const events = []
    const child = dom.span({ cycle: { mount: () => events.push('mount') } })
    const parent = dom.div(child)
    await tick()
    expect(events).toEqual([])
    document.body.append(parent())
    await tick()
    expect(events).toEqual(['mount'])
    parent().remove()
  })

  it('unmounts descendants and remounts once', async () => {
    const events = []
    const child = dom.span({
      cycle: {
        mount: () => events.push('mount'),
        unmount: () => events.push('unmount'),
        remount: () => events.push('remount')
      }
    })
    const parent = dom.div({ render: document.body }, child)
    await tick()
    parent().remove()
    await tick()
    document.body.append(parent())
    await tick()
    document.body.append(parent()) // a move is not a remount
    await tick()
    expect(events).toEqual(['mount', 'unmount', 'remount'])
    parent().remove()
  })
})

describe('components', () => {
  it('mounts once and keeps per-instance state', async () => {
    const mounts = []
    const clicks = []
    const config = {
      bind: { count: { val: 3 } },
      on: { click: (e, el) => clicks.push(el()) },
      mount: el => mounts.push(el())
    }
    component('fix-counter', config)
    const a = dom['fix-counter']({ render: document.body })
    const b = dom['fix-counter']({ render: document.body })
    await tick()

    expect(mounts).toEqual([a(), b()])
    expect(a().count).toBe(3)
    expect(b().count).toBe(3)
    expect(config.on.click).toBeInstanceOf(Function)

    click(a())
    click(b())
    expect(clicks).toEqual([a(), b()])
    a().remove()
    b().remove()
  })

  it('initializes elements that existed before registration', async () => {
    const el = document.createElement('late-comp')
    document.body.append(el)
    await tick()
    let mounted = false
    component('late-comp', { mount: () => { mounted = true } })
    await tick()
    expect(mounted).toBe(true)
    el.remove()
  })

  it('runs plugins', async () => {
    const seen = []
    component.plugin({ create: function () { seen.push(this.tagName) } })
    component('plug-comp', {})
    dom['plug-comp']()
    expect(seen).toContain('PLUG-COMP')
    component.plugins = null
  })
})

describe('databind', () => {
  it('works without views and syncs inputs', async () => {
    const el = dom.input({ bind: { username: { val: 'a', key: 'value' } } })
    expect(el().value).toBe('a')
    el().value = 'b'
    el().dispatchEvent(new Event('input'))
    expect(el.bind.username).toBe('b')
    el.bind.username = 'c'
    await tick()
    expect(el().value).toBe('c')
  })
})
