import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vuetify from 'vite-plugin-vuetify';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [
    vue(),
    vuetify({ autoImport: true }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
  base: './',
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    env: {
      VITE_API_BASE: 'https://example.test/shedule/api',
      VITE_BITRIX24_WEBHOOK: 'https://example.bitrix24.ru/rest/1/testtoken/',
      VITE_ADMIN_USER_ID: '21',
    },
  },
});
