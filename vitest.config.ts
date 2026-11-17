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
  },
});
