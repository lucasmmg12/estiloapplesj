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

const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectData() {
    // 1. Check mensajes_automaticos
    const { data: autoMsgs } = await supabase.from('mensajes_automaticos').select('*');
    console.log('--- MENSAJES AUTOMATICOS ---');
    console.log(autoMsgs);

    // 2. Check bot_config
    const { data: botConfig } = await supabase.from('bot_config').select('*');
    console.log('--- BOT CONFIG ---');
    console.log(botConfig);

    // 3. Check distinct remitente_nombre in mensajes
    const { data: remitentes, error: rErr } = await supabase
        .from('mensajes')
        .select('remitente_nombre')
        .not('remitente_nombre', 'is', null)
        .limit(20);
    console.log('--- SAMPLE REMITENTES NOT NULL ---', remitentes);

    // 4. Sample 20 outgoing messages from last month
    const { data: sampleOut } = await supabase
        .from('mensajes')
        .select('contenido, remitente_nombre, created_at, estado')
        .eq('es_mio', true)
        .order('created_at', { ascending: false })
        .limit(25);
    console.log('--- SAMPLE OUTGOING MESSAGES ---');
    sampleOut.forEach(m => console.log(`[${m.created_at}] (${m.remitente_nombre || 'NULL'}) ${m.contenido ? m.contenido.substring(0, 80) : ''}`));
}

inspectData();
