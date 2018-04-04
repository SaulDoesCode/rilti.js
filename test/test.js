/* global rilti describe it expect Text */
const {
  isArr,
  isNil,
  isDef,
  isObj,
  isFunc,
  isBool,
  isStr,
  isNum,
  isArrlike,
  isNodeList,
  isNode,
  isPrimitive,
  isPromise,
  isRenderable,
  isRegExp,
  isInt,
  isInput,
  isEmpty,
  isEl,
  isSvg,
  flatten,
  emitter,
  attributeObserver,
  curry,
  compose,
  components,
  component,
  run,
  render,
  runAsync,
  query,
  queryAsync,
  queryAll,
  queryEach,
  on,
  once,
  each,
  svg,
  fastdom,
  dom,
  domfn,
  html,
  directive,
  directives,
  prime,
  map2json,
  model,
  $
} = rilti


describe('event-emitter', () => {
  const mitter = emitter()
  const msg = 'do you hear me?'

  it('should receive an event twice', () => {
    let count = 0
    const ln = mitter.on.test123(m => {
      expect(m === msg).toBeTruthy()
      if (count === 2) {
        ln.off()
        expect(count === 2).toBeTruthy()
      }
      count++
    })
  })

  it('should receive an event once', () => {
    let hit = false
    mitter.once.test123(m => {
      expect(m === msg && !hit).toBeTruthy()
      hit = true
    })
  })

  it('should emit an event', () => {
    mitter.emit.test123(msg)
    mitter.emit.test123(msg)
  })
})

describe('$', () => {
  describe('proxify node', () => {
    const el = document.createElement('div')
    el.className = 'card'

    it('should proxify a div element', () => {
      const $el = $(el)
      expect($el()).toBe(el)
    })

    it('should have rilti.domfn properties', () => {
      expect($(el).class.card).toBeTruthy()
      $(el).attr({foo: 'bar'})
      expect(el.hasAttribute('foo')).toBeTruthy()
      expect(el.getAttribute('foo')).toBe('bar')
    })
  })
})

describe('dom', () => {
  describe('create', () => {
    const txt = 'Hello World'
    const el = dom.div(el => txt)
    it('should create a <div>Hello World</div>', () => {
      expect(el() instanceof window.Node).toBeTruthy()
    })
    it('should have a Text Node with "Hello World" inside', () => {
      expect(el.childNodes[0].textContent).toEqual(txt)
    })
  })
})

