// api/growy-chat.js - Vercel Serverless Function for OpenAI
export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'OPENAI_API_KEY no configurada en las variables de entorno de Vercel.' });
    }

    try {
        const body = req.body || {};
        const payload = {
            model: body.model || 'gpt-4o-mini',
            messages: body.messages || [],
            temperature: body.temperature ?? 0.25,
            max_tokens: body.max_tokens || 250
        };

        if (body.tools && Array.isArray(body.tools) && body.tools.length > 0) {
            payload.tools = body.tools;
            payload.tool_choice = body.tool_choice || 'auto';
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        return res.status(response.status).json(data);
    } catch (err) {
        return res.status(500).json({ error: err.message || 'Error processing OpenAI request' });
    }
}
