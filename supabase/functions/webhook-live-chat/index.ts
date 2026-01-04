
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
        console.log('--- NUEVO MENSAJE RECIBIDO ---');
        console.log('Payload crudo:', JSON.stringify(payload));

        // Inicializar Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !supabaseKey) {
            console.error('ERROR CRITICO: Faltan variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
            throw new Error('Configuración incompleta del servidor');
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Normalizar datos (soportar array o objeto único)
        const messages = Array.isArray(payload) ? payload : [payload];

        const inserts = [];

        for (const msg of messages) {
            // Extraer campos
            const telefono = msg.from || msg.phone || msg.telefono || msg.numero;
            const contenidoUsuario = msg.body || msg.content || msg.message || msg.mensaje;
            const respuestaIA = msg.respuesta || msg.aiResponse || msg.response;
            const media = msg.media || msg.mediaUrl || null;

            if (!telefono) continue;

            // 1. Guardar mensaje del usuario (Recibido)
            if (contenidoUsuario || media) {
                inserts.push({
                    cliente_telefono: telefono,
                    contenido: contenidoUsuario || (media ? 'Archivo multimedia' : ''),
                    media_url: media,
                    es_mio: false, // Mensaje del cliente
                    estado: 'recibido'
                });
            }

            // 2. Guardar respuesta del asistente (Enviado) -> NUEVO
            if (respuestaIA) {
                inserts.push({
                    cliente_telefono: telefono,
                    contenido: respuestaIA,
                    media_url: null,
                    es_mio: true, // Mensaje nuestro (Bot/IA)
                    estado: 'enviado'
                });
            }
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
