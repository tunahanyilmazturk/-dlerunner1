import { defineConfig } from 'vite';

export default defineConfig({
  // Göreli yollar: build çıktısı herhangi bir statik hostta (itch.io, GitHub Pages) çalışır
  base: './',
  server: {
    port: 5173,
    open: false,
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
        },
      },
    },
  },
});
