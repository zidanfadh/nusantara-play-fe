import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Project root; mirrors tsconfig.json "paths": { "@/*": ["./*"] }.
const rootDir = fileURLToPath(new URL('./', import.meta.url));

export default defineConfig({
  resolve: {
    alias: [{ find: /^@\//, replacement: rootDir }],
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx}'],
    // Phase 29: 15 s instead of Vitest's 5 s, so the source-scanning and simulation tests stay green while the
    // machine is busy (a build or the backend suite running at the same time; Phase 23 and 26 cleanup items).
    testTimeout: 15_000,
  },
});
