import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: Number(process.env.PORT) || 5173,
  },
  build: {
    // wrangler.jsonc serves this directory.
    outDir: 'dist',
    target: 'es2022',
  },
});
