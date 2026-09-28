import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const serverOpenAiKey = env.OPENAI_API_KEY || '';

    return {
        plugins: [
            {
                name: 'openai-server-proxy',
                configureServer(server) {
                    server.middlewares.use('/api/growy-chat', async (req, res, next) => {
                        if (req.method !== 'POST') return next();
                        let body = '';
                        req.on('data', chunk => { body += chunk; });
                        req.on('end', async () => {
                            try {
                                const parsed = JSON.parse(body || '{}');
                                const key = serverOpenAiKey || process.env.OPENAI_API_KEY;
                                if (!key) {
                                    res.statusCode = 500;
                                    res.setHeader('Content-Type', 'application/json');
                                    res.end(JSON.stringify({ error: 'OPENAI_API_KEY no configurada en el servidor (.env).' }));
                                    return;
                                }

                                const payload = {
                                    model: parsed.model || 'gpt-4o-mini',
                                    messages: parsed.messages || [],
                                    temperature: parsed.temperature ?? 0.3
                                };
                                if (parsed.tools && parsed.tools.length > 0) {
                                    payload.tools = parsed.tools;
                                    payload.tool_choice = parsed.tool_choice || 'auto';
                                }
                                if (parsed.max_tokens) {
                                    payload.max_tokens = parsed.max_tokens;
                                }

                                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${key}`
                                    },
                                    body: JSON.stringify(payload)
                                });

                                const data = await response.json();
                                res.statusCode = response.status;
                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify(data));
                            } catch (err) {
                                res.statusCode = 500;
                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify({ error: err.message }));
                            }
                        });
                    });
                }
            }
        ],
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
