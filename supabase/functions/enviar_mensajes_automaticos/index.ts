// ============================================
// EDGE FUNCTION: Enviar Mensajes Automáticos
// Ejecutar como cron job diario
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // Inicializar Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // API keys de Builderbot
        const whatsappApiKey = Deno.env.get('BUILDERBOT_WHATSAPP_KEY')!;
        const instagramApiKey = Deno.env.get('BUILDERBOT_INSTAGRAM_KEY')!;
        const whatsappBotId = 'e7b46f56-d304-4bef-8886-803d5fb393dd';
        const instagramBotId = '931b173b-f544-43a3-9e73-7ed55020ffa0';

        // Buscar clientes que necesitan mensaje automático
        const { data: embudos, error: embudosError } = await supabase
            .from('embudo_ventas')
            .select(`
        *,
        clientes (*)
      `)
            .eq('mensaje_enviado', false)
            .lte('fecha_proximo_mensaje', new Date().toISOString());

        if (embudosError) throw embudosError;

        const resultados = [];

        for (const embudo of embudos || []) {
            try {
                const cliente = embudo.clientes;

                // Buscar mensaje automático configurado
                const { data: mensajeAuto } = await supabase
                    .from('mensajes_automaticos')
                    .select('*')
                    .eq('intencion', cliente.intencion)
                    .eq('activo', true)
                    .single();

                if (!mensajeAuto) {
                    console.log(`No hay mensaje automático para intención: ${cliente.intencion}`);
                    continue;
                }

                // Determinar API según plataforma
                const apiKey = cliente.plataforma === 'whatsapp' ? whatsappApiKey : instagramApiKey;
                const botId = cliente.plataforma === 'whatsapp' ? whatsappBotId : instagramBotId;
                const url = `https://app.builderbot.cloud/api/v2/${botId}/messages`;

                // Enviar mensaje
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-builderbot': apiKey,
                    },
                    body: JSON.stringify({
                        messages: {
                            content: mensajeAuto.mensaje,
                            mediaUrl: mensajeAuto.media_url || undefined,
                        },
                        number: cliente.telefono,
                        checkIfExists: false,
                    }),
                });

                if (!response.ok) {
                    throw new Error(`Error al enviar mensaje: ${response.statusText}`);
                }

                // Marcar como enviado
                await supabase
                    .from('embudo_ventas')
                    .update({ mensaje_enviado: true })
                    .eq('id', embudo.id);

                resultados.push({
                    cliente: cliente.nombre,
                    telefono: cliente.telefono,
                    plataforma: cliente.plataforma,
                    mensaje_enviado: true,
                });

            } catch (error) {
                console.error(`Error procesando cliente ${embudo.clientes?.nombre}:`, error);
                resultados.push({
                    cliente: embudo.clientes?.nombre,
                    error: error.message,
                });
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                procesados: resultados.length,
                resultados,
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        );

    } catch (error) {
        console.error('Error en envío automático:', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            }
        );
    }
});
