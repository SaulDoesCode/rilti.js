(() => {
  const {extend, dom, isFunc, each, reseat} = rilti;
  rilti.Component = (tag, config) => {
    if(!tag.includes('-')) throw new Error(tag+" is unhyphenated");
    const {create, mount, destroy, attr, props, methods, adopted} = config, attrs = [];
    attr && each(attr, (_, key) => attrs.push(key));

    const CustomElement = class extends HTMLElement {
      constructor() {
        super();
        const element = dom(this);
        element.pure.isComponent = true;
        props && reseat(element, props);
        if(isFunc(create)) create.call(element, element);
        element.data.emit('create', element);
      }
      connectedCallback() {
        const element = dom(this);
        isFunc(mount) && mount.call(element, element);
        element.data.emit('mount', element);
      }
      disconnectedCallback() {
        const element = dom(this);
        if(isFunc(destroy)) destroy.call(element, element);
        element.data.emit('destroy', element);
      }
      adoptedCallback() {
        const element = dom(this);
        if(isFunc(adopted)) adopted.call(element, element);
        element.data.emit('adopted', element);
      }
      static get observedAttributes() {
        return attrs;
      }
      attributeChangedCallback(attrName, oldVal, newVal) {
        if(oldVal != newVal) {
          const element = dom(this);
          attr[attrName].call(element, oldVal, newVal, element);
        }
      }
    }
    if(methods) reseat(CustomElement.prototype, methods);

    window.customElements.define(tag, CustomElement)
  }

})();
