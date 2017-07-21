{
"use strict";
const {notifier, each, pipe, dom, domfn, run, render, route} = rilti;
const {div, h1, header, footer, span, nav, p, a, domfrag} = dom;
const {Class} = domfn;

const SideBarContent = domfrag();
const sbButtons = new Map;

const Dot = '.';
const dotInStr = str => str.includes(Dot);
const cleanHash = (str = location.hash) => str === location.hash || str[0] === '#' ? str.slice(2) : str;
var splitter = (str = location.hash, splitStr = Dot) => cleanHash(str).split(splitStr);
const joinN = (arr, n = 2, withWhat = Dot) => arr.filter((val, i) => i <= (n - 1)).join(withWhat);
const isHeader = str => sbButtons.has(str);
var getHeader = (splitHash = splitter(location.hash)) => {
  if(splitHash.length === 1 && isHeader(splitHash[0])) return splitHash[0];
  else if(splitHash.length >= 2) {
    const temp = joinN(splitHash, 2, Dot);
    if(isHeader(temp)) return temp;
    else if(isHeader(splitHash[0])) return splitHash[0];
  }
  return "";
}
const hashHasHeader = headerName => headerName === getHeader();

const hub = notifier({
  toggleHeader(name, state) {
    hub.emit('colapse:'+name, state);
  }
});

const sbHeader =  (name, closed = !hashHasHeader(name)) => {
  const buttonSubjects = new Map;
  sbButtons.set(name, buttonSubjects);

  const originalName = name;
  const hasDot = dotInStr(name);

  if(hasDot) {
    name = splitter(name);
    const first = name.shift();
    name = [first, span(Dot), ...name];
  }

  const toggleButtons = (state = !closed) => {
    closed = state;
    if(state && hashHasHeader(originalName)) location.hash = "";
    each(buttonSubjects, btn => Class(btn, 'hidden', state));
  }

  hub.on('colapse:'+originalName, toggleButtons);

  header({
    render:SideBarContent,
    class:"sidebar-header",
    action() {
      if(!hashHasHeader(originalName)) {
        location.hash = '#/'+originalName;
      } else toggleButtons();
    }
  }, name);

  return originalName;
}

const sbButton = (underHeader, name, href = `#/${underHeader}.${name}`) => {
  const btn = a({
    render: SideBarContent,
    class:`sidebar-button hidden`,
    href
  }, name.includes('[') ? span(name.slice(1,10)) : [span('.'), name]);

  if(sbButtons.has(underHeader)) sbButtons.get(underHeader).set(name, btn);

  return underHeader;
}

pipe("rilti")
(sbHeader)
(sbButton, "notifier")
(sbButton, "each")
(sbButton, "pipe")
(sbButton, "compose")
(sbButton, "create")
(sbButton, "run")
(sbButton, "render")
(sbButton, "repeter")
(sbButton, "route")
(sbButton, "isBool")
(sbButton, "isFunc")
(sbButton, "isDef")
(sbButton, "isUndef")
(sbButton, "isNull")
(sbButton, "isEmpty")
(sbButton, "isNum")
(sbButton, "isInt")
(sbButton, "isStr")
(sbButton, "isObj")
(sbButton, "isArr")
(sbButton, "isArrlike")
(sbButton, "isMap")
(sbButton, "isSet")
(sbButton, "isEl")
(sbButton, "isNode")
(sbButton, "isNodeList")
(sbButton, "isInput")
(sbButton, "isPrimitive");

pipe("rilti.domfn")
(sbHeader)
(sbButton, "replace")
(sbButton, "clone")
(sbButton, "css")
(sbButton, "Class")
(sbButton, "hasClass")
(sbButton, "attr")
(sbButton, "removeAttr")
(sbButton, "hasAttr")
(sbButton, "getAttr")
(sbButton, "setAttr")
(sbButton, "attrToggle")
(sbButton, "inner")
(sbButton, "emit")
(sbButton, "append")
(sbButton, "prepend")
(sbButton, "appendTo")
(sbButton, "prependTo")
(sbButton, "remove");

pipe("rilti.dom")
(sbHeader)
(sbButton, "['any-tag']")
(sbButton, "dom")
(sbButton, "html")
(sbButton, "domfrag")
(sbButton, "create")
(sbButton, "query")
(sbButton, "queryAll")
(sbButton, "queryEach")
(sbButton, "on")
(sbButton, "once");

render(SideBarContent, '.sidebar');

const selectRightButton = (headerName, btnName) => {
  if(sbButtons.has(headerName)) {
    hub.toggleHeader(headerName, false);
    each(sbButtons.get(headerName), (btn, name) => {
      Class(btn, 'selected', name === btnName);
    });
  }
}

let lastActive;
route(() => {
  const cleanedHash = cleanHash();
  const activeHeader = getHeader();
  const btnName = cleanedHash.slice(activeHeader.length + 1);
  if(lastActive && lastActive !== activeHeader) hub.toggleHeader(lastActive, true);
  selectRightButton(activeHeader, btnName);
  lastActive = activeHeader;
});

run(() => {
  console.info(`Loaded in ${performance.now() - commence}ms`);
});
}
