import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'node',
    // Restreint à nos tests de logique pure : évite de ramasser les tests legacy
    // node:test/TAP de src/lib/platform/__tests__/ (incompatibles vitest).
    include: ['src/lib/rsa/**/*.test.js'],
  },
});
