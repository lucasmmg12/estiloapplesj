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

async function deepInspect() {
    // 1. Let's see all distinct remitente_nombre in the database
    const { data: remitentes } = await supabase
        .from('mensajes')
        .select('remitente_nombre')
        .not('remitente_nombre', 'is', null);
    
    const remMap = {};
    (remitentes || []).forEach(r => {
        remMap[r.remitente_nombre] = (remMap[r.remitente_nombre] || 0) + 1;
    });
    console.log('Remitentes count (total with non-null):', remitentes ? remitentes.length : 0);
    console.log('Remitentes breakdown:', remMap);

    // 2. Fetch 500 outgoing messages evenly distributed across April, June, August, September
    const dates = [
        '2026-04-15T12:00:00Z',
        '2026-05-15T12:00:00Z',
        '2026-06-15T12:00:00Z',
        '2026-07-15T12:00:00Z',
        '2026-08-15T12:00:00Z',
        '2026-09-15T12:00:00Z'
    ];

    for (const d of dates) {
        const { data: sample } = await supabase
            .from('mensajes')
            .select('contenido, created_at')
            .eq('es_mio', true)
            .gte('created_at', d)
            .limit(10);
        console.log(`\n--- SAMPLE FROM ${d} ---`);
        (sample || []).forEach(m => console.log(`  - [${m.created_at.substring(0, 16)}] ${(m.contenido || '').substring(0, 80).replace(/\n/g, ' ')}`));
    }
}

deepInspect();
