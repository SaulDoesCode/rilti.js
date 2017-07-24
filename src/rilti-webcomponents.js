{
const {extend,isObj,isFunc} = rilti,
newEVT = t => new CustomEvent(t),
mountEVT = newEVT('mount'),
destroyEVT = newEVT('destroy'),
createEVT = newEVT('create'),
adoptedEVT = newEVT('adopted');

rilti.Component = (tag, config) => {
  if(!tag.includes('-')) throw new Error(tag+" is unhyphenated");
  const {create, mount, destroy, attr, props, methods, adopted} = config,
  attrs = isObj(attr) ? Object.keys(attr) : [];

  const CustomElement = class extends HTMLElement {
    constructor() {
      super();
      const element = rilti.extend(this, props);
      if(isFunc(create)) create.call(element, element);
      element.dispatchEvent(createEVT);
    }
    connectedCallback() {
      const element = this;
      isFunc(mount) && mount.call(element, element);
      element.dispatchEvent(mountEVT);
    }
    disconnectedCallback() {
      const element = this;
      if(isFunc(destroy)) destroy.call(element, element);
      element.dispatchEvent(destroyEVT);
    }
    adoptedCallback() {
      const element = this;
      if(isFunc(adopted)) adopted.call(element, element);
      element.dispatchEvent(adoptedEVT);
    }
    static get observedAttributes() { return attrs; }
    attributeChangedCallback(attrname, oldval, newval) {
      if(oldVal !== newVal) attr[attrname].call(this, newval, oldval, this);
    }
  }
  if(methods) extend(CustomElement.prototype, methods);
  customElements.define(tag, CustomElement);
}
}
