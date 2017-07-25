{
"use strict";
// get all the functions needed
const {notifier,each,pipe,compose,curry,dom,domfn,run,render,route,isObj,isFunc,isStr,isEmpty} = rilti;
// getting dom related functions & generating all the tags used
const {queryEach,div,h1,header,footer,span,nav,p,a,b,domfrag,html,ul,li,pre,code} = dom;
// dom manip functions
const {Class,hasClass} = domfn;

const smoothScrollSetting = { block: 'start', behavior: 'smooth' };

// The Bridge: central "App" object / message center
const hub = notifier();

const toggleSection = (name, state) => {
  hub.emit('colapse:'+name, state);
}

// temporarily render sidebar content to a dom fragment
// to reduce rendering granularity for performance
const sidebarContent = domfrag();

var activeButton;
var activeSection;

const sbHeader = (section, name, ...buttons) => {
  div({
    render:sidebarContent,
    class:'sidebar-section',
    lifecycle : {
      mount(el) {
        hub.on('colapse:'+name, state => {
          Class(el, 'open', state);
          if(hasClass(el, 'open')) {
            if(name !== activeSection) {
              if(isStr(activeSection)) toggleSection(activeSection, false);
              activeSection = name;
            }
          }
        });
      }
    }
  },
    div({
      class:'sidebar-header',
      action(e, el) {
        toggleSection(name);
        if(activeSection === name) location.hash = '#/'+name;
        if(activeButton) {
          Class(activeButton, 'selected', false);
          activeButton = null;
        }
      }
    }, name),

    buttons.map(btn => {
      if(isStr(btn)) {
        const href = `#/${section}.${btn}`;
        const linkBtn = a({ class: 'sidebar-button', href }, span('.'), btn);
        if(btn.length >= 11) linkBtn.style.fontSize = '.95em';

        route(href, () => {
          if(activeButton) Class(activeButton, 'selected', false);
          activeButton = Class(linkBtn, 'selected', true);
          if(activeSection !== name) toggleSection(name, true);
        });

        return linkBtn;
      }
      return btn;
    })

  );
}

const sbSubheader = name => div({ class: 'sidebar-subheader' }, name);


// Dude!?!??!! meta-(self-documentation)
const internals = {
  rilti:[],
  '.isX':[],
  sub: {}
}

each(rilti, (val, key) => {
  if(isFunc(val)) {
     if(key.includes('is')) internals['.isX'].push(key);
     else internals.rilti.push(key);
  } else if(isObj(val) && !isEmpty(val)) {
    internals.sub[key] = [];
    each(val, (v, k) => {
      if(isFunc(v)) internals.sub[key].push(k);
    });
  }
});

sbHeader('rilti', 'rilti', ...internals.rilti.sort());
sbHeader('rilti', '.isX', ...internals['.isX'].sort());

each(internals.sub, (set, head) => {
  sbHeader('rilti.'+head, '.'+head, ...set.sort());
});

sbHeader('rilti.dom', '.dom',
'query',
'queryAll',
'queryEach',
'create',
"anyTag",
'domfrag',
'html',
'on',
'once');

render(sidebarContent, '.sidebar');

// did ya try turning it on and off again?!?!?
if(location.hash.length > 3) {
  const hash = location.hash;
  location.hash = "";
  location.hash = hash;
}

const main = dom.main({render:'body'});

let activeCard;

const infoCard = (href, title, exampleCode, ...description) => div({
    render:main,
    class:'info-card',
    lifecycle: {
      mount(el) {
        route(href, hash => {
          el.scrollIntoView(smoothScrollSetting);
          if(activeCard) Class(activeCard, 'active', false);
          activeCard = Class(el, 'active', true);
        });
      }
    }
  },
  header(
    a({href: '#/'+href}, title)
  ),
  pre(
    code({class:'hljs javascript'}, exampleCode)
  ),
  div({class:'content'}, description)
);

infoCard('rilti.notifier', 'notifier',
`const pubsub = rilti.notifier(); // make notifier

pubsub.on('coffee', type => {
 console.log(type + ' is just so good!!');
});

pubsub.emit('coffee', 'americano');

// each event handle returns the handle function
// with these added control functions
handle.on();
handle.once();
handle.off();

const taskHandler = pubsub.on('task', val => {
  if(val === 'complete') {
    taskHandler.off();
    console.log('Task completed!');
  } else if(rilti.isNum(val)) {
    console.log('Task is '+val+'% done');
  }
});

`,
  p(`notifier is an event emitter or pub/sub pattern,
  it allows you to listen and trigger events and also pass values to listeners from the point of emission.`)
);

infoCard('rilti.each', 'each',
`const {each} = rilti; // get function

// loop through arrays or arraylike objects
each([1,2,3], (value, index, array) => {
  console.log('#'+value);
}); //-> [1,2,3]

// loop over a number
each(5000, num => console.log('#'+num)); //-> 5000

each({a:1, b:2, c:3}, (val, key, obj) => {
  console.log("obj."+key+" = "+val);
});
// *logs out*
//  obj.a = 1
//  obj.b = 2
//  obj.c = 3
//-> obj
`,
div("each is a simple loop function"),
div("each can loop through:"),
ul({
  css:{
    textAlign:'left',
    marginLeft:'2%'
  }
},
  [
   "maps, sets",
   "arraylikes",
   "objects",
   "ints: using chunking technique to stop total blockage with heavy workloads",
   "iterators: any raw iterator or object with a .entries method"
 ].map(v => li(b(v)))
)
);

  run(() => {
    console.info(`Loaded in ${performance.now() - commence}ms`);
  });
}
