
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
            // Extraer campos (soporta múltiples variantes de Builderbot/Webhooks)
            const telefono = msg.from || msg.phone || msg.telefono || msg.numero;
            const contenidoUsuario = msg.body || msg.content || msg.message || msg.mensaje;
            const respuestaIA = msg.respuesta || msg.aiResponse || msg.response || msg.answer;
            const media = msg.media || msg.mediaUrl || null;

            if (!telefono) {
                console.warn('Mensaje omitido: No se encontró teléfono en el payload.', msg);
                continue;
            }

            // 1. Asegurarse de que el contacto existe y asignar vendedor si es nuevo
            const { data: contact } = await supabase
                .from('contactos')
                .select('vendedor_asignado')
                .eq('telefono', telefono)
                .single();

            if (!contact) {
                const vendedorAleatorio = Math.random() < 0.5 ? 'Nahuel' : 'Cristofer';
                await supabase.from('contactos').insert({
                    telefono: telefono,
                    plataforma: 'whatsapp',
                    vendedor_asignado: vendedorAleatorio
                });
            } else if (!contact.vendedor_asignado) {
                const vendedorAleatorio = Math.random() < 0.5 ? 'Nahuel' : 'Cristofer';
                await supabase.from('contactos')
                    .update({ vendedor_asignado: vendedorAleatorio })
                    .eq('telefono', telefono);
            }

            // 2. Guardar mensaje del usuario (Recibido del cliente)
            if (contenidoUsuario || media) {
                inserts.push({
                    cliente_telefono: telefono,
                    contenido: contenidoUsuario || (media ? 'Archivo multimedia' : ''),
                    media_url: media,
                    es_mio: false, // Mensaje del cliente
                    estado: 'received',
                    plataforma: 'whatsapp'
                });
            }

            // 3. Guardar respuesta del asistente (Enviado por la IA/Bot)
            if (respuestaIA) {
                inserts.push({
                    cliente_telefono: telefono,
                    contenido: respuestaIA,
                    media_url: null,
                    es_mio: true, // Mensaje nuestro (Bot/IA)
                    estado: 'sent',
                    plataforma: 'whatsapp'
                });
            }
        }

        if (inserts.length > 0) {
            const { error } = await supabase
                .from('mensajes')
                .insert(inserts);

            if (error) {
                console.error('Error insertando mensajes en Supabase:', error);
                throw error;
            }
            console.log(`✅ ${inserts.length} mensajes guardados correctamente.`);
        } else {
            console.log('ℹ️ No se encontraron mensajes válidos para insertar.');
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

