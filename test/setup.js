import { afterAll } from 'vitest'

// unmount everything while the jsdom globals still exist,
// otherwise the MutationObserver fires during environment teardown
afterAll(async () => {
  document.body.textContent = ''
  await new Promise(resolve => setTimeout(resolve, 0))
})
