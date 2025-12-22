// ============================================
// EDGE FUNCTION: Webhook Instagram
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
    historial: any[];
    telefono: string;
    nombre: string;
}

serve(async (req) => {
    // Manejar CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // Obtener datos del webhook
        const payload: any = await req.json();

        console.log('Payload recibido:', JSON.stringify(payload, null, 2));

        // Extraer datos - soportar múltiples formatos de Builderbot
        // Formato 1: { historial, telefono, nombre }
        // Formato 2: { history, from, name }
        // Formato 3: Payload completo de Builderbot con metadata

        let historial = payload.historial || payload.history || [];
        let telefono = payload.telefono || payload.from || payload.phone || payload.username || '';
        let nombre = payload.nombre || payload.name || '';

        // Si viene en formato de Builderbot con metadata
        if (!historial.length && payload.messages) {
            historial = payload.messages;
        }

        // Si el teléfono viene vacío, intentar extraerlo de otros campos
        if (!telefono && payload.user) {
            telefono = payload.user.username || payload.user.id || '';
        }

        // Si el nombre viene vacío, usar el username o un valor por defecto
        if (!nombre) {
            nombre = payload.user?.name || telefono || 'Cliente Instagram';
        }

        // Validar que tengamos al menos el historial
        if (!historial || !Array.isArray(historial) || historial.length === 0) {
            throw new Error('Faltan datos requeridos: historial de conversación');
        }

        // Asegurar que tengamos identificador del usuario
        if (!telefono) {
            throw new Error('Falta el identificador del usuario de Instagram');
        }

        console.log('Datos extraídos:', {
            historial: historial.length + ' mensajes',
            telefono,
            nombre
        });

        // Inicializar Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Analizar conversación con OpenAI
        const openaiKey = Deno.env.get('OPENAI_API_KEY')!;

        const historialTexto = historial.map((msg: any) => {
            const rol = msg.role || msg.from || 'usuario';
            const contenido = msg.content || msg.body || msg.message || '';
            return `${rol}: ${contenido}`;
        }).join('\n');

        const prompt = `Analiza la siguiente conversación de Instagram y responde SOLO con un objeto JSON válido (sin bloques de código markdown, sin explicaciones adicionales).

Conversación:
${historialTexto}

Debes responder con este formato exacto:
{
  "resumen_breve": "una o dos palabras como Comprar, Averiguar, Consulta o Reclamo",
  "resumen_detallado": "descripción detallada de la conversación",
  "bullets": ["punto clave 1", "punto clave 2", "punto clave 3"],
  "intencion": "la intención principal: Comprar, Averiguar, Consulta o Reclamo"
}`;

        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openaiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'Eres un asistente que analiza conversaciones de ventas. Respondes ÚNICAMENTE con JSON válido, sin bloques de código markdown ni texto adicional.'
                    },
                    { role: 'user', content: prompt }
                ],
                response_format: { type: 'json_object' },
                temperature: 0.3,
            }),
        });

        if (!openaiResponse.ok) {
            throw new Error(`Error de OpenAI: ${openaiResponse.statusText}`);
        }

        const openaiData = await openaiResponse.json();

        // Extraer y parsear la respuesta de OpenAI de forma robusta
        let responseContent = openaiData.choices[0].message.content;
        console.log('Respuesta de OpenAI:', responseContent);

        // Limpiar la respuesta si viene en formato markdown
        // Remover bloques de código si existen
        responseContent = responseContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');

        // Intentar encontrar el JSON si está mezclado con texto
        const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            responseContent = jsonMatch[0];
        }

        let analisis;
        try {
            analisis = JSON.parse(responseContent);
        } catch (parseError) {
            console.error('Error parseando JSON de OpenAI:', parseError);
            console.error('Contenido recibido:', responseContent);

            // Si falla el parsing, crear un análisis por defecto
            analisis = {
                resumen_breve: 'Consulta',
                resumen_detallado: 'No se pudo analizar la conversación automáticamente.',
                bullets: ['Conversación recibida', 'Análisis pendiente'],
                intencion: 'Consulta'
            };
        }

        console.log('Análisis extraído:', analisis);

        // Buscar o crear cliente
        let { data: cliente, error: clienteError } = await supabase
            .from('clientes')
            .select('*')
            .eq('telefono', telefono)
            .single();

        if (clienteError && clienteError.code !== 'PGRST116') {
            throw clienteError;
        }

        if (!cliente) {
            // Crear nuevo cliente
            const { data: nuevoCliente, error: crearError } = await supabase
                .from('clientes')
                .insert({
                    telefono,
                    nombre,
                    plataforma: 'instagram',
                    intencion: analisis.intencion,
                    ultima_interaccion: new Date().toISOString(),
                })
                .select()
                .single();

            if (crearError) throw crearError;
            cliente = nuevoCliente;
        } else {
            // Actualizar cliente existente
            const { error: actualizarError } = await supabase
                .from('clientes')
                .update({
                    nombre,
                    intencion: analisis.intencion,
                    ultima_interaccion: new Date().toISOString(),
                })
                .eq('id', cliente.id);

            if (actualizarError) throw actualizarError;
        }

        // Guardar conversación
        const { data: conversacion, error: conversacionError } = await supabase
            .from('conversaciones')
            .insert({
                cliente_id: cliente.id,
                historial_completo: historial,
                resumen_breve: analisis.resumen_breve,
                resumen_detallado: analisis.resumen_detallado,
                bullets: analisis.bullets,
                intencion_detectada: analisis.intencion,
            })
            .select()
            .single();

        if (conversacionError) throw conversacionError;

        // Buscar o actualizar embudo de ventas
        const { data: embudoExistente } = await supabase
            .from('embudo_ventas')
            .select('*')
            .eq('cliente_id', cliente.id)
            .single();

        // Buscar mensaje automático configurado para esta intención
        const { data: mensajeAuto } = await supabase
            .from('mensajes_automaticos')
            .select('*')
            .eq('intencion', analisis.intencion)
            .eq('activo', true)
            .single();

        const fechaProximo = mensajeAuto
            ? new Date(Date.now() + mensajeAuto.dias_espera * 24 * 60 * 60 * 1000).toISOString()
            : null;

        if (!embudoExistente) {
            // Crear entrada en embudo
            await supabase
                .from('embudo_ventas')
                .insert({
                    cliente_id: cliente.id,
                    etapa: analisis.intencion,
                    mensaje_enviado: false,
                    fecha_proximo_mensaje: fechaProximo,
                });
        } else {
            // Actualizar embudo
            await supabase
                .from('embudo_ventas')
                .update({
                    etapa: analisis.intencion,
                    mensaje_enviado: false,
                    fecha_proximo_mensaje: fechaProximo,
                })
                .eq('id', embudoExistente.id);
        }

        return new Response(
            JSON.stringify({
                success: true,
                cliente_id: cliente.id,
                conversacion_id: conversacion.id,
                analisis,
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        );

    } catch (error) {
        console.error('Error en webhook Instagram:', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        );
    }
});
