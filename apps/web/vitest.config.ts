import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Node environment, not jsdom: this plan's automated tests cover pure
    // server-side logic (cookie/proxy helpers), never React component
    // rendering — see this plan's Global Constraints on the manual-vs-
    // automated testing split.
    environment: "node",
  },
});
