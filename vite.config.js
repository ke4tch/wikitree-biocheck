// vite.config.js

import { defineConfig } from 'vite'
import vue from "@vitejs/plugin-vue";

const path = require("path");
export default defineConfig({
 base: "https://apps.wikitree.com/apps/sands1865/biocheck/",
//  base: "https://apps.wikitree.com/apps/sands1865/testDebug/",
//  base: "https://apps.wikitree.com/apps/sands1865/test/",
  // you might want to take out the source map for deployment
//  build: {
//    sourcemap: "true",
//  },
  plugins: [vue()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
