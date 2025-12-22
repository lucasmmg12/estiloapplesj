import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Manejar CORS flight request
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Obtener cotización del Dólar Blue de API externa
        console.log('Consultando API de Dólar Blue...')
        const response = await fetch('https://dolarapi.com/v1/dolares/blue')

        if (!response.ok) {
            throw new Error(`Error consultando API: ${response.statusText}`)
        }

        const data = await response.json()
        const precioVenta = data.venta
        const fechaActualizacion = data.fechaActualizacion

        console.log(`Cotización obtenida: $${precioVenta} (${fechaActualizacion})`)

        // 2. Inicializar cliente Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        const supabase = createClient(supabaseUrl, supabaseKey)

        // 3. Guardar en base de datos
        const { data: insertData, error: insertError } = await supabase
            .from('cotizacion_dolar')
            .insert([
                {
                    valor: precioVenta,
                    fuente: 'auto_dolarapi',
                    notas: `Actualizado automáticamente desde DolarApi.com. Fecha API: ${fechaActualizacion}`
                }
            ])
            .select()
            .single()

        if (insertError) {
            throw insertError
        }

        return new Response(
            JSON.stringify({
                message: 'Cotización actualizada correctamente',
                data: insertData,
                precio: precioVenta
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            },
        )

    } catch (error) {
        console.error('Error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            },
        )
    }
})
