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
        const { image, images } = await req.json();
        const imageList = images || (image ? [image] : []);

        if (!imageList || imageList.length === 0) {
            throw new Error('No se proporcionaron imágenes');
        }

        const openaiKey = Deno.env.get('OPENAI_API_KEY')!;

        // Prompt optimizado para detección técnica
        // Prompt optimizado para detección técnica avanzada
        const prompt = `
    Eres el Técnico Senior de "Estilo Apple SJ". Tu ojo es infalible.
    Analiza las imágenes proporcionadas en conjunto. Pueden ser diferentes ángulos del mismo dispositivo.

    OBJETIVOS:
    1. IDENTIFICAR MODELO: Mira la disposición de cámaras, notch, isla dinámica y bordes. (Ej: iPhone 13 Pro tiene cámaras grandes en triángulo, iPhone 12 bordes rectos). Si dudas, di "Posible iPhone [modelo]".
    2. DETECTAR DAÑOS (Multi-ángulo):
       - Si ves la pantalla rota -> "Módulo/Display dañado".
       - Si ves la parte trasera rota -> "Tapa trasera trizada".
       - Si ves golpes en marcos -> "Chasis golpeado".
       - Si ves varias cosas, ¡REPORTALAS TODAS!

    SALIDA JSON ESTRICTA:
    {
      "device_model": "iPhone [Modelo Exacto]", 
      "damage_description": "Descripción técnica concisa. Ej: 'Fractura severa en display frontal y astillado en cristal de tapa trasera superior'.",
      "recommended_repair": "Nombre de la reparación principal O combinada. Ej: 'Cambio de Módulo + Tapa Trasera' o 'Cambio de Módulo'.",
      "confidence": 95
    }

    NOTA: Si ves daños en ambas caras (frente y dorso), la reparación recomendada DEBE incluir ambas (ej: "Módulo + Tapa"). Sé técnico pero directo.
    `;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openaiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini', // Vision model
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: prompt },
                            ...imageList.map((img: string) => ({
                                type: 'image_url',
                                image_url: { url: img }
                            }))
                        ]
                    }
                ],
                max_tokens: 300
            }),
        });

        const data = await response.json();

        if (data.error) {
            throw new Error('OpenAI Error: ' + data.error.message);
        }

        const analysisContent = data.choices[0].message.content;

        // Limpiar JSON (a veces GPT pone markdown)
        const cleanJson = analysisContent.replace(/```json/g, '').replace(/```/g, '').trim();
        const result = JSON.parse(cleanJson);

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});
