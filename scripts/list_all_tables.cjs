const fs = require('fs');

const env = {};
fs.readFileSync('.env', 'utf8').split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        let val = trimmed.substring(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
        }
        env[key] = val;
    }
});

const token = env.SUPABASE_ACCESS_TOKEN;
const projectRef = 'gyonguqndcsmudqmptfb';

async function runSql(query) {
    const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
    });
    const data = await res.json();
    return { status: res.status, data };
}

async function main() {
    const q = `
        SELECT table_name, 
               (xpath('/row/cnt/text()', xml_count))[1]::text::int as approx_count
        FROM (
          SELECT table_name, 
                 query_to_xml(format('select count(*) as cnt from %I', table_name), false, true, '') as xml_count
          FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ) t
        ORDER BY table_name;
    `;
    const res = await runSql(q);
    console.log('Tables in public schema:');
    console.log(JSON.stringify(res, null, 2));
}

main();
