import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://rotary-startup.org",
  build: {
    inlineStylesheets: "auto",
  },
  compressHTML: true,
});
