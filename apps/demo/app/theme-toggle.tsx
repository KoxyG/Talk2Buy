"use client";

// Dark is the default. Light is opt-in and remembered per browser; layout.tsx applies it before paint.

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [light, setLight] = useState(false);
  useEffect(() => setLight(document.documentElement.dataset.theme === "light"), []);

  function toggle() {
    const next = !light;
    setLight(next);
    if (next) document.documentElement.dataset.theme = "light";
    else delete document.documentElement.dataset.theme;
    try {
      localStorage.setItem("theme", next ? "light" : "dark");
    } catch {}
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={light ? "Switch to dark mode" : "Switch to light mode"}
    >
      {light ? "☾︎" : "☀︎"}
    </button>
  );
}
