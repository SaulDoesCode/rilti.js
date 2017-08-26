{
const commence = performance.now();
// get all the functions needed
const {notifier,model,each,compose,curry,dom,domfn,on,once,not,flatten,run,route,isObj,isFunc,isNum,isNill,isPrimitive,isNodeList,isNode,isStr,isEmpty} = rilti;
// getting dom related functions & generating all the tags used
const {div,h1,header,footer,span,nav,p,a,b,html,ul,li,pre} = dom;
const {Class,hasClass,replace,css,append} = domfn; // dom manip functions

const indexr = (arr, i = arr.length / 2, len = arr.length) => ({
  get before() {
    if(len === 1) return arr[0];
    else if(len === 0) return null;
    else if(i === 0) return arr[len - 1];
    return arr[i - 1]
  },
  get between() {
    return arr[i];
  },
  get after() {
    if(len === 1 || i === len - 1) return arr[0];
    else if(len === 0) return null;
    return arr[i+1];
  }
});

const getNow = (now = new Date()) => ({
  time: `${now.getDate()}/${now.getUTCMonth()}/${now.getFullYear()} [ ${now.getHours()}:${now.getMinutes()} ( ${now.getSeconds()} ) ]`,
  seconds: now.getSeconds()
})

var hub = model({
  time: getNow().time,
  pageX: 0,
  pageY: 0,
});

on(window, 'mousemove', ({pageX, pageY}) => hub.update({pageX, pageY}));

const ticker = div({
  render: 'body',
  class: 'ticker',
  css: {
    right: `${(5 + (new Date).getSeconds() * (window.innerWidth / 80))}px`,
  },
  lifecycle: {
    create(el) {
      hub.sync(el, 'time', 'textContent');
    }
  }
});

hub.on('set:pageY', val => {
  ticker.style.top = val+'px';
});

setInterval(() => {
  const {time, seconds} = getNow();
  ticker.style.right = `${(5 + seconds * (innerWidth / 80))}px`;
  hub.time = time;
}, 1000);

const narr = (count, onEach) => {
  const newArray = [];
  each(count, n => {
    newArray.push(onEach ? onEach(n) : n);
  });
  return newArray;
}

nav({
  renderAfter: 'body > h1',
},
  Object.keys(rilti).map(key => {
    if(isFunc(rilti[key])) return div('.'+key);
    if(isObj(rilti[key])) {
      each(rilti[key], (v, k) => {
        if(isFunc(v)) key = k;
      });
      return div('.'+key);
    }
  }).filter(not(isNill))
)

}
