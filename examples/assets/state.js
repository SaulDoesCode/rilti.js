const {curry, state, dom, isNum} = rilti
const {div, form, input, label} = dom


const clicker = div.clicker({
  $: 'body',
  onclick: e => counter.mutate(val => val + 1)
})

const counter = state({
  val: 0,
  screen: (newval, oldval) => isNum(newval) && newval > 0,
  fail (failedVal, err) {
    console.error('The Counter must be positive number!', err)
  },
  pass (val) {
    console.log('Mutation passed screening, new val:', val)
  },
  views: {
    named: val => `a count of ${val}`,
    json: val => `{"count": ${val}}`
  },
  binds: [
    {host: clicker, prop: 'textContent', viewName: 'named'}
  ]
})


const formState = {
  email: state({
    screen: /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
    pass (val) {
      console.log('Mutation passed screening, new val:', val)
    },
    fail (val) {
      console.log('Mutation failed screening, new val:', val)
    }
  }),
  username: state({
    screen (val) {
      return typeof val === 'string' && (val.length >= 3 && val.length <= 50)
    },
    pass (val) {
      console.log('Mutation passed screening, new val:', val)
    },
    fail (val) {
      console.log('Mutation failed screening, new val:', val)
    }
  })
}

const emailInput = input({type: 'email'})
const usernameInput = input({type: 'text'})

formState.email.bind.input(emailInput)
formState.username.bind.input(usernameInput)

form({$: 'body'},
  div(label('email'), emailInput),
  div(label('username'), usernameInput)
)
