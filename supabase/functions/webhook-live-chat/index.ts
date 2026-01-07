
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
        console.log('--- NUEVO MENSAJE RECIBIDO ---');
        // console.log('Payload crudo:', JSON.stringify(payload)); // Comentado para no saturar logs si es muy grande

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

            // Si es un evento que no nos interesa (ej: estado de bot), lo saltamos
            // Pero por ahora asumimos que todo lo que llega es mensaje o actualizacion

            // Extraer campos clave
            // En estructura nueva: data.from o data.key.remoteJid
            const telefono = data.from || data.phone || data.telefono || data.numero || (data.key ? data.key.remoteJid : null);

            // Limpieza del teléfono (quitar @s.whatsapp.net si viene)
            const cleanPhone = telefono ? telefono.replace('@s.whatsapp.net', '') : null;

            if (!cleanPhone) {
                // Si no hay teléfono, no podemos hacer nada util
                if (eventName !== 'status.online') { // Ignorar logs de keepalive
                    console.warn('Mensaje omitido: No se encontró teléfono en el payload.', JSON.stringify(item));
                }
                continue;
            }

            const contenidoUsuario = data.body || data.content || data.message || data.mensaje;
            const pushName = data.pushName || data.name || null;

            // Determinar si es mio o del cliente
            let esMio = false;
            // Estructura nueva: data.key.fromMe (debe ser boolean true para mensajes del bot/host)
            if (data.key && typeof data.key.fromMe !== 'undefined') {
                esMio = Boolean(data.key.fromMe);
            }
            // Fallbacks
            else if (data.es_mio !== undefined) {
                esMio = Boolean(data.es_mio);
            }
            else if (eventName === 'message.outgoing') {
                // Si el evento es explícitamente outgoing, asumimos que es nuestro
                esMio = true;
            }
            else if (data.fromMe !== undefined) {
                esMio = Boolean(data.fromMe);
            }

            // Si es la estructura nueva, el 'body' suele ser el mensaje. 
            // A veces viene en message.extendedTextMessage.text
            let textoFinal = contenidoUsuario;
            if (!textoFinal && data.message) {
                if (data.message.conversation) textoFinal = data.message.conversation;
                else if (data.message.extendedTextMessage) textoFinal = data.message.extendedTextMessage.text;
                else if (data.message.imageMessage) textoFinal = data.message.imageMessage.caption || '📷 Imagen';
                else if (data.message.videoMessage) textoFinal = data.message.videoMessage.caption || '🎥 Video';
            }

            // Si no hay texto y no es multimedia explícito, poner algo genérico o saltar?
            // A veces llegan eventos de estado sin body.
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

            const updates: any = {};
            let shouldUpdate = false;

            if (!contact) {
                // Crear nuevo
                updates.telefono = cleanPhone;
                updates.plataforma = 'whatsapp';
                updates.vendedor_asignado = Math.random() < 0.5 ? 'Nahuel' : 'Cristofer';
                if (pushName) updates.nombre = pushName;

                await supabase.from('contactos').insert(updates);
                contactsUpdated++;
            } else {
                // Actualizar existente si tenemos datos nuevos (ej: pushName)
                if (pushName && (!contact.nombre || contact.nombre === cleanPhone)) {
                    updates.nombre = pushName;
                    shouldUpdate = true;
                }

                // Si no tiene vendedor, asignar uno
                if (!contact.vendedor_asignado) {
                    updates.vendedor_asignado = Math.random() < 0.5 ? 'Nahuel' : 'Cristofer';
                    shouldUpdate = true;
                }

                if (shouldUpdate) {
                    await supabase.from('contactos').update(updates).eq('telefono', cleanPhone);
                    contactsUpdated++;
                }
            }

            // 2. PREPARAR INSERCIÓN DE MENSAJE
            // Insertamos si hay contenido o si es un evento que implica mensaje (y no es solo un status update tipo 'online')
            if (textoFinal || data.mediaUrl || eventName === 'message.incoming' || eventName === 'message.outgoing') {
                // Si es message.incoming y no extrajimos texto pero hay algo, guardamos un placeholder para no perder el evento
                const contentToSave = textoFinal
                    || (data.mediaUrl ? 'Archivo multimedia' : '')
                    || (eventName === 'message.incoming' || eventName === 'message.outgoing' ? 'Mensaje recibido (formato desconocido)' : null);

                if (contentToSave) {
                    inserts.push({
                        cliente_telefono: cleanPhone,
                        contenido: contentToSave,
                        media_url: data.mediaUrl || null, // TODO: Procesar media si viene en crudo del provider
                        es_mio: esMio,
                        estado: esMio ? 'enviado' : 'received',
                        plataforma: 'whatsapp'
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
            console.log(`✅ ${inserts.length} mensajes guardados. ${contactsUpdated} contactos actualizados.`);
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
        console.error('Error en Webhook Live Chat:', error);
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400, // Bad Request
            }
        );
    }
});
