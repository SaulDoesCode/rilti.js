/* global rilti describe it expect Text beforeEach */
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
  curry,
  compose,
  run,
  render,
  runAsync,
  query,
  queryAsync,
  queryAll,
  queryEach,
  each,
  dom,
  html,
  $
  /* ,components,
  component,
  attributeObserver,
  on,
  once,
  svg,
  domfn,
  directive,
  directives,
  prime,
  model */
} = rilti

describe('isX', () => {
  it('should test whether a value is a Function', () => {
    expect(
      isFunc(() => 42) && !isFunc(new (class {})()) && !isFunc(42)
    ).toBeTruthy()
  })

  it('should test whether a value is an Object', () => {
    expect(
      isObj({}) && !isObj(new (class {})()) && !isObj(() => 42)
    ).toBeTruthy()
  })

  it('should test whether a value is a Promise', () => {
    expect(
      isPromise(Promise.resolve(42)) && !isPromise(class {}) && !isPromise(() => 42)
    ).toBeTruthy()
  })

  it('should test whether a value is a javascript primitive', () => {
    expect(
      isPrimitive(42) &&
      isPrimitive('42') &&
      isPrimitive(true) &&
      !isPrimitive(Promise.resolve(42)) &&
      !isPrimitive(() => 42)
    ).toBeTruthy()
  })

  it('should test whether a value is an Array', () => {
    expect(
      isArr([1, 2, 3]) && !isArr(class {}) && !isArr(() => [4, 2])
    ).toBeTruthy()
  })

  it('should test whether a value is Array-like', () => {
    expect(
      isArrlike([1, 2, 3]) &&
      isArrlike('123') &&
      !isArrlike(class {}) &&
      !isArrlike(() => [4, 2])
    ).toBeTruthy()
  })

  it('should test whether a value is null or undefined', () => {
    expect(
      isNil(undefined) &&
      isNil(null) &&
      !isNil(0) &&
      !isNil('') &&
      !isNil(false)
    ).toBeTruthy()
  })

  it('should test whether a value is neither null nor undefined', () => {
    expect(
      !isDef(undefined) && !isDef(null) && isDef(0) && isDef('') && isDef(false)
    ).toBeTruthy()
  })

  it('should test whether a value is a Boolean', () => {
    expect(
      isBool(true) &&
      isBool(false) &&
      !isBool(0) &&
      !isBool('') &&
      !isBool(null) &&
      !isBool(void 0)
    ).toBeTruthy()
  })

  it('should test whether a value is a String', () => {
    expect(
      isStr('') && !isStr(true) && !isStr(["ceci n'est pas un string!"])
    ).toBeTruthy()
  })

  it('should test whether a value is a Number', () => {
    expect(
      isNum(34) && isNum(323.53) && !isNum(NaN) && !isNum('34') && !isNum(!0)
    ).toBeTruthy()
  })

  it('should test whether a value is an integer Number', () => {
    expect(
      isInt(34) && !isInt(323.53) && !isInt(NaN) && !isInt('34') && !isInt(!0)
    ).toBeTruthy()
  })

  it('should test whether a value is a Node', () => {
    const node = new Text()
    const el = document.createElement('p')
    expect(
      isNode(node) && isNode(el) && !isNode({tagName: 'B', nodeType: 2}) && !isNode('<b>34</b>')
    ).toBeTruthy()
  })

  it('should test whether a value is a NodeList', () => {
    const nl = document
      .createRange()
      .createContextualFragment(
        `<div>1</div><div>2</div><div>3</div><div>4</div><div>5</div><div>6</div>`
      ).childNodes
    expect(
      isNodeList(nl, false) && isNodeList(Array.from(nl)) && !isNodeList(new Text()) && !isNodeList('<b>34</b>')
    ).toBeTruthy()
  })

  it('should test whether a value is an Element', () => {
    const div = document.createElement('div')
    expect(
      isEl(div) && isEl(document.body) && !isEl(document) && !isEl(new Text())
    ).toBeTruthy()
  })

  it('should test whether a value is an Input Element', () => {
    const textarea = document.createElement('textarea')
    const input = document.createElement('input')
    expect(
      isInput(textarea) && isInput(input) && !isInput(new Text())
    ).toBeTruthy()
  })

  it('should test whether a value is a SVGElement', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    const circ = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    expect(
      isSvg(svg) && isSvg(circ) && !isSvg(new Text())
    ).toBeTruthy()
  })

  it('should test whether a value is a regular expression', () => {
    expect(
      isRegExp(/([1-3],{1,3})/g) && !isRegExp('([1-3],{1,3})')
    ).toBeTruthy()
  })

  it('should test whether certain collections are empty', () => {
    expect(
      isEmpty([]) && isEmpty({}) &&
      isEmpty('') && isEmpty(new Set()) &&
      isEmpty(new Map()) && !isEmpty([1, 2, 3]) &&
      !isEmpty({a: 3, 3: 'a'}) && !isEmpty('123') &&
      !isEmpty(new Set([1, 2, 3])) && !isEmpty(new Map([['a', 5], [5, 'a']]))
    ).toBeTruthy()
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
    ).toBeTruthy()
  })
})

describe('flatten', () => {
  it('should flatten out arrays', () => {
    const unflattened = [1, [2, 3], [[4], [5]]]
    const flattened = [1, 2, 3, 4, 5]

    expect(
      flatten(unflattened).every((n, i) => n === flattened[i])
    ).toBeTruthy()
  })
})

