"use client";

// The widget plus example buttons that send their text to it.

import { Talk2BuyWidget } from "@talk2buy/widget/react";
import { useRef } from "react";

const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL ?? "http://localhost:8787";
const CITIES = ["Lagos", "Abuja", "Port Harcourt", "Ibadan", "Kano", "Enugu", "Asaba"];

const EXAMPLES = [
  "Abeg find me jollof wey no pass 3k, make e reach me before 2pm.",
  "I need 5kg rice, 2 tins of tomato paste, one carton of Indomie and detergent.",
  "Wetin be mama put? I wan chop swallow and soup under 2k.",
  "Did my payment go through? When will it arrive?",
];

export function DemoWidget() {
  const ask = useRef<(text: string) => void>(() => {});
  return (
    <>
      <ul className="examples">
        {EXAMPLES.map((text) => (
          <li key={text}>
            <button type="button" onClick={() => ask.current(text)}>“{text}”</button>
          </li>
        ))}
      </ul>
      <Talk2BuyWidget projectId="sample" apiUrl={AGENT_URL} areas={CITIES} onReady={(w) => (ask.current = w.ask)} />
    </>
  );
}
