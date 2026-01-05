
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
    console.log('--- NUEVO MENSAJE INSTAGRAM RECIBIDO ---');
    console.log('Payload crudo:', JSON.stringify(payload));

    // Inicializar Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      console.error('ERROR CRITICO: Faltan variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
      throw new Error('Configuración incompleta del servidor');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Normalizar datos (Instagram suele venir del bot con la misma estructura que WhatsApp)
    const messages = Array.isArray(payload) ? payload : [payload];
    const inserts = [];

    for (const msg of messages) {
      // Extraer campos con máxima compatibilidad
      const idUsuario = msg.from || msg.phone || msg.id || msg.user_id || msg.numero || msg.number;
      const contenidoUsuario = msg.body || msg.content || msg.message || msg.mensaje || msg.texto;
      const respuestaIA = msg.respuesta || msg.aiResponse || msg.response || msg.answer || msg.reply;
      const media = msg.media || msg.mediaUrl || null;

      if (!idUsuario) {
        console.warn('⚠️ Mensaje omitido: No se encontró identificador (from/phone/id/numero) en el payload.', JSON.stringify(msg));
        continue;
      }

      // 1. Asegurarse de que el contacto existe con la plataforma INSTAGRAM
      const { error: contactError } = await supabase
        .from('contactos')
        .upsert({
          telefono: idUsuario.toString(),
          plataforma: 'instagram'
        }, { onConflict: 'telefono' });

      if (contactError) {
        console.error("Error upserting Instagram contact:", contactError);
      }

      // 2. Guardar mensaje del usuario
      if (contenidoUsuario || media) {
        inserts.push({
          cliente_telefono: idUsuario.toString(),
          contenido: contenidoUsuario || (media ? 'Archivo multimedia' : ''),
          media_url: media,
          es_mio: false,
          estado: 'received',
          plataforma: 'instagram' // Marcar como Instagram
        });
      }

      // 3. Guardar respuesta de la IA
      if (respuestaIA) {
        inserts.push({
          cliente_telefono: idUsuario.toString(),
          contenido: respuestaIA,
          media_url: null,
          es_mio: true,
          estado: 'sent',
          plataforma: 'instagram' // Marcar como Instagram
        });
      }
    }

    if (inserts.length > 0) {
      const { error } = await supabase
        .from('mensajes')
        .insert(inserts);

      if (error) {
        console.error('Error insertando mensajes de Instagram en Supabase:', error);
        throw error;
      }
      console.log(`✅ ${inserts.length} mensajes de Instagram guardados correctamente.`);
    }

    return new Response(
      JSON.stringify({ success: true, count: inserts.length, platform: 'instagram' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error en Webhook Instagram Live Chat:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
