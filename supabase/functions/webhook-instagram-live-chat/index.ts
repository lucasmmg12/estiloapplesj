
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
    // console.log('Payload crudo:', JSON.stringify(payload)); 

    // Inicializar Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      console.error('ERROR CRITICO: Faltan variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
      throw new Error('Configuración incompleta del servidor');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Normalizar datos (soportar array o objeto)
    let rawItems = [];
    if (Array.isArray(payload)) {
      rawItems = payload;
    } else {
      rawItems = [payload];
    }

    const inserts = [];
    let contactsUpdated = 0;

    for (const item of rawItems) {
      // DETECTAR ESTRUCTURA
      // Estructura nueva (BuilderBot/Provider): { eventName: 'message.incoming', data: { ... } }
      // Estructura vieja custom: { from: '...', body: '...' }

      let data = item;
      let eventName = null;

      if (item.eventName && item.data) {
        // Es la nueva estructura
        eventName = item.eventName;
        data = item.data;
      }

      // Extraer campos clave
      const idUsuario = data.from || data.phone || data.id || data.user_id || data.numero || data.number || (data.key ? data.key.remoteJid : null);

      if (!idUsuario) {
        if (eventName !== 'status.online') {
          console.warn('⚠️ Mensaje omitido: No se encontró identificador (from/phone/id) en el payload.', JSON.stringify(item));
        }
        continue;
      }

      const contenidoUsuario = data.body || data.content || data.message || data.mensaje || data.texto;
      const pushName = data.pushName || data.name || data.username || null; // Instagram suele tener username

      // Determinar si es mio o del cliente
      let esMio = false;
      if (data.key && typeof data.key.fromMe === 'boolean') {
        esMio = data.key.fromMe;
      } else if (data.es_mio !== undefined) {
        esMio = data.es_mio;
      }

      // Si es la estructura nueva, el 'body' suele ser el mensaje. 
      let textoFinal = contenidoUsuario;
      if (!textoFinal && data.message) {
        if (data.message.conversation) textoFinal = data.message.conversation;
        else if (data.message.extendedTextMessage) textoFinal = data.message.extendedTextMessage.text;
        else if (data.message.imageMessage) textoFinal = data.message.imageMessage.caption || '📷 Imagen';
        else if (data.message.videoMessage) textoFinal = data.message.videoMessage.caption || '🎥 Video';
      }

      // 1. Asegurarse de que el contacto existe y asignar vendedor si es nuevo (INSTAGRAM)
      const { data: contact } = await supabase
        .from('contactos')
        .select('*')
        .eq('telefono', idUsuario.toString())
        .single();

      const updates: any = {};
      let shouldUpdate = false;

      if (!contact) {
        updates.telefono = idUsuario.toString();
        updates.plataforma = 'instagram';
        updates.vendedor_asignado = Math.random() < 0.5 ? 'Nahuel' : 'Cristofer';
        if (pushName) updates.nombre = pushName;

        await supabase.from('contactos').insert(updates);
        contactsUpdated++;
      } else {
        // Actualizar existente si tenemos datos nuevos (ej: pushName)
        if (pushName && (!contact.nombre || contact.nombre === idUsuario.toString())) {
          updates.nombre = pushName;
          shouldUpdate = true;
        }

        if (!contact.vendedor_asignado) {
          updates.vendedor_asignado = Math.random() < 0.5 ? 'Nahuel' : 'Cristofer';
          shouldUpdate = true;
        }

        // Si el contacto ya existía pero no teniamos la plataforma registrada (ej. migración), la actualizamos
        if (!contact.plataforma || contact.plataforma !== 'instagram') {
          updates.plataforma = 'instagram';
          shouldUpdate = true;
        }

        if (shouldUpdate) {
          await supabase.from('contactos').update(updates).eq('telefono', idUsuario.toString());
          contactsUpdated++;
        }
      }

      // 2. Insertar mensaje
      if (textoFinal || data.mediaUrl || eventName === 'message.incoming') {
        const contentToSave = textoFinal
          || (data.mediaUrl ? 'Archivo multimedia' : '')
          || (eventName === 'message.incoming' ? 'Mensaje recibido (formato desconocido)' : null);

        if (contentToSave) {
          inserts.push({
            cliente_telefono: idUsuario.toString(),
            contenido: contentToSave,
            media_url: data.mediaUrl || null,
            es_mio: esMio,
            estado: esMio ? 'enviado' : 'received',
            plataforma: 'instagram'
          });
        }
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
      console.log(`✅ ${inserts.length} mensajes de Instagram guardados. ${contactsUpdated} contactos actualizados.`);
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
