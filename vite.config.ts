import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      strictPort: true,
      allowedHosts: [
        'localhost',
        '127.0.0.1',
        '.ngrok-free.app',
        '.ngrok.app',
        '.ngrok.io',
        '.run.app'
      ],
      cors: true,
      hmr: process.env.DISABLE_HMR === 'true' ? false : true,
      watch: {
        ignored: ['**/data/**', '**/dist/**', '**/*.json'],
      },
    },
  };
});
