import { defineConfig } from 'vitest/config';
import { cloudflareTest } from '@cloudflare/vitest-pool-workers';

export default defineConfig({
  plugins: [cloudflareTest({ wrangler: { configPath: './apps/web/wrangler.jsonc' } })],
  test: {
    include: ['tests/**/*.test.ts'],
  },
});