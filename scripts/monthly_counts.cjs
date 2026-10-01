const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
        let val = trimmed.substring(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
        }
        env[trimmed.substring(0, idx).trim()] = val;
    }
});

const supabase = createClient(env.VITE_SUPABASE_URL || env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

async function analyzeOutgoing() {
    console.log('--- MENSUAL OVERVIEW ---');
    const months = [
        { name: '2026-04', start: '2026-04-01T00:00:00Z', end: '2026-05-01T00:00:00Z' },
        { name: '2026-05', start: '2026-05-01T00:00:00Z', end: '2026-06-01T00:00:00Z' },
        { name: '2026-06', start: '2026-06-01T00:00:00Z', end: '2026-07-01T00:00:00Z' },
        { name: '2026-07', start: '2026-07-01T00:00:00Z', end: '2026-08-01T00:00:00Z' },
        { name: '2026-08', start: '2026-08-01T00:00:00Z', end: '2026-09-01T00:00:00Z' },
        { name: '2026-09', start: '2026-09-01T00:00:00Z', end: '2026-10-01T00:00:00Z' }
    ];

    console.log('--- MENSUAL OVERVIEW ---');
    for (const m of months) {
        // Total incoming (es_mio = false)
        const { count: incoming } = await supabase
            .from('mensajes')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', m.start)
            .lt('created_at', m.end)
            .eq('es_mio', false);

        // Total outgoing (es_mio = true)
        const { count: outgoing } = await supabase
            .from('mensajes')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', m.start)
            .lt('created_at', m.end)
            .eq('es_mio', true);

        // Total
        const { count: total } = await supabase
            .from('mensajes')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', m.start)
            .lt('created_at', m.end);

        console.log(`${m.name}: Total=${total}, Entrantes=${incoming}, Salientes=${outgoing}`);
    }
}

analyzeOutgoing();
