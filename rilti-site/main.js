{
"use strict";
// get all the functions needed
const {notifier,model,each,pipe,compose,curry,dom,domfn,on,once,flatten,run,render,route,isObj,isFunc,isNum,isPrimitive,isNodeList,isNode,isStr,isEmpty} = rilti;
// getting dom related functions & generating all the tags used
const {div,h1,header,footer,span,nav,p,a,b,html,ul,li,pre} = dom;
const {Class,hasClass,replace,css,append} = domfn; // dom manip functions

// The Bridge: central "App" object / message center
var hub = model();

let activeButton;
let activeSection;

const toggleSection = (name, state) => {
  hub.emit('tgs:'+name, state);
}

const select = (el, state = true) => {
  if(el !== activeButton) {
    if(activeButton) {
      Class(activeButton, 'selected', false);
      activeButton = null;
    }
    if(el) {
      activeButton = Class(el, 'selected', state);
    }
  }
}

const indexr = (arr, i, len = arr.length) => ({
  get before() {
    if(len === 1) return arr[0];
    else if(len === 0) return null;
    else if(i === 0) return arr[len - 1];
    return arr[i - 1]
  },
  get after() {
    if(len === 1 || i === len - 1) return arr[0];
    else if(len === 0) return null;
    return arr[i+1];
  }
});

const sbHeader = (section, name, buttons) => {

  div({
    class:'sidebar-header',
    render: 'nav.sidebar > section.sidebar-headers',
    action(e, el) {
      toggleSection(name);
    }
  }, name);

  div({
    render: '.sidebar',
    class: 'sidebar-section',
    lifecycle : {
      create(el) {

        on(el, 'wheel', ({deltaY}) => {
          // Active Button Index
          const abi = buttons.indexOf(activeButton);
          if(abi != -1) {
            location.hash = indexr(buttons, abi)[deltaY > 1 ? 'after' : 'before'].name;
          }
        }, {
          passive:true
        });

        hub.on('tgs:'+name, state => {
            Class(el, 'open', state);
            if(hasClass(el, 'open')) {
              if(name !== activeSection) {
                if(isStr(activeSection)) toggleSection(activeSection, false);
                activeSection = name;
                location.hash = (buttons.includes(activeButton) ? activeButton : buttons[0]).name;
              }
            }
        });
      }
    }
  },
    buttons = buttons.map(btn => {
      if(isStr(btn)) {
        const href = `#/${section}.${btn}`;
        return a({
          class: 'sidebar-button',
          href,
          props: {
            name:href,
            get activate() {
              const el = this;
              return () => {
                select(el);
                hub.emit('selection:'+href);
                toggleSection(name, true);
              }
            }
          },
          lifecycle: {
            create(el) {
              if(btn.length >= 14) css(el, {
                fontSize: '.88em',
                lineHeight: '8.7mm'
              });
              else if(btn.length >= 11) css(el, {
                fontSize: '.94em',
                lineHeight: '8.4mm'
              });

              route(href, el.activate);

              if(location.hash === href) run(el.activate);
            }
          }

        }, btn);
      }
    })

  );
}

const inner = (el, newContent) => {
  el.innerHTML = '';
  el.append(...flatten(newContent));
}

const syncOnCreate = (prop, justText) => ({
  create(el) {
    const s = hub.sync(el);
    justText ? s(prop) : s(prop, inner);
  }
});

const viewer = dom.section({
  id: 'viewer',
  render: 'main',
},
  header({
    class: 'title',
    lifecycle: syncOnCreate('title', true)
  }, 'funcName'),
  div({
    class: 'description',
    lifecycle: syncOnCreate('description')
  }),
  pre({
    class: 'example language-javascript',
    lifecycle: syncOnCreate('code')
  })
);

const genDoc = (href, title, rawCode, ...description) => {

  const code = dom.code({
    class: 'language-javascript'
  },
    html(Prism.highlight(rawCode, Prism.languages.javascript))
  );

  hub.on('selection:#/'+href, () => {

    hub.update({ title, description, code });

    const {height} = viewer.getBoundingClientRect();
    if(height <= 210) {

    }
  });
}

genDoc('rilti.compose', 'compose',
`const { compose } = rilti;

const appropriateGreeting = name => {
  const hours = (new Date()).getHours();
  let greeting;

  if (hours < 12) {
    greeting = 'Good Morning';
  } else if (hours >= 12 && hours <= 17) {
    greeting = 'Good Afternoon';
  } else if (hours >= 17 && hours <= 24) {
    greeting = 'Good Evening';
  }

  return greeting + ' ' + name;
}

const say = msg => console.log(msg);

const GreetPerson = compose(say, appropriateGreeting);

GreetPerson('Mr Tom'); // -> Good Evening Mr Tom`,
  p(`compose multiple functions, string multiple functions together and join their results`)
);

genDoc('rilti.notifier', 'notifier',
`const pubsub = rilti.notifier(); // make notifier

const coffeeHandle = pubsub.on('coffee', type => {
 console.log(type + ' is just so good!!');
});

// each event handle returns the handle function
// with these added control functions
const {on, once, off} = coffeeHandle;

pubsub.emit('coffee', 'americano');

`,
  p(`notifier is an event emitter or pub/sub pattern,
  it allows you to listen and trigger events and also pass values to listeners from the point of emission.`)
);

genDoc('rilti.flatten', 'flatten',
`const {flatten} = rilti;

flatten([1, [2, [3, [4]], 5]]);
// => [1, 2, 3, 4, 5]`,
  p(`Flattens arrays and arraylike objects a single level deep.`)
);

genDoc('rilti.curry', 'curry',
`const {curry} = rilti;

const makeSentence = (subject, verb, object) => {
  console.log(\`\${subject} \${verb} \${object}.\`);
}

const abcSentenceMaker = curry(makeSentence);

// fn(arg 1) -> fn(arg 2) -> fn(arg 3) -> originalFN(1, 2, 3)
abcSentenceMaker("Mary")("drinks")("coffee");
// => "Mary drinks coffee."

// fn(arg 1, arg 2) -> fn(arg 3) -> originalFN(1, 2, 3)
abcSentenceMaker("XiaoZhao", "eats")("a burger");
// => "XiaoZhao eats a burger."

// fn(arg 1, arg2, arg3) -> originalFN(1, 2, 3)
abcSentenceMaker("Hendrik", "watches", "the game");
// => "Hendrik watches the game."

// curry only the first 2 arguments
const makeSVO = curry(makeSentence, 2);//<- this num
// is for the number of arguments to curry

// first 2 args already provided so we can't curry
makeSVO("The dog", "sleeps")("outside");
// -> type error string is not a function

makeSVO("The dog")("sleeps", "outside");
// -> "The dog sleeps outside."
`,
p(`Curry takes in functions and spits out functions that will keep returning functions until all of the parameters have values or a set number of parameters have values.`))

genDoc('rilti.pipe', 'pipe',
`const { pipe } = rilti;

const add = (a,b) => a+b;

const x = pipe(5)(add, 5)(add, 5)(add, 5)(); // -> 20;

const {Class, css, append, appendTo} = rilti.domfn;
const {div, header, p} = rilti.dom;

pipe(div())
// add a class to div element
(Class, 'material-panel')
// now append some children
(append,
 header("Good News Everyone!!!"),
 p(\`
  We've a fun new toy to play with called rilti.js,
  it let's you build things using 'mostleh...'
  functional wizardry.
 \`)
)
(appendTo, document.body) // finally add div to page
// pipes won't stop asking for funcs
// until it is executed without any arguments
(); // pipe chain stopped, -> <div.material-panel/>`,
  p(`pipe takes a value and returns a function that expects a function as the first parameter.`)
);

genDoc('rilti.each', 'each',
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
//-> obj`,
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
   "ints: with chunking technique to prevent total window \"freezing\" / blocking",
   "iterators: any raw iterator or object with a .entries method"
 ].map(v => li(v))
)
);

