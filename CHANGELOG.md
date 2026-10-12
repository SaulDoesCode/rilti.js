# Changelog

## 0.11.0

### Tooling
- Replaced Karma + Jasmine + Puppeteer with Vitest + jsdom, Travis with GitHub Actions.
- Rollup 4 + `@rollup/plugin-terser`; builds `dist/rilti.mjs` (ESM) next to the UMD `dist/rilti.js` / `dist/rilti.min.js`.
- `package.json` now has `exports`/`module`/`files`, so `import { dom } from 'rilti'` works.
- ESLint 9 with neostandard instead of standard 14.
- Dropped the fastify/compression/chokidar dev server (`init.js`) for a dependency-free `scripts/dev.mjs` that only listens on localhost and refuses path traversal/dotfiles.
- `npm audit`: 0 vulnerabilities (was 45 — 2 critical, 26 high — through the old toolchain).

### Security
- `merge` ignored `__proto__`/`constructor`/`prototype` keys and only copies own keys (prototype pollution).

### Behaviour changes
- `run` and the internal render queue use microtasks instead of `requestIdleCallback`, so rendering is no longer delayed until the browser is idle (that could take seconds). `runAsync` still uses idle time.
- `emitter` events are delivered in a microtask (previously idle callback).
- Lifecycle `mount` only fires once a node is actually in the document; descendants now receive `unmount`/`remount` too, and moving a node is not treated as unmount + remount.
- Only *registered* components get component lifecycle handling; other hyphenated tags behave like normal elements.
- Promises can be rendered; a placeholder comment is swapped for the resolved value.
- `$el.class = 'a b'` adds the classes (it used to throw).

### Fixes
- Memory leak: every proxied node was kept forever in a `Map` (now a `WeakMap`).
- Component configs were mutated per instance: the 2nd instance's `on` handlers became the 1st instance's off-switches, and `bind` initial values were lost after the first instance.
- Component `remount` hook fired twice; component plugins crashed on registration and were never invoked.
- Components registered after their elements existed never initialized.
- Numbers next to other renderables were dropped; items following `null`/`false` were skipped by `prime`.
- `dom`/`svg` proxies threw on symbol access (e.g. `console.log`, iteration) and were thenable.
- Stored class chains (`const Card = dom.div.card`) were mutated by later chaining.
- `dom.$div({...})` ignored the `$` (pure) prefix when options were given.
- A proxy node passed as the options arg was rendered twice.
- `dom.frag(html)` returned an array instead of a fragment.
- `$el.class`/`$el.attr` setters passed the wrong arguments; `delete $el.class.x` threw in strict mode.
- Native methods not on `HTMLElement.prototype` (SVG, Text) were returned unbound.
- `domfn.class` on arrays was unreachable; extra whitespace in class strings threw.
- `domfn.css('--custom-prop')` crashed; `attrToggle` reported inverted old/new values.
- `attr` events fired twice for changes made through `domfn.attr` on mounted elements.
- `domfn.remove` didn't remove detached-but-parented nodes and crashed on NodeLists.
- Listening with a handler object overwrote `on`/`off` on the DOM element and mutated the passed object.
- Capture listeners could not be removed; delegated listeners now match ancestors (`closest`) and receive the matched element as a 3rd argument.
- `databind` crashed without `views`, and bound input listeners to the wrong element.
- `isPromise(null)` threw.
