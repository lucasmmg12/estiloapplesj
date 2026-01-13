import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { chatLog } = await req.json()

    if (!chatLog) {
      return new Response(JSON.stringify({ error: 'No chat log provided' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const openAiApiKey = Deno.env.get('OPENAI_API_KEY')

    const prompt = `Analiza la siguiente conversación de chat y responde SOLO con un objeto JSON válido (sin bloques de código markdown).

Conversación:
${chatLog}

Formato JSON requerido:
{
  "resumen_breve": "1-3 palabras (ej: Comprar iPhone 14)",
  "resumen_detallado": "Resumen ejecutivo de lo hablado",
  "bullets": ["Punto clave 1", "Punto clave 2", "Punto clave 3"],
  "intencion": "Una de: Comprar, Consulta, Averiguar, Reclamo, Servicio Técnico, Venta",
  "nombre_detectado": "El nombre del cliente si aparece en el chat (o null si no se encuentra)"
}`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Eres un estratega de ventas experto. Analizas conversaciones y extraes inteligencia de negocio. Respondes SOLO JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
      }),
    })

    const aiData = await response.json()
    let content = aiData.choices[0].message.content

    // Limpieza de Markdown si la IA lo incluye
    content = content.replace(/```json/g, '').replace(/```/g, '').trim();

    const analisis = JSON.parse(content)

    return new Response(JSON.stringify(analisis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
