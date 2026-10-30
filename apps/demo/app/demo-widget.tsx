"use client";

// The widget plus example buttons that send their text to it.

import { Talk2BuyWidget, type Theme } from "@talk2buy/widget/react";
import { useEffect, useRef, useState } from "react";

const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL ?? "http://localhost:8787";
const CITIES = ["Lagos", "Abuja", "Port Harcourt", "Ibadan", "Kano", "Enugu", "Asaba"];
// Darker than the page's orange so white button text on it stays readable (~5:1).
const THEME_COLOR = "#e2480f";

const EXAMPLES = [
  "Abeg find me jollof wey no pass 3k, make e reach me before 2pm.",
  "I need 5kg rice, 2 tins of tomato paste, one carton of Indomie and detergent.",
  "Wetin be mama put? I wan chop swallow and soup under 2k.",
  "Did my payment go through? When will it arrive?",
];

export function DemoWidget() {
  const ask = useRef<(text: string) => void>(() => {});
  const [theme, setTheme] = useState<Theme>("dark");

  // Follow the page's theme toggle, which sets data-theme on <html>.
  useEffect(() => {
    const html = document.documentElement;
    const sync = () => setTheme(html.dataset.theme === "light" ? "light" : "dark");
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(html, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <ul className="examples">
        {EXAMPLES.map((text) => (
          <li key={text}>
            <button type="button" onClick={() => ask.current(text)}>
              <span>“{text}”</span>
              <span className="arrow" aria-hidden="true">↗</span>
            </button>
          </li>
        ))}
      </ul>
      <Talk2BuyWidget
        projectId="sample"
        apiUrl={AGENT_URL}
        areas={CITIES}
        themeColor={THEME_COLOR}
        theme={theme}
        feedback
        onReady={(w) => (ask.current = w.ask)}
      />
    </>
  );
}
