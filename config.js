// ============================================
// CONFIGURACIÓN CENTRAL
// ============================================

const CONFIG = {
    // Supabase
    supabase: {
        url: import.meta.env.VITE_SUPABASE_URL || 'https://gyonguqndcsmudqmptfb.supabase.co',
        anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY
    },

    // Builderbot WhatsApp
    whatsapp: {
        apiKey: import.meta.env.VITE_BUILDERBOT_WHATSAPP_KEY,
        botId: import.meta.env.VITE_BUILDERBOT_WHATSAPP_BOT_ID || 'e7b46f56-d304-4bef-8886-803d5fb393dd',
        baseUrl: 'https://app.builderbot.cloud/api/v2'
    },

    // Builderbot Instagram
    instagram: {
        apiKey: import.meta.env.VITE_BUILDERBOT_INSTAGRAM_KEY,
        botId: import.meta.env.VITE_BUILDERBOT_INSTAGRAM_BOT_ID || '931b173b-f544-43a3-9e73-7ed55020ffa0',
        baseUrl: 'https://app.builderbot.cloud/api/v2'
    }
};

export default CONFIG;
