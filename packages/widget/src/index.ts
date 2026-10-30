// Mounts the Talk2Buy chat widget on any page. The widget renders inside a shadow root, so the
// host page's styles and the widget's never mix.

import { h, render } from "preact";
import { App } from "./App";
import type { Language } from "./i18n";
import { styles } from "./styles";

export type Theme = "light" | "dark";

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
  // For logged-in customers: a short-lived token from the host's backend, sent with each request.
  getUserToken?: () => Promise<string | null> | string | null;
};

export type Widget = { ask: (text: string) => void; setTheme: (theme: Theme) => void; unmount: () => void };

export function mount(options: WidgetOptions): Widget {
  const host = document.createElement("div");
  host.setAttribute("data-talk2buy", "");
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = styles;
  shadow.appendChild(style);
  if (options.themeColor) host.style.setProperty("--t2b-accent", options.themeColor);
  host.dataset.theme = options.theme ?? "light";

  const root = document.createElement("div");
  root.className = "root";
  shadow.appendChild(root);

  let ask: (text: string) => void = () => {};
  render(
    h(App, {
      ...options,
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
