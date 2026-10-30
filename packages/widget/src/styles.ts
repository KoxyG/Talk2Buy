// Widget styles. They live inside a shadow root, so they can't leak into the host page. Inherited
// properties (colour, font) can still flow in through the host element, so they are set again on
// .root, which host CSS can't reach. --t2b-accent is the host's theme colour; --t2b-font, if the
// host sets it, replaces the system font (custom properties pass through `all: initial`).

export const styles: string = `
:host {
  --t2b-accent: #e2480f;
  --t2b-on-accent: #ffffff;
  --t2b-accent-text: var(--t2b-accent);
  --t2b-bg: #ffffff;
  --t2b-surface: #f5f5f4;
  --t2b-border: #e7e5e4;
  --t2b-text: #1c1917;
  --t2b-muted: #57534e;
  --t2b-success: #15803d;
  --t2b-danger: #b42318;
  --t2b-danger-bg: #fdecea;
  --t2b-glow: color-mix(in srgb, var(--t2b-accent) 14%, transparent);
  all: initial;
}
:host([data-theme="dark"]) {
  /* The accent lightened a little so accent-coloured text stays readable on near-black. */
  --t2b-accent-text: color-mix(in srgb, var(--t2b-accent), #fff 25%);
  --t2b-bg: #0f0f0f;
  --t2b-surface: #1a1a1a;
  --t2b-border: #2a2a2a;
  --t2b-text: #f5f5f5;
  --t2b-muted: #a3a3a3;
  --t2b-success: #4ade80;
  --t2b-danger: #ff8a7a;
  --t2b-danger-bg: #2a1512;
  --t2b-glow: color-mix(in srgb, var(--t2b-accent) 28%, transparent);
  color-scheme: dark;
}
.root {
  font-family: var(--t2b-font, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif);
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
:focus-visible { outline: 2px solid var(--t2b-accent-text); outline-offset: 2px; }

.launcher {
  position: fixed; right: 20px; bottom: 20px; z-index: 2147483000;
  display: flex; align-items: center; gap: 10px;
  padding: 14px 20px; border: 0; border-radius: 999px;
  background: var(--t2b-accent); color: var(--t2b-on-accent); font-weight: 600;
  box-shadow: 0 8px 28px color-mix(in srgb, var(--t2b-accent) 45%, transparent), 0 2px 6px rgb(0 0 0 / 0.2);
  transition: transform 0.2s;
}
.launcher:hover { transform: translateY(-2px); }
.launcher svg { width: 20px; height: 20px; }

.panel {
  position: fixed; right: 20px; bottom: 20px; z-index: 2147483001;
  width: 400px; height: min(680px, calc(100vh - 40px));
  display: flex; flex-direction: column;
  background: var(--t2b-bg); border: 1px solid var(--t2b-border); border-radius: 20px; overflow: hidden;
  box-shadow: 0 24px 60px rgb(0 0 0 / 0.3);
  animation: t2b-in 0.2s ease-out;
}
@keyframes t2b-in { from { opacity: 0; transform: translateY(12px); } }
@media (max-width: 640px) {
  .panel { inset: 0; width: 100%; height: 100%; border: 0; border-radius: 0; }
  .launcher { right: 16px; bottom: 16px; }
}

.header {
  display: flex; align-items: center; gap: 12px; padding: 14px 16px;
  border-bottom: 1px solid var(--t2b-border);
  background: radial-gradient(120% 160% at 0% 0%, var(--t2b-glow), transparent 60%), var(--t2b-bg);
}
.avatar {
  flex: none; display: grid; place-items: center; width: 38px; height: 38px; border-radius: 50%;
  background: var(--t2b-accent); color: var(--t2b-on-accent); box-shadow: 0 0 0 4px var(--t2b-glow);
}
.avatar svg { width: 20px; height: 20px; }
.header .titles { flex: 1; min-width: 0; }
.header .title { font-weight: 700; font-size: 16px; }
.header .subtitle { font-size: 13px; color: var(--t2b-muted); }
.icon-button {
  display: grid; place-items: center; width: 36px; height: 36px;
  border: 1px solid var(--t2b-border); border-radius: 10px; background: transparent; color: var(--t2b-muted);
}
.icon-button:hover { color: var(--t2b-text); border-color: var(--t2b-accent-text); }
.icon-button svg { width: 18px; height: 18px; }

.area {
  display: flex; align-items: center; gap: 10px; padding: 10px 16px;
  border-bottom: 1px solid var(--t2b-border); font-size: 13px; color: var(--t2b-muted);
}
.area select {
  flex: 1; padding: 8px 10px; border: 1px solid var(--t2b-border); border-radius: 10px;
  background: var(--t2b-surface); color: var(--t2b-text);
}

.log { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
.bubble { max-width: 85%; padding: 10px 14px; border-radius: 18px; white-space: pre-wrap; overflow-wrap: anywhere; }
.bubble.user { align-self: flex-end; background: var(--t2b-accent); color: var(--t2b-on-accent); border-bottom-right-radius: 6px; }
.bubble.assistant { align-self: flex-start; background: var(--t2b-surface); border: 1px solid var(--t2b-border); border-bottom-left-radius: 6px; }
.bubble.error { align-self: flex-start; background: var(--t2b-danger-bg); color: var(--t2b-danger); border-bottom-left-radius: 6px; }
.typing {
  align-self: flex-start; display: flex; gap: 4px; padding: 14px;
  background: var(--t2b-surface); border: 1px solid var(--t2b-border); border-radius: 18px; border-bottom-left-radius: 6px;
}
.typing span { width: 6px; height: 6px; border-radius: 50%; background: var(--t2b-muted); animation: t2b-dot 1.2s infinite ease-in-out; }
.typing span:nth-child(2) { animation-delay: 0.15s; }
.typing span:nth-child(3) { animation-delay: 0.3s; }
@keyframes t2b-dot { 0%, 60%, 100% { opacity: 0.3; transform: none; } 30% { opacity: 1; transform: translateY(-3px); } }

.reply { align-self: flex-start; max-width: 85%; display: flex; flex-direction: column; gap: 4px; }
.reply .bubble { max-width: 100%; }
.feedback { display: flex; gap: 2px; }
.rate {
  display: grid; place-items: center; width: 28px; height: 28px;
  border: 0; border-radius: 8px; background: transparent; color: var(--t2b-muted);
}
.rate:hover { color: var(--t2b-text); background: var(--t2b-surface); }
.rate svg { width: 16px; height: 16px; }
.feedback-form { display: flex; gap: 6px; }
.feedback-form input {
  flex: 1; min-width: 0; padding: 6px 12px; border: 1px solid var(--t2b-border); border-radius: 999px;
  background: var(--t2b-bg); font-size: 16px; /* below 16px, iPhones zoom the page on focus */
}
.feedback-form .small { margin-top: 0; }
.feedback-done { padding: 0 4px; font-size: 12px; color: var(--t2b-muted); }

.examples { display: flex; flex-direction: column; gap: 8px; }
.chip {
  align-self: flex-start; padding: 8px 14px; text-align: left;
  border: 1px solid var(--t2b-border); border-radius: 999px; background: var(--t2b-bg);
  transition: border-color 0.2s, background 0.2s;
}
.chip:hover { border-color: var(--t2b-accent-text); background: var(--t2b-glow); }

.cards { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; scroll-snap-type: x mandatory; }
.product {
  flex: 0 0 200px; scroll-snap-align: start;
  display: flex; flex-direction: column; gap: 4px; padding: 14px;
  border: 1px solid var(--t2b-border); border-radius: 16px;
  background: radial-gradient(100% 80% at 100% 0%, var(--t2b-glow), transparent 60%), var(--t2b-surface);
}
.product .name { font-weight: 600; }
.product .meta { font-size: 13px; color: var(--t2b-muted); }
.product .price { margin-top: auto; font-size: 17px; font-weight: 700; color: var(--t2b-accent-text); }
.note { font-size: 13px; color: var(--t2b-muted); }

.card { padding: 14px; border: 1px solid var(--t2b-border); border-radius: 16px; background: var(--t2b-surface); }
.card .shop { display: flex; justify-content: space-between; font-weight: 600; margin-top: 8px; }
.card .shop:first-child { margin-top: 0; }
.card .shop span:last-child { font-weight: 400; font-size: 13px; color: var(--t2b-muted); }
.card .line { display: flex; justify-content: space-between; gap: 12px; font-size: 14px; padding: 2px 0; }
.card .line span:last-child { white-space: nowrap; }
.card .total { display: flex; justify-content: space-between; font-size: 16px; font-weight: 700; padding-top: 10px; margin-top: 10px; border-top: 1px solid var(--t2b-border); }
.card .missing { margin-top: 8px; font-size: 13px; color: var(--t2b-danger); }
.card .status { font-size: 13px; color: var(--t2b-muted); }
.card .status.paid { color: var(--t2b-success); font-weight: 600; }
.card .status.failed { color: var(--t2b-danger); }

.primary, .secondary {
  width: 100%; margin-top: 12px; padding: 11px 14px; border-radius: 12px; font-weight: 600;
  transition: filter 0.2s, border-color 0.2s;
}
.primary {
  border: 0; background: var(--t2b-accent); color: var(--t2b-on-accent);
  box-shadow: 0 6px 18px color-mix(in srgb, var(--t2b-accent) 35%, transparent);
}
.primary:hover:not(:disabled) { filter: brightness(0.92); }
.secondary { border: 1px solid var(--t2b-border); background: var(--t2b-bg); color: var(--t2b-accent-text); }
.secondary:hover:not(:disabled) { border-color: var(--t2b-accent-text); }
.small { width: auto; margin-top: 6px; padding: 6px 12px; font-size: 14px; }
button:disabled { opacity: 0.55; cursor: default; }

/* The input has no outline of its own; the whole pill shows focus instead. */
.composer {
  display: flex; align-items: center; gap: 8px; margin: 12px; padding: 6px 6px 6px 16px;
  border: 1px solid var(--t2b-border); border-radius: 999px; background: var(--t2b-surface);
}
.composer:focus-within { border-color: var(--t2b-accent-text); }
.composer input {
  flex: 1; min-width: 0; padding: 6px 0; border: 0; outline: none; background: transparent;
  font-size: 16px; /* below 16px, iPhones zoom the page on focus */
}
.composer input::placeholder { color: var(--t2b-muted); }
.composer button {
  flex: none; display: grid; place-items: center; width: 38px; height: 38px;
  border: 0; border-radius: 50%; background: var(--t2b-accent); color: var(--t2b-on-accent);
}
.composer button svg { width: 18px; height: 18px; }

@media (prefers-reduced-motion: reduce) {
  .panel, .typing span { animation: none; }
  .launcher { transition: none; }
}
`;
