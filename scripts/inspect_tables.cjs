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

async function inspectTables() {
    const candidateTables = ['mensajes', 'conversaciones', 'contactos', 'clientes', 'bot_logs', 'interacciones'];
    for (const t of candidateTables) {
        const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
        console.log(`Table ${t}: count = ${count}, error = ${error ? error.message : 'none'}`);
        if (!error && count > 0) {
            const { data } = await supabase.from(t).select('*').limit(1);
            console.log(`  Columns for ${t}:`, Object.keys(data[0]));
        }
    }
}
inspectTables();
