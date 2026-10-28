// Widget styles. They live inside a shadow root, so they can't leak into the host page. Inherited
// properties (colour, font) can still flow in through the host element, so they are set again on
// .root, which host CSS can't reach. --t2b-accent is the host's theme colour.

export const styles: string = `
:host {
  --t2b-accent: #0b6e4f;
  --t2b-on-accent: #ffffff;
  --t2b-bg: #ffffff;
  --t2b-surface: #f4f5f4;
  --t2b-border: #e2e4e2;
  --t2b-text: #1b1f1d;
  --t2b-muted: #5d6661;
  --t2b-danger: #b42318;
  all: initial;
}
.root {
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  font-size: 15px;
  font-weight: 400;
  line-height: 1.45;
  letter-spacing: normal;
  text-align: left;
  color: var(--t2b-text);
}
*, *::before, *::after { box-sizing: border-box; }
button, input, select { font: inherit; color: inherit; }
button { cursor: pointer; }
:focus-visible { outline: 2px solid var(--t2b-accent); outline-offset: 2px; }

.launcher {
  position: fixed; right: 20px; bottom: 20px; z-index: 2147483000;
  display: flex; align-items: center; gap: 8px;
  padding: 14px 18px; border: 0; border-radius: 999px;
  background: var(--t2b-accent); color: var(--t2b-on-accent);
  font-weight: 600; box-shadow: 0 6px 20px rgb(0 0 0 / 0.2);
}
.launcher svg { width: 20px; height: 20px; }

.panel {
  position: fixed; right: 20px; bottom: 20px; z-index: 2147483001;
  width: 400px; height: min(680px, calc(100vh - 40px));
  display: flex; flex-direction: column;
  background: var(--t2b-bg); border-radius: 16px; overflow: hidden;
  box-shadow: 0 12px 40px rgb(0 0 0 / 0.25);
}
@media (max-width: 640px) {
  .panel { inset: 0; width: 100%; height: 100%; border-radius: 0; }
  .launcher { right: 16px; bottom: 16px; }
}

.header {
  display: flex; align-items: center; gap: 12px; padding: 12px 16px;
  background: var(--t2b-accent); color: var(--t2b-on-accent);
}
.header .titles { flex: 1; min-width: 0; }
.header .title { font-weight: 700; font-size: 16px; }
.header .subtitle { font-size: 13px; opacity: 0.85; }
.icon-button {
  display: grid; place-items: center; width: 36px; height: 36px;
  border: 0; border-radius: 8px; background: transparent; color: inherit;
}
.icon-button:hover { background: rgb(255 255 255 / 0.15); }
.icon-button svg { width: 20px; height: 20px; }

.area {
  display: flex; align-items: center; gap: 8px; padding: 8px 16px;
  border-bottom: 1px solid var(--t2b-border); font-size: 13px; color: var(--t2b-muted);
}
.area select {
  flex: 1; padding: 6px 8px; border: 1px solid var(--t2b-border); border-radius: 8px;
  background: var(--t2b-bg); color: var(--t2b-text);
}

.log { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
.bubble { max-width: 85%; padding: 10px 14px; border-radius: 16px; white-space: pre-wrap; overflow-wrap: anywhere; }
.bubble.user { align-self: flex-end; background: var(--t2b-accent); color: var(--t2b-on-accent); border-bottom-right-radius: 4px; }
.bubble.assistant { align-self: flex-start; background: var(--t2b-surface); border-bottom-left-radius: 4px; }
.bubble.error { align-self: flex-start; background: #fdecea; color: var(--t2b-danger); }
.typing { align-self: flex-start; color: var(--t2b-muted); font-size: 13px; padding: 0 4px; }

.examples { display: flex; flex-direction: column; gap: 8px; }
.chip {
  align-self: flex-start; padding: 8px 12px; text-align: left;
  border: 1px solid var(--t2b-border); border-radius: 999px; background: var(--t2b-bg);
}
.chip:hover { border-color: var(--t2b-accent); }

.cards { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; scroll-snap-type: x mandatory; }
.product {
  flex: 0 0 200px; scroll-snap-align: start;
  display: flex; flex-direction: column; gap: 4px; padding: 12px;
  border: 1px solid var(--t2b-border); border-radius: 12px; background: var(--t2b-bg);
}
.product .name { font-weight: 600; }
.product .meta { font-size: 13px; color: var(--t2b-muted); }
.product .price { font-weight: 700; margin-top: auto; }
.note { font-size: 13px; color: var(--t2b-muted); }

.card { padding: 12px; border: 1px solid var(--t2b-border); border-radius: 12px; background: var(--t2b-bg); }
.card .shop { display: flex; justify-content: space-between; font-weight: 600; margin-top: 8px; }
.card .shop:first-child { margin-top: 0; }
.card .shop span:last-child { font-weight: 400; font-size: 13px; color: var(--t2b-muted); }
.card .line { display: flex; justify-content: space-between; gap: 12px; font-size: 14px; padding: 2px 0; }
.card .line span:last-child { white-space: nowrap; }
.card .total { display: flex; justify-content: space-between; font-weight: 700; padding-top: 8px; margin-top: 8px; border-top: 1px solid var(--t2b-border); }
.card .missing { margin-top: 8px; font-size: 13px; color: var(--t2b-danger); }
.card .status { font-size: 13px; color: var(--t2b-muted); }
.card .status.paid { color: var(--t2b-accent); font-weight: 600; }
.card .status.failed { color: var(--t2b-danger); }

.primary, .secondary {
  width: 100%; margin-top: 10px; padding: 10px 14px; border-radius: 10px; font-weight: 600;
}
.primary { border: 0; background: var(--t2b-accent); color: var(--t2b-on-accent); }
.secondary { border: 1px solid var(--t2b-accent); background: var(--t2b-bg); color: var(--t2b-accent); }
.small { width: auto; margin-top: 6px; padding: 6px 12px; font-size: 14px; }
button:disabled { opacity: 0.55; cursor: default; }

.composer { display: flex; gap: 8px; padding: 12px; border-top: 1px solid var(--t2b-border); }
.composer input {
  flex: 1; min-width: 0; padding: 10px 14px;
  border: 1px solid var(--t2b-border); border-radius: 999px; background: var(--t2b-bg);
  font-size: 16px; /* below 16px, iPhones zoom the page on focus */
}
.composer button {
  padding: 0 16px; border: 0; border-radius: 999px;
  background: var(--t2b-accent); color: var(--t2b-on-accent); font-weight: 600;
}
`;
