import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const openAiKey = env.VITE_OPENAI_API_KEY || env.OPENAI_API_KEY || '';

    return {
        define: {
            'process.env.OPENAI_API_KEY': JSON.stringify(openAiKey),
            'process.env.VITE_OPENAI_API_KEY': JSON.stringify(openAiKey),
            'import.meta.env.VITE_OPENAI_API_KEY': JSON.stringify(openAiKey)
        },
        build: {
            rollupOptions: {
                input: {
                    main: resolve(__dirname, 'index.html'),
                    catalogo: resolve(__dirname, 'catalogo-publico.html'),
                    canje: resolve(__dirname, 'lista-canje.html'),
                    chat: resolve(__dirname, 'chat.html'),
                    diagnostico: resolve(__dirname, 'diagnostico.html'),
                    paginaweb: resolve(__dirname, 'paginaweb/index.html'),
                },
            },
        },
        server: {
            port: 3000,
            open: true
        }
    };
});
