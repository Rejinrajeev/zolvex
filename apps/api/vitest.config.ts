import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./src/test-setup.ts"],
    // Load-bearing, do not remove: every test file shares the ONE test database
    // and cleans it with unscoped deleteMany() calls (schema.test.ts wipes every
    // table; approvable-resource.test.ts wipes Service/AuditLog after each test).
    // Running files in parallel would let one file's cleanup delete another
    // file's fixtures mid-test.
    fileParallelism: false,
  },
});
