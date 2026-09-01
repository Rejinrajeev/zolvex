import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
  test: {
    // Node environment, not jsdom: this plan's automated tests cover pure
    // server-side logic (cookie/proxy helpers), never React component
    // rendering — see this plan's Global Constraints on the manual-vs-
    // automated testing split.
    environment: "node",
  },
});