describe('curry', () => {
  it('should curry functions', () => {
    const fn = curry((a, b, c) => a + b + c)
    const result = 111

    expect(
      fn(24)(55)(32)
    ).toBe(result)

    expect(
      fn(24, 55)(32)
    ).toBe(result)
  })

  it('should curry the first 2 arguments of a function', () => {
    const fn = curry((a, b, c = (111 - a) - b) => a + b + c, 2)
    const result = 111

    expect(
      fn(24)(55, 32)
    ).toBe(result)

    expect(
      fn(24, 55)
    ).toBe(result)
  })
})

describe('run/runAsync', () => {
  it('should call a function asynchronously when document.body is loaded', () => {
    const x1 = 2
    let x = 0
    run(() => {
      x++
      expect(x).toBe(x1)
      expect(document.body).toBeDefined()
    })
    x++
  })
  it('should call a function asynchronously', () => {
    const x1 = 2
    let x = 0
    runAsync(() => {
      x++
      expect(x).toBe(x1)
    })
    x++
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
      expect(el.textContent).toEqual(txt)
    })
  })

  describe('create element with classes shorthand', () => {
    const txt = 'Hello World'
    const el = dom.div.card.board.box(el => txt)()
    it('should certain classes', () => {
      expect(
        el.classList.contains('card') &&
        el.classList.contains('board') &&
        el.classList.contains('box')
      ).toBeTruthy()
    })
  })
})

describe('event listening and emtting', () => {
  const el = dom.div()
  const detailsToExpect = 'testing... testing... you seeing this?'
  it('should emit and receive an event with specific data', () => {
    el.on.test123(({detail}) => {
      expect(detail).toBe(detailsToExpect)
    })
    expect(el.emit).toBeDefined()
    el.emit('test123', detailsToExpect)
  })
})

describe('dom querying', () => {
  const els = 'abcdefg'
    .split('')
    .map((v, i) => dom.div({attr: {query: i}}, v)())

  document.body.append(...els)

  it('should query and find a particular element', () => {
    expect(els[2]).toBe(
      query('div[query="2"]')
    )
  })
  it('should query and find certain elements', () => {
    queryAll('div[query]').forEach(el => {
      expect(els.includes(el)).toBeTruthy()
    })
  })

  it('should query, find and loop over certain elements', () => {
    queryEach('div[query]', el => {
      expect(els.includes(el)).toBeTruthy()
    })
  })

  it('should query and find an element asynchronously', async () => {
    const el = await queryAsync('div[query]')
    expect(els.includes(el)).toBeTruthy()
  })
})

describe('async element rendering', () => {
  const el = dom.div({id: 'r1'}, `I should have been rendered to <body>`)
  let $el
  // this proves renderables hidden in nested functions will be degloved
  render(() => () => el, 'body')
  beforeEach(done => {
    setTimeout(() => {
      $el = query('#r1')
      done()
    }, 2222)
  })
  it('element should render to document.body', () => {
    if (!$el) {
      throw new Error('element did not render')
    } else {
      expect($el).toBe(el())
    }
  })
})

describe('prime html to be renderable (repeatably not just as a one use fragment)', () => {
  it('should take raw html and make a node filled array out of it', () => {
    const raw = [1, 2, 3, 4, 5, 6].map(n => `<div>${n}</div>`).join('')
    const primedHTML = html(raw)
    expect(isArr(primedHTML) && isNodeList(primedHTML)).toBeTruthy()
    expect(primedHTML[0].textContent).toBe('1')
    expect(primedHTML[3].textContent).toBe('4')
  })
})

describe('each', () => {
  it('should loop over an array', () => {
    const arr = [55, 44, 5412]
    const sum = arr[0] + arr[1] + arr[2]
    let result = 0
    each(arr, v => { result += v })
    expect(result).toBe(sum)
  })

  it('should loop over an object', () => {
    const obj = {a: 1, b: 2, c: 3}
    const result = [1, 2, 3]
    const arr = []
    each(obj, v => arr.push(v))
    expect(arr.every((v, i) => v === result[i])).toBeTruthy()
  })

  it('should loop over Set', () => {
    const setResult = new Set([1, 2, 3, 4])
    const set = new Set()
    each(setResult, v => set.add(v))
    let setsMatch = true
    set.forEach(v => {
      if (!setResult.has(v)) setsMatch = false
    })
    expect(setsMatch).toBeTruthy()
  })

  it('should loop over a Map', () => {
    const mapResult = new Map([['a', 1], ['b', 2], ['c', 3]])
    const map = new Map()
    each(mapResult, (v, k) => map.set(k, v))
    let mapsMatch = true
    map.forEach((v, k) => {
      if (!mapResult.has(k)) mapsMatch = false
    })
    expect(mapsMatch).toBeTruthy()
  })

  it('should loop n times', () => {
    const count = 100
    let result = 0
    each(count, i => ++result)
    expect(result).toBe(100)
  })
})

/*
describe('map2json', () => {
  it('should convert a map to json', () => {
    const expectation = `{"key":"value"}`
    expect(
      map2json(new Map([['key', 'value']]))
    ).toBe(expectation)
  })
})
*/

describe('compose', () => {
  it('should compose functions', () => {
    const nums = [123, 332, 1453]
    const sum = nums[0] + nums[1] + nums[2]
    const stateCombiner = ({i = 0, n = 0}) => ({i: i + 1, n: nums[i] + n})
    expect(
      compose(stateCombiner, stateCombiner, stateCombiner)({i: 0, n: 0}).n
    ).toBe(sum)
  })
})

// TODO: These
/*
attributeObserver,
components,
component,
svg,
domfn,
directive,
directives,
prime
*/
