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

async function sampleOutgoing() {
    // Fetch 200 random outgoing messages from across the 6 months
    const { data: msgs, error } = await supabase
        .from('mensajes')
        .select('id, contenido, created_at, estado, remitente_nombre, media_url, media_type')
        .eq('es_mio', true)
        .gte('created_at', '2026-04-01T00:00:00Z')
        .limit(100);

    console.log(`Fetched ${msgs.length} outgoing messages.`);
    // Let's see some samples
    for (let i = 0; i < 30; i++) {
        const m = msgs[i];
        console.log(`[${m.created_at}] [remitente: ${m.remitente_nombre}] text: ${(m.contenido || '').substring(0, 100).replace(/\n/g, ' ')}`);
    }

    // Check frequency of repeated exact texts
    // Let's get a large sample of outgoing message contents to see the top repeated outgoing texts
    const { data: topSample } = await supabase
        .from('mensajes')
        .select('contenido')
        .eq('es_mio', true)
        .gte('created_at', '2026-04-01T00:00:00Z')
        .limit(2000);

    const counts = {};
    for (const row of topSample) {
        const text = (row.contenido || '').trim();
        counts[text] = (counts[text] || 0) + 1;
    }
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    console.log('\n--- TOP REPEATED OUTGOING MESSAGES (Sample of 2000) ---');
    sorted.slice(0, 25).forEach(([txt, cnt]) => {
        console.log(`Count ${cnt}: ${txt.substring(0, 90).replace(/\n/g, ' ')}`);
    });
}

sampleOutgoing();
