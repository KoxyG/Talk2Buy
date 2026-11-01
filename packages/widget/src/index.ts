// Mounts the Talk2Buy chat widget on any page. The widget renders inside a shadow root, so the
// host page's styles and the widget's never mix.

import { h, render } from "preact";
import type { OrderSummary } from "./api";
import { App } from "./App";
import type { Language } from "./i18n";
import { styles } from "./styles";

export type Theme = "light" | "dark";

// What the widget reports to the page around it.
export type WidgetEvent =
  | { type: "orders"; orders: OrderSummary[]; total: number } // waiting for the customer's Confirm
  | { type: "confirmed"; orderIds: string[] };

export type WidgetOptions = {
  projectId: string;
  apiUrl: string;
  themeColor?: string;
  // Light by default. Change it later with widget.setTheme(), e.g. to follow the host's toggle.
  theme?: Theme;
  language?: Language;
  // A fixed delivery city (e.g. from the customer's saved address), or a list to choose from.
  area?: string;
  areas?: string[];
  title?: string;
  // Shows thumbs up/down under each reply. Off by default.
  feedback?: boolean;
  // Shows a mic button that turns speech into text in the input box. Off by default.
  voice?: boolean;
  // "popup" (default): a floating button that opens the chat over the page.
  // "inline": the chat fills `container` and is always open, e.g. inside a frame.
  layout?: "popup" | "inline";
  // Where the widget is added. Defaults to document.body.
  container?: HTMLElement;
  // Inline only: shows a close button that calls this.
  onClose?: () => void;
  onEvent?: (event: WidgetEvent) => void;
  // For logged-in customers: a short-lived token from the host's backend, sent with each request.
  getUserToken?: () => Promise<string | null> | string | null;
};

export type Widget = { ask: (text: string) => void; setTheme: (theme: Theme) => void; unmount: () => void };

export function mount(options: WidgetOptions): Widget {
  const host = document.createElement("div");
  host.setAttribute("data-talk2buy", "");
  (options.container ?? document.body).appendChild(host);
  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = styles;
  shadow.appendChild(style);
  if (options.themeColor) host.style.setProperty("--t2b-accent", options.themeColor);
  host.dataset.theme = options.theme ?? "light";
  host.dataset.layout = options.layout ?? "popup";

  const root = document.createElement("div");
  root.className = "root";
  shadow.appendChild(root);

  let ask: (text: string) => void = () => {};
  render(
    h(App, {
      ...options,
      inline: options.layout === "inline",
      language: options.language ?? "en",
      onAsk: (fn) => {
        ask = fn;
        return () => (ask = () => {});
      },
    }),
    root,
  );

  return {
    ask: (text) => ask(text),
    setTheme: (theme) => {
      host.dataset.theme = theme;
    },
    unmount: () => {
      render(null, root);
      host.remove();
    },
  };
}