describe('isX', () => {
  it('should test whether a value is a Function', () => {
    expect(
      isFunc(() => 42) && !isFunc(new (class {})()) && !isFunc(42)
    )
    .toBeTruthy()
  })

  it('should test whether a value is an Object', () => {
    expect(
      isObj({}) && !isObj(new (class {})()) && !isObj(() => 42)
    )
    .toBeTruthy()
  })

  it('should test whether a value is a Promise', () => {
    expect(
      isPromise(Promise.resolve(42)) && !isPromise(class {}) && !isPromise(() => 42)
    )
    .toBeTruthy()
  })

  it('should test whether a value is a javascript primitive', () => {
    expect(
      isPrimitive(42) && isPrimitive('42') && isPrimitive(true) && !isPrimitive(Promise.resolve(42)) && !isPrimitive(() => 42)
    )
    .toBeTruthy()
  })

  it('should test whether a value is an Array', () => {
    expect(
      isArr([1, 2, 3]) && !isArr(class {}) && !isArr(() => [4, 2])
    )
    .toBeTruthy()
  })

  it('should test whether a value is Array-like', () => {
    expect(
      isArrlike([1, 2, 3]) && isArrlike('123') && !isArrlike(class {}) && !isArrlike(() => [4, 2])
    )
    .toBeTruthy()
  })

  it('should test whether a value is null or undefined', () => {
    expect(
      isNil(undefined) && isNil(null) && !isNil(0) && !isNil('') && !isNil(false)
    )
    .toBeTruthy()
  })

  it('should test whether a value is neither null nor undefined', () => {
    expect(
      !isDef(undefined) && !isDef(null) && isDef(0) && isDef('') && isDef(false)
    )
    .toBeTruthy()
  })

  it('should test whether a value is a Boolean', () => {
    expect(
      isBool(true) && isBool(false) && !isBool(0) && !isBool('') && !isBool(null) && !isBool(void 0)
    )
    .toBeTruthy()
  })

  it('should test whether a value is a String', () => {
    expect(
      isStr('') && !isStr(true) && !isStr(["ceci n'est pas un string!"])
    )
    .toBeTruthy()
  })

  it('should test whether a value is a Number', () => {
    expect(
      isNum(34) && isNum(323.53) && !isNum(NaN) && !isNum('34') && !isNum(!0)
    )
    .toBeTruthy()
  })

  it('should test whether a value is an integer Number', () => {
    expect(
      isInt(34) && !isInt(323.53) && !isInt(NaN) && !isInt('34') && !isInt(!0)
    )
    .toBeTruthy()
  })

  it('should test whether a value is a Node', () => {
    const node = new Text()
    const el = document.createElement('p')
    expect(
      isNode(node) && isNode(el) && !isNode({tagName: 'B', nodeType: 2}) && !isNode('<b>34</b>')
    )
    .toBeTruthy()
  })

  it('should test whether a value is a NodeList', () => {
    const nl = document
    .createRange()
    .createContextualFragment(
      `<div>1</div><div>2</div><div>3</div><div>4</div><div>5</div><div>6</div>`
    ).childNodes
    expect(
      isNodeList(nl, false) && isNodeList(Array.from(nl)) && !isNodeList(new Text()) && !isNodeList('<b>34</b>')
    )
    .toBeTruthy()
  })

  it('should test whether a value is an Element', () => {
    const div = document.createElement('div')
    expect(
      isEl(div) && isEl(document.body) && !isEl(document) && !isEl(new Text())
    )
    .toBeTruthy()
  })

  it('should test whether a value is an Input Element', () => {
    const textarea = document.createElement('textarea')
    const input = document.createElement('input')
    expect(
      isInput(textarea) && isInput(input) && !isInput(new Text())
    )
    .toBeTruthy()
  })

  it('should test whether a value is a SVGElement', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    const circ = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    expect(
      isSvg(svg) && isSvg(circ) && !isSvg(new Text())
    )
    .toBeTruthy()
  })

  it('should test whether a value is a regular expression', () => {
    expect(
      isRegExp(/([1-3],{1,3})/g) && !isRegExp('([1-3],{1,3})')
    )
    .toBeTruthy()
  })

  it('should test whether certain collections are empty', () => {
    expect(
      isEmpty([]) && isEmpty({}) &&
      isEmpty('') && isEmpty(new Set()) &&
      isEmpty(new Map()) && !isEmpty([1, 2, 3]) &&
      !isEmpty({a: 3, 3: 'a'}) && !isEmpty('123') &&
      !isEmpty(new Set([1, 2, 3])) && !isEmpty(new Map([['a', 5], [5, 'a']]))
    )
    .toBeTruthy()
  })

  it('should test whether a value is renderable by rilti', () => {
    const el = document.createElement('div')
    const $el = $(el)

    const nl = document
    .createRange()
    .createContextualFragment(
      `<div>1</div><div>2</div><div>3</div><div>4</div><div>5</div><div>6</div>`
    ).childNodes

    expect(
      !isRenderable({}) &&
      isRenderable([]) && isRenderable(nl) &&
      isRenderable(el) && isRenderable($el) &&
      isRenderable(true) && isRenderable('Moo!') && isRenderable(42933)
    )
    .toBeTruthy()
  })
})

describe('flatten', () => {
  it('should flatten out arrays', () => {
    const unflattened = [1, [2, 3], [[4], [5]]]
    const flattened = [1, 2, 3, 4, 5]

    expect(
      flatten(unflattened)
      .every((n, i) => n === flattened[i])
    )
    .toBeTruthy()
  })
})

/*
attributeObserver,
curry,
compose,
components,
component,
run,
render,
runAsync,
query,
queryAsync,
queryAll,
queryEach,
on,
once,
each,
svg,
fastdom,
dom,
domfn,
html,
directive,
directives,
prime,
map2json,
model
*/
