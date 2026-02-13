import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
        '**/*.d.ts',
        '**/*.config.*',
      ],
      thresholds: {
        // Backend API routes: 80% minimum
        // Frontend components: 60% minimum
        // Critical paths (auth, billing, agent spawning): 90% coverage
        global: {
          branches: 60,
          functions: 60,
          lines: 60,
          statements: 60,
        },
        // Backend-specific higher thresholds for API routes
        'src/app/api/': {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        // Critical paths require 90% coverage
        'src/app/api/auth/': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
        'src/app/api/billing/': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
        'src/app/api/agents/': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
      },
    },
    deps: {
      interopDefault: true,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
