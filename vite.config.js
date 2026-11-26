import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        catalogo: resolve(import.meta.dirname, 'catalogo.html'),
        vivero: resolve(import.meta.dirname, 'vivero.html'),
        cuidados: resolve(import.meta.dirname, 'cuidados.html'),
        juegos: resolve(import.meta.dirname, 'juegos.html'),
        'jugar-dionaea': resolve(import.meta.dirname, 'jugar-dionaea.html'),
        contacto: resolve(import.meta.dirname, 'contacto.html'),
        admin: resolve(import.meta.dirname, 'admin.html'),
        privacidad: resolve(import.meta.dirname, 'privacidad.html'),
        terminos: resolve(import.meta.dirname, 'terminos.html'),
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
