
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
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

    // Normalizar entrada: convertir todo a un array de "items procesables"
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

      // Determinar primero si es mio o del cliente para saber qué campo buscar
      let esMio = false;
      // Chequeo robusto de dirección
      if (item.eventName === 'message.outgoing') esMio = true;
      else if (data.key && typeof data.key.fromMe !== 'undefined') esMio = Boolean(data.key.fromMe);
      else if (data.es_mio !== undefined) esMio = Boolean(data.es_mio);
      else if (data.fromMe !== undefined) esMio = Boolean(data.fromMe);

      // Extraer campos clave
      // Si es mio (outgoing), el destinatario está en 'to' o 'remoteJid'
      // Si es incoming, el remitente está en 'from' o 'remoteJid' (o a veces 'from' es el usuario en incoming)
      let rawPhone = null;

      if (esMio) {
        // Mensaje saliente: buscamos el destinatario
        // En outgoing del provider, 'to' falta muchas veces, y el destinatario está en 'from' o en 'remoteJid'
        rawPhone = data.to
          || (data.key ? data.key.remoteJid : null)
          || (data.respMessage && data.respMessage.key ? data.respMessage.key.remoteJid : null)
          || data.phone
          || data.numero
          || (eventName === 'message.outgoing' ? data.from : null);
      } else {
        // Mensaje entrante: buscamos el remitente
        rawPhone = data.from
          || (data.key ? data.key.remoteJid : null)
          || data.phone
          || data.numero
          || data.telefono;
      }

      const telefono = rawPhone;

      // Limpieza del identificador (aunque sea string de IG, quitamos suffix de WP por si acaso)
      const cleanPhone = telefono ? telefono.replace('@s.whatsapp.net', '').replace('@c.us', '') : null;

      if (!cleanPhone) {
        // Si no hay teléfono/ID, no podemos hacer nada util
        if (eventName !== 'status.online') { // Ignorar logs de keepalive
          console.warn('Mensaje omitido: No se encontró ID/Teléfono en el payload.', JSON.stringify(item));
        }
        continue;
      }

      const contenidoUsuario = data.answer || data.body || data.content || data.message || data.mensaje;
      const pushName = data.pushName || data.name || null;

      // Si es la estructura nueva, el 'body' suele ser el mensaje. 
      // A veces viene en message.extendedTextMessage.text
      let textoFinal = contenidoUsuario;
      if (!textoFinal && data.message) {
        if (data.message.conversation) textoFinal = data.message.conversation;
        else if (data.message.extendedTextMessage) textoFinal = data.message.extendedTextMessage.text;
        else if (data.message.imageMessage) textoFinal = data.message.imageMessage.caption || '📷 Imagen';
        else if (data.message.videoMessage) textoFinal = data.message.videoMessage.caption || '🎥 Video';
        else if (data.message.buttonsMessage) textoFinal = data.message.buttonsMessage.contentText || data.message.buttonsMessage.caption || '🔘 Botones';
        else if (data.message.listMessage) textoFinal = data.message.listMessage.description || data.message.listMessage.title || '📜 Lista';
        else if (data.message.templateMessage) textoFinal = '📝 Plantilla';
        else if (data.message.interactiveMessage) textoFinal = '👉 Interactivo';
      }

      if (!textoFinal && !eventName) {
        // Si no hay body y no es un evento conocido, logueamos y seguimos
        // console.log('Item sin contenido de texto claro:', item);
      }

      // 1. ACTUALIZAR O CREAR CONTACTO
      // Intentamos buscarlo primero
      const { data: contact } = await supabase
        .from('contactos')
        .select('*')
        .eq('telefono', cleanPhone)
        .single();

      // --- VERIFICACIÓN DE BLACKLIST ---
      if (contact?.bot_paused_at) {
        console.log(`🚫 LIVE CHAT: Bot pausado para ${cleanPhone}. Omitiendo actualización automática.`);
        // Nota: Seguimos guardando el mensaje para que el humano lo vea, 
        // pero evitamos cualquier otra lógica automática que pudiera haber en el futuro.
      }

      const updates: any = {};
      let shouldUpdate = false;

      if (!contact) {
        // Crear nuevo
        updates.telefono = cleanPhone;
        updates.plataforma = 'instagram'; // <--- CAMBIO PRINCIPAL
        updates.vendedor_asignado = Math.random() < 0.5 ? 'Nahuel' : 'Cristofer';

        // Solo asignar nombre si NO es mío
        if (pushName && !esMio) {
          updates.nombre = pushName;
        }

        await supabase.from('contactos').insert(updates);
        contactsUpdated++;
      } else {
        // Actualizar existente si tenemos datos nuevos (ej: pushName)
        if (pushName && !esMio && (!contact.nombre || contact.nombre === cleanPhone || contact.nombre !== pushName)) {
          updates.nombre = pushName;
          shouldUpdate = true;
        }

        // Si no tiene vendedor, asignar uno
        if (!contact.vendedor_asignado) {
          updates.vendedor_asignado = Math.random() < 0.5 ? 'Nahuel' : 'Cristofer';
          shouldUpdate = true;
        }

        // Actualizar plataforma si estaba en otro estado o null
        if (contact.plataforma !== 'instagram') {
          updates.plataforma = 'instagram';
          shouldUpdate = true;
        }

        if (shouldUpdate) {
          await supabase.from('contactos').update(updates).eq('telefono', cleanPhone);
          contactsUpdated++;
        }
      }

      // 2. PREPARAR INSERCIÓN DE MENSAJE
      if (textoFinal || data.mediaUrl || data.url || data.urlTempFile || eventName === 'message.incoming' || eventName === 'message.outgoing') {

        const mediaUrlToSave = data.mediaUrl || data.url || data.urlTempFile || null;

        const contentToSave = textoFinal
          || (mediaUrlToSave ? (mediaUrlToSave.match(/\.(jpeg|jpg|png|webp)$/i) ? '📷 Imagen' : '📎 Archivo') : '')
          || (eventName === 'message.incoming' || eventName === 'message.outgoing' ? 'Mensaje recibido (formato desconocido)' : null);

        if (contentToSave) {
          inserts.push({
            cliente_telefono: cleanPhone,
            contenido: contentToSave,
            media_url: mediaUrlToSave,
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
        console.error('Error insertando mensajes en Supabase:', error);
        throw error;
      }
      console.log(`✅ ${inserts.length} mensajes IG guardados. ${contactsUpdated} contactos actualizados.`);
    } else {
      console.log('ℹ️ No se encontraron mensajes válidos para insertar.');
    }

    return new Response(
      JSON.stringify({ success: true, count: inserts.length }),
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
        status: 400, // Bad Request
      }
    );
  }
});
