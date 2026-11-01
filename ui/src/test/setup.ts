// Node 25+ ships a global `localStorage` that is undefined unless Node runs with
// --localstorage-file. Under vitest's jsdom environment that global shadows
// jsdom's working storage (window === globalThis), so restore jsdom's. CI runs
// Node 22, which has no such global, and Node 26, which does.
const dom = (globalThis as { jsdom?: { window: Window } }).jsdom;
if (dom) {
  for (const name of ["localStorage", "sessionStorage"] as const) {
    if (!globalThis[name]) Object.defineProperty(globalThis, name, { configurable: true, value: dom.window[name] });
  }
}
