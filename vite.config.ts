import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    // Honor PORT so the dev server can be started on a free port when 5173 is taken.
    port: Number(process.env.PORT) || 5173,
  },
  build: {
    outDir: 'dist',
    // Hashed asset names are what makes the immutable cache headers safe (docs/milestones.md M6).
    assetsDir: 'assets',
    target: 'es2022',
    sourcemap: false,
  },
});
