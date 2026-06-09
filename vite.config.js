import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'frontend',
  publicDir: 'public',
  plugins: [react()],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    watch: {
      ignored: [
        '**/api-lib/**',
        '**/backend/**',
        '**/data/**',
        '**/database/**',
        '**/digital-library-main/**',
        '**/digital_library/**',
        '**/dist/**',
        '**/docs/**',
        '**/logs/**',
        '**/ml-speech/**',
        '**/models/**',
        '**/speech-classifier/**',
        '**/speech_datasets/**',
        '**/test_audio/**',
        '**/tmp*/**',
        '**/training_logs/**',
        '**/uploads/**',
        '**/vendor/**',
      ],
    },
  },
});
