const {dom, domfn, each, timeout, render} = rilti
const {Class, hasClass, remove} = domfn
const {div, section, header, h1, hr} = dom

const shuffle = arr => {
  let j, x, i
  for (i = arr.length - 1; i > 0; i--) {
    j = Math.floor(Math.random() * (i + 1))
    x = arr[i]
    arr[i] = arr[j]
    arr[j] = x
  }
  return arr
}

const emojis = shuffle('😀,😂,😃,😆,😜,😝,😁,😉,😊,😏,😋,😎,😍,😘,😯,😛'.split(','))

let actionTimeout
let activeCard
let lastActive
const Activate = card => {
  if (card === activeCard || hasClass(card, 'score')) return
  if (actionTimeout) actionTimeout.stop(true)
  if (activeCard) {
    if (lastActive) Class(lastActive, 'visible', false)
    lastActive = activeCard
  }
  Class(activeCard = card, 'visible', true)
  if (lastActive) {
    const pair = [lastActive, activeCard]
    if (lastActive.emoji === activeCard.emoji) {
      Class(pair, 'score', true)
      scoreNode.textContent = --left
      actionTimeout = timeout(() => {
        remove(pair)
        actionTimeout = undefined
      }, 2000).start()
    } else {
      actionTimeout = timeout(() => {
        Class(pair, 'visible', false)
        actionTimeout = undefined
      }, 1000).start()
    }
    activeCard = lastActive = undefined
  }
}

let left = emojis.length
const scoreNode = dom.text(left)

header(
  {$: 'body'},
  h1('Pexeso'),
  'match the cards',
  hr(),
  [scoreNode, ' pairs left to go']
)

const board = section({$: 'body', class: 'board'})

const card = emoji => div({
  props: {emoji},
  class: 'card',
  onclick: (e, el) => Activate(el)
},
  emoji
)

const cards = []
each(emojis.length, i => {
  cards.push(card(emojis[i]), card(emojis[i]))
})

render(shuffle(shuffle(cards)), board)
