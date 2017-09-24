{
  /* global rilti */
  const {domfn, extend, each} = rilti
  extend(rilti, {
    debounce (func, wait, immediate) {
      let timeout
      return (...args) => {
        const later = () => {
          timeout = null
          if (!immediate) func(...args)
        }
        const callNow = immediate && !timeout
        clearTimeout(timeout)
        timeout = setTimeout(later, wait)
        if (callNow) func(...args)
      }
    }
  })

  extend(domfn, {
    clone (node) {
      const clone = node.cloneNode()
      each(node.childNodes, n => {
        clone.appendChild(domfn.clone(n))
      })
      return clone
    }
  })
}
