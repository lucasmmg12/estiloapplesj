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

// Bot identification rules based on SYSTEM_PROMPT_ASESOR and AI bot patterns
function isBotMessage(text) {
    if (!text) return false;
    const t = text.trim();

    // Typical human agent phrases
    if (/te (estuvo respondiendo|respondía|estuvo hablando) el bot/i.test(t)) return false;
    if (/(soy nahuel|soy cristofer|soy edu|mi nombre es agos|te escribe agos|soy agos|mi nombre es nahuel|mi nombre es cristofer|mi nombre es edu)/i.test(t)) return false;
    if (/_event_voice_note__|_event_media__/i.test(t)) return false; // WhatsApp voice note or media uploaded by agent
    if (/^https:\/\/mpago\.li\//i.test(t)) return false;

    // Typical Bot Signatures / Prompts / Templates
    if (/Soy de \*Estilo Apple\*|Soy \*Estilo Apple\*|equipo de \*Estilo Apple\*|en \*Estilo Apple\*/i.test(t)) return true;
    if (/Patio San Ignacio, Local 7/i.test(t)) return true;
    if (/https:\/\/docs\.google\.com\/spreadsheets\/d\/1KNaD8SWCj_YBpbcs2ZgbhuBa1rxx6OqT1Kju3DkevzY/i.test(t)) return true;
    if (/escribi(me|r)? (\*?fin\*?)/i.test(t)) return true;
    if (/por el momento (solo|únicamente) estamos tomando equipos a partir del iphone 13/i.test(t)) return true;
    if (/solo tomamos equipos a partir del iphone 13/i.test(t)) return true;
    if (/necesitamos evaluar su bater[ií]a y est[eé]tica en persona/i.test(t)) return true;
    if (/¡Perfecto! Ya derivo tu consulta\. En un ratito un asesor/i.test(t)) return true;
    if (/¡Gracias por el audio! 👍 Ya lo escuch/i.test(t)) return true;
    if (/Haz enviado la siguiente imagen:/i.test(t)) return true;
    if (/Para ver el stock real y los (valores|precios) actualizados al instante/i.test(t)) return true;
    if (/¡Hola! 👋 Qué lindo que nos escribas/i.test(t)) return true;
    if (/¡Hola! 👋 Bienvenido/i.test(t)) return true;
    if (/¡Buen día! 👋 Soy de/i.test(t)) return true;
    if (/¿En qué puedo darte una mano hoy\?/i.test(t)) return true;
    if (/Antes de seguir, ¿cómo es tu nombre\?/i.test(t)) return true;
    if (/Antes que nada, ¿cómo es tu nombre\?/i.test(t)) return true;
    if (/contame tu nombre así/i.test(t)) return true;
    if (/experto(s)? en apple acá en san juan/i.test(t)) return true;

    // Additional bot AI indicators:
    // AI advisor uses formal polite phrasing with bullet markdown:
    if (t.includes('👉') && (t.includes('Apple') || t.includes('iPhone') || t.includes('local'))) return true;

    return false;
}

async function testClassifier() {
    // Test on 500 outgoing messages
    const { data: msgs } = await supabase
        .from('mensajes')
        .select('contenido, created_at')
        .eq('es_mio', true)
        .gte('created_at', '2026-09-01T00:00:00Z')
        .limit(300);

    let botCount = 0;
    let agentCount = 0;
    const agentSamples = [];
    const botSamples = [];

    msgs.forEach(m => {
        if (isBotMessage(m.contenido)) {
            botCount++;
            if (botSamples.length < 5) botSamples.push(m.contenido);
        } else {
            agentCount++;
            if (agentSamples.length < 5) agentSamples.push(m.contenido);
        }
    });

    console.log(`Sample 300 September messages: Bot=${botCount} (${(botCount/300*100).toFixed(1)}%), Agent=${agentCount} (${(agentCount/300*100).toFixed(1)}%)`);
    console.log('\nBot samples:');
    botSamples.forEach(s => console.log(' BOT ->', s.substring(0, 90).replace(/\n/g, ' ')));
    console.log('\nAgent samples:');
    agentSamples.forEach(s => console.log(' AGENT ->', s.substring(0, 90).replace(/\n/g, ' ')));
}

testClassifier();