genDoc('rilti.isFunc', 'isFunc',
`const {isFunc} = rilti;

isFunc(() => 5) // -> true
isFunc('string') // -> false`,
p(`Checks if value is classified as a `, b(`Function`), ` object.`));

genDoc('rilti.isMap', 'isMap',
`const {isMap} = rilti;

isMap(new Map) // -> true
isMap({}) // -> false`,
p(`Checks whether or not a value is a `, b(`Map`), ` object.`));

genDoc('rilti.isObj', 'isObj',
`const {isObj} = rilti;

isObj({}) // -> true
isObj(56) // -> false`,
p(`Checks whether or not a value is a plain `, b(`Object.`)));

genDoc('rilti.isNum', 'isNum',
`const {isNum} = rilti;

isNum(56) // -> true
isNum({}) // -> false`,
p(`Checks whether or not a value is a `, b(`Number.`)));

// Dude!?!??!! like how's this for self-documentation
const internals = {
  rilti:[],
  is:[],
  sub: {}
}

each(rilti, (val, key) => {
  if(isFunc(val))
     (key.includes('is') ? internals.is : internals.rilti).push(key);
  if(isObj(val) && !isEmpty(val)) {
    internals.sub[key] = [];
    each(val, (v, k) => {
      if(isFunc(v)) internals.sub[key].push(k);
    });
  }
});

sbHeader('rilti', 'rilti', internals.rilti.sort());
sbHeader('rilti', '.isX', internals.is.sort());

each(internals.sub, (set, head) => {
  sbHeader('rilti.'+head, '.'+head, set.sort());
});

sbHeader('rilti.dom', '.dom', ['query', 'queryAll', 'queryEach', 'create', 'anytag', 'domfrag', 'html']);

route('#/home', () => {
  div({
    render: 'body',
    class: 'blackout',
  },
    dom.aside({
      class: 'home',
      css: {
        display:'block'
      },
    },
      div({
        class: 'quit-me',
        once: {
          click(e, el) {
            el.parentNode.parentNode.remove();
            location.hash = '#/rilti.compose';
          }
        }
      }),
      dom.h1('Hi there!'),
      dom.h3('this is rilti.js')
    )
  );
});

if(location.hash.length < 3 || location.hash === '#/rilti') location.hash = '#/home';

run(() => {
  console.info(`Loaded in ${performance.now() - commence}ms`);
});

}
