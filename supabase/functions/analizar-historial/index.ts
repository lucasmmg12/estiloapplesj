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
    const { chatLog, phone } = await req.json()

    if (!chatLog) {
      return new Response(JSON.stringify({ error: 'No chat log provided' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const openAiApiKey = Deno.env.get('OPENAI_API_KEY')

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
            content: 'Eres un asistente experto en ventas y atención al cliente. Tu tarea es analizar el historial de chat de un cliente y proporcionar un resumen ejecutivo corto (máximo 150 palabras) que incluya: Interés principal, tono del cliente, y estado de la negociación o puntos clave pendientes. Sé directo y profesional.'
          },
          {
            role: 'user',
            content: `Analiza el siguiente historial de chat para el cliente ${phone}:\n\n${chatLog}`
          }
        ],
        max_tokens: 300,
      }),
    })

    const aiData = await response.json()
    const resumen = aiData.choices[0].message.content

    return new Response(JSON.stringify({ resumen }), {
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
