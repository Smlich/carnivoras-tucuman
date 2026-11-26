import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        catalogo: resolve(import.meta.dirname, 'catalogo.html'),
        vivero: resolve(import.meta.dirname, 'vivero.html'),
        cuidados: resolve(import.meta.dirname, 'cuidados.html'),
        juegos: resolve(import.meta.dirname, 'juegos.html'),
        contacto: resolve(import.meta.dirname, 'contacto.html'),
        admin: resolve(import.meta.dirname, 'admin.html'),
      },
    },
  },
  server: {
    host: '127.0.0.1',
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
    },
  },
});
