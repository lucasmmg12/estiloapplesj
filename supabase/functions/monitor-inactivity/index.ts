
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuración Hardcoded por limitaciones de entorno en deploy anterior (ajustar si es posible .env)
const BUILDERBOT_API_URL = 'https://app.builderbot.cloud/api/v2';
// Usamos el ID de bot provider reportado por el usuario
const BUILDERBOT_BOT_ID = 'e7b46f56-d304-4bef-8886-803d5fb393dd';

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // Inicializar Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        // Api Key de Builderbot
        const builderbotKey = Deno.env.get('BUILDERBOT_WHATSAPP_KEY') || Deno.env.get('VITE_BUILDERBOT_WHATSAPP_KEY');

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Faltan vars de entorno Supabase');
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // 1. Obtener contactos que fueron pausados hace más de X tiempo (ej. 15 min)
        // Y que NO han sido reactivados ya (podríamos chequear si bot_paused_at no es null)

        // Tiempo límite: 15 minutos atrás
        const timeoutMinutes = 15;
        const timeLimit = new Date(Date.now() - timeoutMinutes * 60 * 1000).toISOString();

        const { data: contactos, error } = await supabase
            .from('contactos')
            .select('telefono, bot_paused_at')
            .not('bot_paused_at', 'is', null) // Solo los que están pausados
            .lt('bot_paused_at', timeLimit); // Que su pausa fue hace más de 15 min

        if (error) throw error;

        console.log(`Encontrados ${contactos.length} contactos para reactivar bot.`);

        let reactivatedCount = 0;

        for (const contacto of contactos) {
            // Llamar a API Builderbot para remover de blacklist
            const url = `${BUILDERBOT_API_URL}/${BUILDERBOT_BOT_ID}/blacklist`;

            // Intentar reactivar
            try {
                const resp = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-builderbot': builderbotKey
                    },
                    body: JSON.stringify({
                        number: contacto.telefono,
                        intent: 'remove'
                    })
                });

                if (resp.ok) {
                    // Si éxito, limpiar la columna bot_paused_at
                    await supabase
                        .from('contactos')
                        .update({ bot_paused_at: null })
                        .eq('telefono', contacto.telefono);

                    reactivatedCount++;
                    console.log(`Bot reactivado para ${contacto.telefono}`);
                } else {
                    console.error(`Error removiendo blacklist para ${contacto.telefono}: ${resp.statusText}`);
                }
            } catch (err) {
                console.error(`Excepción HTTP para ${contacto.telefono}:`, err);
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                processed: contactos.length,
                reactivated: reactivatedCount
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        );

    } catch (error) {
        console.error('Error en Monitor Inactividad:', error);
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        );
    }
});
