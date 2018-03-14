/* global performance rilti Node NodeList Text Element */
const display = document.createElement('ul')
document.body.appendChild(display)

const tests = {}
const test = new Proxy(async (name, {type, expect, desc, params}, fn) => {
  let err
  let ok = false
  const start = performance.now()
  try {
    const result = await fn(rilti)
    if (
      (expect !== undefined && result !== expect) ||
      (typeof expect === 'function' && expect(result))
    ) {
      throw new Error(`${name} test expectation unmet: ${String(result)}`)
    } else if (type !== undefined && result.constructor === type) {
      throw new TypeError(`
       Result type mismatch: it should've been ${type}
       it was typeof ${typeof result} with constructor ${type.constructor}
      `.trim())
    }
    ok = true
  } catch (e) {
    err = e
    console.warn(e)
  }
  const ms = performance.now() - start
  tests[name] = {
    type,
    expect,
    desc,
    params,
    err,
    ok,
    ms,
    failed: err === undefined
  }

  const outcome = `${ok ? '✓' : '✕'} ${name}: test was ${ok ? 'ok' : 'not ok'}${err ? ' and errored with ' + err : ''} finishing in ${ms}ms`

  console.log(outcome)

  const displayOutcome = document.createElement('li')
  displayOutcome.textContent = outcome
  display.appendChild(displayOutcome)
}, {
  get: (fn, name) => fn.bind(undefined, name)
})

test.isFunc({
  params: 'o -> bool',
  desc: 'test whether a value is a Function',
  expect: true
}, async ({isFunc}) =>
  isFunc(() => 42) && !isFunc(new (class {})()) && !isFunc(42)
)

test.isObj({
  params: 'o -> bool',
  desc: 'test whether a value is an Object',
  expect: true
}, async ({isObj}) =>
  isObj({}) && !isObj(new (class {})()) && !isObj(() => 42)
)

test.isPromise({
  params: 'o -> bool',
  desc: 'test whether a value is a Promise',
  expect: true
}, async ({isPromise}) =>
  isPromise(Promise.resolve(42)) && !isPromise(class {}) && !isPromise(() => 42)
)

test.isPrimitive({
  params: 'o -> bool',
  desc: 'test whether a value is a javascript primitive',
  expect: true
}, async ({isPrimitive}) =>
  isPrimitive(42) && isPrimitive('42') && isPrimitive(true) &&
  !isPrimitive(Promise.resolve(42)) && !isPrimitive(() => 42)
)

test.isArr({
  params: 'o -> bool',
  desc: 'test whether a value is an Array',
  expect: true
}, async ({isArr}) =>
  isArr([1, 2, 3]) && !isArr(class {}) && !isArr(() => [4, 2])
)

test.isArrlike({
  params: 'o -> bool',
  desc: 'test whether a value is an Array-like',
  expect: true
}, async ({isArrlike}) =>
  isArrlike([1, 2, 3]) && isArrlike('123') &&
  !isArrlike(class {}) && !isArrlike(() => [4, 2])
)

test.isNil({
  params: 'o -> bool',
  desc: 'test whether a value is null or undefined',
  expect: true
}, async ({isNil}) =>
  isNil(undefined) && isNil(null) && !isNil(0) && !isNil('') && !isNil(false)
)

test.isDef({
  params: 'o -> bool',
  desc: 'test whether a value is neither null nor undefined',
  expect: true
}, async ({isDef}) =>
  !isDef(undefined) && !isDef(null) && isDef(0) && isDef('') && isDef(false)
)

test.isBool({
  params: 'o -> bool',
  desc: 'test whether a value is a Boolean',
  expect: true
}, async ({isBool}) =>
  isBool(true) && isBool(false) && !isBool(0) &&
  !isBool('') && !isBool(null) && !isBool(void 0)
)

test.isStr({
  params: 'o -> bool',
  desc: 'test whether a value is a String',
  expect: true
}, async ({isStr}) =>
  isStr('') && !isStr(true) && !isStr(["ceci n'est pas un string!"])
)

test.isNum({
  params: 'o -> bool',
  desc: 'test whether a value is a Number',
  expect: true
}, async ({isNum}) =>
  isNum(34) && isNum(323.53) && !isNum(NaN) && !isNum('34') && !isNum(!0)
)

test.isNode({
  params: 'o -> bool',
  desc: 'test whether a value is a Node',
  expect: true
}, async ({isNode}) => {
  const node = new Text()
  const el = document.createElement('p')
  return isNode(node) && isNode(el) &&
  !isNode({tagName: 'B', nodeType: 2}) && !isNode('<b>34</b>')
})

test.isNodeList({
  params: 'o -> bool',
  desc: 'test whether a value is a NodeList',
  expect: true
}, async ({isNodeList}) => {
  const nl = document
  .createRange()
  .createContextualFragment(
    `<div>1</div><div>2</div><div>3</div><div>4</div><div>5</div><div>6</div>`
  ).childNodes
  return isNodeList(nl, false) && isNodeList(Array.from(nl)) &&
  !isNodeList(new Text()) && !isNodeList('<b>34</b>')
})

test.isEl({
  params: 'o -> bool',
  desc: 'test whether a value is an Element',
  expect: true
}, async ({isEl}) => {
  const div = document.createElement('div')
  return isEl(div) && isEl(document.body) &&
  !isEl(document) && !isEl(new Text())
})

test.isInput({
  params: 'o -> bool',
  desc: 'test whether a value is an Input Element',
  expect: true
}, async ({isInput}) => {
  const textarea = document.createElement('textarea')
  const input = document.createElement('input')
  return isInput(textarea) && isInput(input) && !isInput(new Text())
})

test.isSvg({
  params: 'o -> bool',
  desc: 'test whether a value is a SVGElement',
  expect: true
}, async ({isSvg}) => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  const circ = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
  return isSvg(svg) && isSvg(circ) && !isSvg(new Text())
})

test.isRegExp({
  params: 'o -> bool',
  desc: 'test whether a value is a regular expression object',
  expect: true
}, async ({isRegExp}) =>
  isRegExp(/([1-3],{1,3})/g) && !isRegExp('([1-3],{1,3})')
)

test.isEmpty({
  params: 'o -> bool',
  desc: 'test whether certain collections are empty',
  expect: true
}, async ({isEmpty}) =>
  isEmpty([]) && isEmpty({}) &&
  isEmpty('') && isEmpty(new Set()) &&
  isEmpty(new Map()) && !isEmpty([1, 2, 3]) &&
  !isEmpty({a: 3, 3: 'a'}) && !isEmpty('123') &&
  !isEmpty(new Set([1, 2, 3])) && !isEmpty(new Map([['a', 5], [5, 'a']]))
)

/*
isRenderable,
attributeObserver,
flatten,
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
emitter,
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
Mounted,
Unmounted,
Created,
ProxiedNodes,
$
*/
