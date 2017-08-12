{
const commence = performance.now();
// get all the functions needed
const {notifier,model,each,pipe,compose,curry,dom,domfn,on,once,flatten,run,render,route,isObj,isFunc,isNum,isPrimitive,isNodeList,isNode,isStr,isEmpty} = rilti;
// getting dom related functions & generating all the tags used
const {div,h1,header,footer,span,nav,p,a,b,html,ul,li,pre} = dom;
const {Class,hasClass,replace,css,append} = domfn; // dom manip functions

// The Bridge: central "App" object / message center
var hub = model();

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

const tabs = tabObj => {

  const viewer = div({ class: 'tab-viewer' });
  const tabRack = div({ class: 'tab-rack' });

  div({
    render: 'body',
    class: 'tabs',
    on: {
      click({target: { tabName }}) {
        if(tabName) manager.activate(tabName);
      }
    }
  },
    tabRack,
    viewer
  );

  const manager = notifier({
    rack: new Map,
    content: new Map,
    active: '',
    activeTab: null,
    activeContent: null,
    tab(name, content) {

      manager.rack.set(name, div({
        render: tabRack,
        class: 'tab',
        props: {
          tabName: name
        }
      }, name));

      manager.content.set(name, div(html(content)));
      manager.emit('new', name);
    },
    has: name => manager.rack.has(name),
    activate(name) {
      if(name !== manager.active && manager.rack.has(name)) {
        const content = manager.content.get(name);
        const tab = manager.rack.get(name);

        const {activeTab, activeContent} = manager;
        if(activeTab) Class(activeTab, 'active', false);

        manager.activeTab = Class(tab, 'active', true);

        activeContent && activeContent.replaceWith ? activeContent.replaceWith(content) : viewer.appendChild(content);

        manager.activeContent = content;
        manager.active = name;

        return manager.emit('activate', name);
      }
    }
  });

  const tabNames = Object.keys(tabObj).filter(name => {
    const tabContent = tabObj[name];
    if(tabContent) {
      manager.tab(name, tabContent);
      return true;
    }
  });

  on(tabRack, 'wheel', ({deltaY}) => {
    if(manager.active) {
      // Active Button Index
      const abi = tabNames.indexOf(manager.active);
      if(abi != -1) {
        manager.activate(indexr(tabNames, abi)[deltaY > 1 ? 'after' : 'before']);
      }
    }
  }, {
    passive:true
  });

  return manager.activate(tabNames[0]);
}

var t = tabs({
  hello: `testing`,
  'new tab': 'tab number 2 here, is it working?',
  'sir tabsalot': 'hhhello? this is juan',
  tabulus: `Greetings, count Tabulus.`
});

/*
const sections = {
  '#/rilti': {
      list: [],
      active: ''
  },
  '#/rilti.isX': {
      list: [],
      active: ''
  },
  '#/rilti.dom': {
      list: [],
      active: ''
  },
  '#/rilti.domfn': {
      list: [],
      active: ''
  }
}

let activeTab;


dom.main({
  id: 'viewer',
  render: 'body'
},
  dom.nav({
    class: 'tabs'
  },
    ['rilti', '.isX', '.domfn', '.dom'].map(tab => div({
      class: 'tab',
      action(e, el) {
        if(activeTab && activeTab != el) Class(activeTab, 'active', false);
        activeTab = Class(el, 'active', true);
      }
    }, tab))
  ),
  dom.aside(
    header("curry")
  ),
  dom.article(
    div({
      class: 'description'
    }),
    dom.pre({
      class: 'language-javascript'
    },
      dom.code({
        class: 'language-javascript'
      })
    )
  )
);




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

const genDoc = (href, title, rawCode, ...description) => {

  const code = dom.code({
    class: 'language-javascript'
  },
    html(Prism.highlight(rawCode, Prism.languages.javascript))
  );

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

const buttons = new Map;

const fnbtn = (section, btns) => {
  buttons.set(section, new Set(btns));
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

fnbtn('rilti', internals.rilti.sort());
fnbtn('.isX', internals.is.sort());

each(internals.sub, (set, head) => {
  fnbtn('.'+head, set.sort());
});

fnbtn('.dom', ['query', 'queryAll', 'queryEach', 'create', 'anytag', 'domfrag', 'html']);

if(location.hash.length < 3 || location.hash === '#/rilti') location.hash = '#/rilti.compose';
*/

run(() => {
  console.info(`Loaded in ${performance.now() - commence}ms`);
});
}
