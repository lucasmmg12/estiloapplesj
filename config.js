const CONFIG = {
    // Supabase Configuration
    supabase: {
        url: 'https://gyonguqndcsmudqmptfb.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5b25ndXFuZGNzbXVkcW1wdGZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxNzEyNzYsImV4cCI6MjA4MTc0NzI3Nn0.HLwKUCSOcZLYQgqdMxQWJ9D7QO6i6sNTqGUZCKCcyBM'
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
