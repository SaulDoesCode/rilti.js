const {dom, domfn: {Class, hasClass, remove}, each, timeout, render} = rilti
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

let emojis = shuffle('😀,😂,😃,😆,😜,😝,😁,😉,😊,😏,😋,😎,😍,😘,😯,😛'.split(','))

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
      pairsLeft.textContent = --pairCount
      if (pairCount === 0) resetGame()
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

let cards, pairCount
const pairsLeft = dom.text(pairCount)
const pairCounter = div(pairsLeft, ' pairs left to go')

const heading = header(
  {$: 'body'},
  h1('PEXESO'),
  div(' match the cards'),
  hr()
)

const startButton = div({
  $: heading,
  class: 'start-btn',
  onclick (e, el) {
    remove(el)
    startGame()
  }
}, 'Start Game')

const board = section({$: 'body', class: 'board'})

const card = emoji => div({
  props: {emoji},
  class: 'card',
  onclick: (e, el) => Activate(el)
}, emoji)

const resetGame = () => {
  const congrats = h1('Good Show Man!')
  remove(congrats, 4500)
  remove(pairCounter)
  if (cards.length) remove(cards)
  render([startButton, congrats], heading)
}

const startGame = () => {
  actionTimeout = activeCard = lastActive = undefined
  emojis = shuffle(emojis)

  render(pairCounter, heading)

  cards = []
  pairsLeft.textContent = pairCount = Math.floor(emojis.length / 2)
  each(pairCount, i => {
    cards.push(card(emojis[i]), card(emojis[i]))
  })
  render(shuffle(cards), board)
}
