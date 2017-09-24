{
  /* global rilti HTMLElement customElements */
  const {extend, isObj, isFunc, domfn: {emit}} = rilti

  rilti.Component = (tag, config) => {
    if (!tag.includes('-')) throw new Error(tag + ' is un-hyphenated')
    const {create, mount, destroy, attr, props, methods, adopted} = config
    const attrs = isObj(attr) ? Object.keys(attr) : []

    const CustomElement = class extends HTMLElement {
      constructor () {
        super()
        const element = this
        if (props) rilti.extend(element, props)
        if (isFunc(create)) create.call(element, element)
        emit(element, 'create')
      }
      connectedCallback () {
        const element = this
        isFunc(mount) && mount.call(element, element)
        emit(element, 'mount')
      }
      disconnectedCallback () {
        const element = this
        if (isFunc(destroy)) destroy.call(element, element)
        emit(element, 'destroy')
      }
      adoptedCallback () {
        const element = this
        if (isFunc(adopted)) adopted.call(element, element)
        emit(element, 'adopted')
      }
      static get observedAttributes () { return attrs }
      attributeChangedCallback (attrname, oldval, newval) {
        if (oldval !== newval) attr[attrname].call(this, newval, oldval, this)
      }
  }
    if (methods) extend(CustomElement.prototype, methods)
    customElements.define(tag, CustomElement)
  }
}
