const {dom, domfn: {remove}, each, render} = window.rilti
const {div, section, header, h1, hr, text} = dom

const timeout = (fn, ms = 1000, current) => Object.assign(fn, {
  ms,
  start () {
    current = setTimeout(fn, fn.ms, undefined)
    return fn
  },
  stop (run = false) {
    if (run) fn()
    clearTimeout(current)
    return fn
  }
})

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
  if (card === activeCard || card.class.score) return
  if (actionTimeout) actionTimeout.stop(true)
  if (activeCard) {
    if (lastActive) lastActive.class.visible = false
    lastActive = activeCard
  }
  (activeCard = card).class.visible = true
  if (lastActive) {
    const pair = [lastActive, activeCard]
    if (lastActive.emoji === activeCard.emoji) {
      pair.forEach(n => n.class('score', true))
      pairsLeft.textContent = --pairCount
      if (pairCount === 0) resetGame()
      actionTimeout = timeout(() => {
        remove(pair)
        actionTimeout = undefined
      }, 2000).start()
    } else {
      actionTimeout = timeout(() => {
        pair.forEach(n => n.class('visible', false))
        actionTimeout = undefined
      }, 1000).start()
    }
    activeCard = lastActive = undefined
  }
}

let cards, pairCount
const pairsLeft = text(pairCount)
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
    el.remove()
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
  pairsLeft.txt = pairCount = Math.floor(emojis.length / 2)
  each(pairCount, i => {
    cards.push(card(emojis[i]), card(emojis[i]))
  })
  render(shuffle(cards), board)
}
