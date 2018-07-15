const {h2, input, label, section, div, p} = window.rilti.dom

section.databinding({
  $: 'body',
  state: {
    firstname: 'John',
    lastname: 'Smith'
  }
},
h2('databinding'),
({state}) => [
  div.firstname(
    label('firstname: '),
    input({type: 'text', name: 'firstname'}, state.$firstname)
  ),
  div.lastname(
    label('lastname: '),
    input({type: 'text', name: 'lastname'}, state.$lastname)
  ),
  p.details(state`
   The name provided is ${'firstname'} ${'lastname'}.
  `)
]
)
