const {dom: {section, button}, $, each, isNum, isEmpty} = window.rilti

const view = {keys: [], operators: {}}
section.calculator({$: 'body'},
  view.screen = section.screen(),
  view.numpad = section.numpad({
    onclick ({target}) {
      target = $(target)
      if (C.activeOp !== target && target.txt in view.operators) {
        C.$operator(target.txt)
      } else if (view.clear === target) {
        return C.reset()
      }
      const num = (view.decimal === target && '.') || view.keys.indexOf(target)
      if (num !== -1) C.$number(num)
    }
  }, view.clear = button.clear('C'))
)

const numkey = i => { view.keys[i] = button({$: view.numpad}, i) }
const opkey = op => { view.operators[op] = button({$: view.numpad}, op) }
each([7, 8, 9], numkey); opkey('+')
each([4, 5, 6], numkey); opkey('-')
each([1, 2, 3], numkey); opkey('/')
numkey(0); view.decimal = button({$: view.numpad}, '.')
opkey('='); opkey('*')

const C = {
  set view (txt) { view.screen.txt = txt },
  get view () { return parseFloat(view.screen.txt) },
  reset () {
    C.view = 0
    C.left = C.right = ''
    C.preOperator = true
    if (C.activeOp) C.activeOp.class.active = false
  },
  calculate (left, operation, right) {
    left = parseFloat(left)
    right = parseFloat(right)
    const is = x => x === operation
    return is('/') && !(left === 0 && right === 0) ? left / right
      : is('*') ? left * right
        : is('+') ? left + right
          : is('-') ? left - right
            : 0
  },
  $number (n) {
    const side = C.preOperator ? 'left' : 'right'
    if (isEmpty(C[side])) C[side] = ''
    if ((n === '.' && !C[side].includes('.')) || isNum(parseFloat(n))) C.view = C[side] += n
  },
  $operator (o) {
    if (C.preOperator) {
      C.operator = o
      C.preOperator = false
    } else if (o === '=' && C.operator) {
      C.view = C.left = C.calculate(C.left, C.operator, C.right)
      C.operator = C.right = ''
      C.preOperator = true
    }
    if (C.activeOp) {
      C.activeOp.class.active = false
    }
    (C.activeOp = view.operators[o]).class.active = true
  }
}
C.reset()
