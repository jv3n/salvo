import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/salvo/' : '/',
  server: { port: 5173, open: true },
  optimizeDeps: { exclude: ['@dimforge/rapier3d-compat'] },
});
