import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // 純函式單元測試使用 node 環境，不需要 jsdom
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
