const {dom, domfn: {Class}, model, each, isNum, isEmpty} = rilti
const {section, main, button} = dom

const C = model({
  preOperator: true,
  view: '0',
  reset () {
    C.view = 0
    C.left = C.right = ''
    C.preOperator = true
    if (C.activeOp) Class(C.activeOp, 'active', false)
  }
})

const calculate = (num, operation, num1) => {
  num = parseFloat(num)
  num1 = parseFloat(num1)
  const is = x => x === operation
  return (
    is('/') && !(num === 0 && num1 === 0) ? num / num1 :
    is('*') ? num * num1 :
    is('+') ? num + num1 :
    is('-') ? num - num1 :
    0
  )
}

C.on.number(n => {
  const side = C.preOperator ? 'left' : 'right'
  if (isEmpty(C[side])) C[side] = ''
  if (n === '.' || isNum(parseFloat(n))) C.view = C[side] += n
})

C.on.operator(o => {
  if (C.preOperator) {
    C.operator = o
    C.preOperator = false
  } else if (o === '=') {
    C.view = C.left = calculate(C.left, C.operator, C.right)
    C.operator = C.right = ''
    C.preOperator = true
  }
})

const view = {keys: [], operators: new Map()}

view.body = main({$: 'body', class: 'calculator'})

view.screen = section(
  {$: view.body, class: 'screen'},
  C.sync.view()
)

view.numpad = section({
  $: view.body,
  class: 'numpad',
  onclick ({target}) {
    if (view.keys.includes(target)) {
      const key = view.keys.indexOf(target)
      C.emit.number(key)
    } else if (view.decimal === target) {
      C.emit.number('.')
    } else if (view.operators.has(target) && C.activeOp !== target) {
      C.emit.operator(view.operators.get(target))
      if (C.activeOp) Class(C.activeOp, 'active', false)
      Class(C.activeOp = target, 'active', true)
    } else if (view.clear === target) {
      C.reset()
    }
  }
})

view.clear = button({$: view.numpad, class: 'clear'}, 'C')
const numkey = i => {
  view.keys[i] = button({$: view.numpad}, i)
}
const opkey = op => view.operators.set(button({$: view.numpad}, op), op)

each([7, 8, 9], numkey)
opkey('+')
each([4, 5, 6], numkey)
opkey('-')
each([1, 2, 3], numkey)
opkey('/')
numkey(0)
view.decimal = button({$: view.numpad}, '.')
opkey('=')
opkey('*')
