const CONFIG = {
    // Supabase Configuration
    supabase: {
        url: 'https://gyonguqndcsmudqmptfb.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5b25ndXFuZGNzbXVkcW1wdGZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxNzEyNzYsImV4cCI6MjA4MTc0NzI3Nn0.HLwKUCSOcZLYQgqdMxQWJ9D7QO6i6sNTqGUZCKCcyBM'
    },
    // Builderbot WhatsApp
    whatsapp: {
        apiKey: 'bb-01f7a4a3-81de-458a-bf72-df9952f4b068',
        botId: 'e7b46f56-d304-4bef-8886-803d5fb393dd',
        baseUrl: 'https://app.builderbot.cloud/api/v2'
    },
    // Builderbot Instagram
    instagram: {
        apiKey: 'bb-8b7d01c7-eeca-4042-b2d7-7f5745cbc633',
        botId: '931b173b-f544-43a3-9e73-7ed55020ffa0',
        baseUrl: 'https://app.builderbot.cloud/api/v2'
    },
    // Otras configuraciones globales
    app: {
        name: 'Estilo Apple SJ',
        version: '2.0.0-PRO'
    }
};

// Export for ES6 modules
export default CONFIG;

// Also expose globally for legacy scripts
window.CONFIG = CONFIG;
