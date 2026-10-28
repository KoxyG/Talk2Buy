// Two builds: ES modules for bundlers (index.mjs, react.mjs) and one script file for a plain
// <script> tag (talk2buy.js, with Preact inside). React is never bundled.
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  esbuild: { jsx: "automatic", jsxImportSource: "preact" },
  build: mode === "script"
    ? {
        emptyOutDir: false,
        lib: { entry: "src/script.ts", name: "Talk2Buy", formats: ["iife"], fileName: () => "talk2buy.js" },
      }
    : {
        lib: { entry: { index: "src/index.ts", react: "src/react.ts" }, formats: ["es"], fileName: (_, name) => `${name}.mjs` },
        rollupOptions: { external: ["react"] },
      },
}));
