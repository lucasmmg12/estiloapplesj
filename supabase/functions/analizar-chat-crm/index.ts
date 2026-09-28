import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { transcript, phone, cliente_nombre } = await req.json()

    if (!transcript) {
      return new Response(JSON.stringify({ error: 'No transcript provided' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const openAiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openAiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OPENAI_API_KEY no configurada en las variables de entorno de Supabase.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    const systemPrompt = `Eres un asistente de inteligencia artificial para el CRM de Estilo Apple SJ (tienda de venta de iPhones nuevos/usados seleccionados, Plan Canje y servicio técnico oficial en San Juan, Argentina).
Tu tarea es analizar la conversación entre un cliente y el asesor y extraer con máxima precisión QUÉ ES LO QUE QUIERE EL CLIENTE, qué equipo busca, qué dudas tiene (batería, precio, capacidad, color, cuotas), si tiene equipo para Plan Canje y qué cotización o seña existe.

Debes responder ÚNICAMENTE un JSON válido (sin markdown, sin texto adicional) con esta estructura:
{
  "nombre": "Nombre del cliente si aparece en el chat o null",
  "dispositivo_interes": "Equipo, modelo y capacidad que busca el cliente (ej: 'iPhone 16 o 17 Usado (256 GB)')",
  "dispositivo_canje": "Equipo que el cliente entrega para Plan Canje o null si no aplica",
  "cotizacion_estimada": "Precio consultado, presupuesto enviado o diferencia estimada",
  "necesidad_cliente": "Qué quiere el cliente en 1 oración clara (ej: 'Busca iPhone 16 o 17 usado de 256GB. Consulta precios y porcentajes de batería para Plan Canje.')",
  "etiquetas": ["Etiqueta1", "Etiqueta2"],
  "notas": "Resumen ejecutivo para el vendedor: necesidad exacta del cliente, dudas principales y próximo paso comercial."
}

Las etiquetas permitidas son:
- "Plan Canje"
- "Venta Nueva"
- "Usado Seleccionado"
- "Servicio Técnico"
- "VIP"
- "Presupuestado"
- "Seña Recibida"
- "Local Patio San Ignacio"`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Cliente: ${cliente_nombre || 'Desconocido'} (${phone || 'S/N'})\n\nConversación:\n${transcript}` }
        ],
        temperature: 0.1,
      }),
    })

    const aiData = await response.json()
    if (!aiData.choices || !aiData.choices[0] || !aiData.choices[0].message) {
      throw new Error(aiData.error?.message || 'Error en respuesta de OpenAI')
    }

    let content = aiData.choices[0].message.content
    content = content.replace(/```json/gi, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(content)

    return new Response(JSON.stringify({ success: true, data: parsed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || 'Error procesando análisis de CRM' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
