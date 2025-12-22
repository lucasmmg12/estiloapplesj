import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                catalogo: resolve(__dirname, 'catalogo-publico.html'),
                canje: resolve(__dirname, 'lista-canje.html'),
            },
        },
    },
    server: {
        port: 3000,
        open: true
    }
});
