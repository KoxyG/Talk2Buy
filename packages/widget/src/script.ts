// The <script> tag build. Mounts itself from data attributes:
//   <script src="talk2buy.js" data-project-id="choppaddi" data-api-url="https://…" defer></script>
// Optional: data-theme-color, data-theme (light or dark), data-language (en or pcm), data-area, data-areas ("Lagos,Abuja").
// For logged-in customers, add data-manual and call Talk2Buy.mount({ …, getUserToken }) yourself.

import { mount, type WidgetOptions } from "./index";

declare global {
  interface Window {
    Talk2Buy?: { mount: typeof mount };
  }
}

window.Talk2Buy = { mount };

const data = (document.currentScript as HTMLScriptElement | null)?.dataset;
if (data?.projectId && data.apiUrl && !("manual" in data)) {
  const options: WidgetOptions = {
    projectId: data.projectId,
    apiUrl: data.apiUrl,
    themeColor: data.themeColor,
    theme: data.theme === "dark" ? "dark" : "light",
    language: data.language === "pcm" ? "pcm" : "en",
    area: data.area,
    areas: data.areas?.split(",").map((a) => a.trim()).filter(Boolean),
  };
  if (document.body) mount(options);
  else document.addEventListener("DOMContentLoaded", () => mount(options));
}
