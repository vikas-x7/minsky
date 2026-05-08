import { defineConfig } from 'vitest/config';
import path from 'path';
import dotenv from 'dotenv';

// Load .env so DATABASE_URL is available for integration/concurrency tests
dotenv.config();

export default defineConfig({
  resolve: {
    alias: {
      '@repo/database': path.resolve(
        __dirname,
        '../../packages/database/src/index.ts',
      ),
    },
  },
  test: {
    environment: 'node',
    env: {
      NODE_ENV: 'test',
      ADMIN_API_KEY: 'admin-secret-key',
      PRICING_WEIGHT_TIME: '1.0',
      PRICING_WEIGHT_DEMAND: '1.0',
      PRICING_WEIGHT_INVENTORY: '1.0',
    },
    include: ['src/**/*.spec.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.spec.ts',
        'src/**/*.test.ts',
        'src/**/*.module.ts',
        'src/main.ts',
        'src/**/*.dto.ts',
      ],
    },
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
