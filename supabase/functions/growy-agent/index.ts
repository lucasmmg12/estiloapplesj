import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Manejo de preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { messages, tools, tool_choice, model, temperature, max_tokens } = await req.json()

    // La API Key se lee estrictamente de las variables de entorno del servidor / Edge Function
    const openAiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openAiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OPENAI_API_KEY no configurada en las variables de entorno de Supabase Edge Functions.' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    const payload: Record<string, unknown> = {
      model: model || 'gpt-4o-mini',
      messages: messages || [],
      temperature: temperature ?? 0.3,
    }

    if (tools && Array.isArray(tools) && tools.length > 0) {
      payload.tools = tools
      payload.tool_choice = tool_choice || 'auto'
    }

    if (typeof max_tokens === 'number') {
      payload.max_tokens = max_tokens
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const aiData = await response.json()

    return new Response(JSON.stringify(aiData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: response.status,
    })
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || 'Error interno en growy-agent' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
