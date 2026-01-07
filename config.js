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
        baseUrl: 'https://app.builderbot.cloud/api/v2',
        botId: 'e7b46f56-d304-4bef-8886-803d5fb393dd', // ID del Bot Principal (Provider)
        apiKey: import.meta.env.VITE_BUILDERBOT_WHATSAPP_KEY
    },

    // Builderbot Instagram
    instagram: {
        baseUrl: 'https://app.builderbot.cloud/api/v2',
        botId: 'e7b46f56-d304-4bef-8886-803d5fb393dd',
        apiKey: import.meta.env.VITE_BUILDERBOT_INSTAGRAM_KEY
    }
};

export default CONFIG;
