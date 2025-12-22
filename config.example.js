// ============================================
// CONFIGURACIÓN CENTRAL
// ============================================

const CONFIG = {
    // Supabase
    supabase: {
        url: 'https://gyonguqndcsmudqmptfb.supabase.co',
        anonKey: 'YOUR_SUPABASE_ANON_KEY'
    },

    // Builderbot WhatsApp
    whatsapp: {
        apiKey: 'YOUR_WHATSAPP_API_KEY',
        botId: 'YOUR_WHATSAPP_BOT_ID',
        baseUrl: 'https://app.builderbot.cloud/api/v2'
    },

    // Builderbot Instagram
    instagram: {
        apiKey: 'YOUR_INSTAGRAM_API_KEY',
        botId: 'YOUR_INSTAGRAM_BOT_ID',
        baseUrl: 'https://app.builderbot.cloud/api/v2'
    }
};

export default CONFIG;
