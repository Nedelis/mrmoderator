import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  envDir: path.resolve(__dirname, '..'),
  server: {
      port: 3000,
      host: true,
      proxy: {
          '/api': {
              target: 'http://localhost:8000',
              changeOrigin: true,
          },
      },
      allowedHosts: ['.cloudpub.ru'],
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});