
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Manejar CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const payload = await req.json();
        console.log('Payload Live Chat recibido:', JSON.stringify(payload, null, 2));

        // Inicializar Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Normalizar datos (soportar array o objeto único)
        const messages = Array.isArray(payload) ? payload : [payload];

        const inserts = [];

        for (const msg of messages) {
            // Extraer campos básicos
            const telefono = msg.from || msg.phone || msg.telefono;
            const contenido = msg.body || msg.content || msg.message || msg.mensaje;
            const media = msg.media || msg.mediaUrl || null;

            // Ignorar mensajes vacíos o de sistema sin contenido útil
            if (!telefono || (!contenido && !media)) {
                continue;
            }

            // Preparar insert
            inserts.push({
                cliente_telefono: telefono,
                contenido: contenido || (media ? 'Archivo multimedia' : ''),
                media_url: media,
                es_mio: false, // Asumimos false porque viene del webhook (inbound)
                estado: 'recibido'
            });
        }

        if (inserts.length > 0) {
            const { error } = await supabase
                .from('mensajes')
                .insert(inserts);

            if (error) throw error;
        }

        return new Response(
            JSON.stringify({ success: true, count: inserts.length }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        );

    } catch (error) {
        console.error('Error en Webhook Live Chat:', error);
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400, // Bad Request
            }
        );
    }
});
