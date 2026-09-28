/**
 * services/crm-service.js
 * Servicio de CRM y Gestión de Conversaciones de WhatsApp / Omnicanal para Estilo Apple SJ.
 * Inspirado directamente en contactCenterService.js de ADM-QUI (Sanatorio Argentino).
 * 
 * Soporta:
 * - Clasificación en 4 bandejas: Sin Asignar, Mis Chats, Todos, Cerrados
 * - Asignación, desasignación y transferencia de vendedor con nota de pase
 * - Cierre de conversación con motivo comercial (Venta, Cotización, Sin Interés, etc.)
 * - Ficha de cliente con dispositivo buscado, Plan Canje, cotización, tags y notas
 * - Atajos rápidos (/atajo) para respuestas instantáneas
 * - Suscripción Supabase Realtime a nuevos mensajes y cambios de estado
 */

import CONFIG from '../config.js';
import { enviarMensaje } from './builderbot-api.js';

import { supabase } from './supabase-client.js';

// Vendedores oficiales de Estilo Apple SJ
export const SELLERS = [
    { id: 'Nahuel', name: 'Nahuel', role: 'Ventas y Atención Comercial', color: '#5C2E2E', avatar: 'N' },
    { id: 'Cristofer', name: 'Cristofer', role: 'Plan Canje y Cotizaciones', color: '#1E3A5F', avatar: 'C' },
    { id: 'Lucas', name: 'Lucas', role: 'Gerencia y Soporte Técnico', color: '#0F766E', avatar: 'L' }
];

export const RESOLUTION_REASONS = [
    'Venta Concretada',
    'Plan Canje Acordado',
    'Presupuesto Enviado',
    'Equipo Ingresado a Servicio Técnico',
    'Consulta Respondida',
    'Sin Interés / Fuera de Presupuesto',
    'Cliente No Responde',
    'Otro Motivo'
];

export const DEFAULT_TAGS = [
    'Plan Canje',
    'Venta Nueva',
    'Usado Seleccionado',
    'Servicio Técnico',
    'VIP',
    'Presupuestado',
    'Seña Recibida',
    'Local Patio San Ignacio'
];

/**
 * 1. Obtener lista de conversaciones procesadas por el RPC optimizado
 */
export async function fetchCrmConversations(limit = 150) {
    try {
        const { data, error } = await supabase.rpc('get_last_conversations', { limit_count: limit });
        if (error) {
            console.warn('⚠️ Error en RPC get_last_conversations:', error.message);
            throw error;
        }
        return data || [];
    } catch (err) {
        console.error('Error obteniendo conversaciones:', err);
        return [];
    }
}

/**
 * 2. Cargar mensajes de una conversación específica
 */
export async function fetchChatMessages(phone) {
    if (!phone) return [];
    try {
        const { data, error } = await supabase
            .from('mensajes')
            .select('*')
            .eq('cliente_telefono', phone)
            .order('created_at', { ascending: true })
            .limit(500);

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Error cargando mensajes para', phone, err);
        return [];
    }
}

/**
 * 3. Enviar mensaje o nota privada
 */
export async function sendCrmMessage({ phone, content, senderName = 'Nahuel', isNote = false, mediaUrl = null, mediaType = null, platform = 'whatsapp' }) {
    if (!phone) throw new Error('Número de teléfono requerido');
    if (!content && !mediaUrl) throw new Error('Contenido requerido');

    // A. Si es un mensaje real para el cliente (NO nota privada), enviarlo por WhatsApp
    if (!isNote) {
        try {
            await enviarMensaje(platform || 'whatsapp', phone, content, mediaUrl);
        } catch (apiErr) {
            console.warn('Advertencia al despachar vía API WhatsApp:', apiErr.message);
        }
    }

    // B. Persistir en la tabla mensajes de Supabase
    const newMsgRecord = {
        cliente_telefono: phone,
        contenido: content || (mediaType === 'image' ? 'Foto adjunta' : 'Archivo adjunto'),
        es_mio: true,
        es_nota_privada: !!isNote,
        remitente_nombre: senderName,
        media_url: mediaUrl,
        media_type: mediaType,
        estado: 'enviado',
        plataforma: platform
    };

    const { data: insertedMsg, error: insertErr } = await supabase
        .from('mensajes')
        .insert(newMsgRecord)
        .select()
        .single();

    if (insertErr) throw insertErr;

    // C. Si la conversación estaba cerrada, reabrirla automáticamente
    await supabase
        .from('contactos')
        .update({
            estado: 'abierto',
            motivo_cierre: null
        })
        .eq('telefono', phone);

    return insertedMsg;
}

/**
 * 4. Asignar chat a un vendedor
 */
export async function assignSellerToChat(phone, sellerName) {
    if (!phone || !sellerName) return;
    const { error } = await supabase
        .from('contactos')
        .update({
            vendedor_asignado: sellerName,
            estado: 'abierto'
        })
        .eq('telefono', phone);

    if (error) throw error;
}

/**
 * 5. Desasignar chat (vuelve a la cola 'Sin Asignar')
 */
export async function unassignSellerFromChat(phone) {
    if (!phone) return;
    const { error } = await supabase
        .from('contactos')
        .update({
            vendedor_asignado: null,
            estado: 'sin_asignar'
        })
        .eq('telefono', phone);

    if (error) throw error;
}

/**
 * 6. Transferir conversación a otro vendedor con nota interna de pase
 */
export async function transferChat({ phone, targetSeller, note = '', currentSeller = 'Operador' }) {
    if (!phone || !targetSeller) return;

    // Actualizar vendedor
    const { error } = await supabase
        .from('contactos')
        .update({
            vendedor_asignado: targetSeller,
            estado: 'abierto'
        })
        .eq('telefono', phone);

    if (error) throw error;

    // Crear nota interna de transferencia
    const transferText = `🔄 Transferido a ${targetSeller}` + (note ? `\nNota de pase: "${note}"` : '');
    await supabase.from('mensajes').insert({
        cliente_telefono: phone,
        contenido: transferText,
        es_mio: true,
        es_nota_privada: true,
        remitente_nombre: currentSeller,
        estado: 'enviado',
        plataforma: 'whatsapp'
    });
}

/**
 * 7. Cerrar / Resolver conversación con motivo comercial
 */
export async function closeConversationWithReason({ phone, reason = 'Venta Concretada', currentSeller = 'Operador' }) {
    if (!phone) return;

    const { error } = await supabase
        .from('contactos')
        .update({
            estado: 'cerrado',
            motivo_cierre: reason,
            cerrado_at: new Date().toISOString(),
            cerrado_por: currentSeller
        })
        .eq('telefono', phone);

    if (error) throw error;

    // Nota interna en el historial
    await supabase.from('mensajes').insert({
        cliente_telefono: phone,
        contenido: `✅ Conversación finalizada.\nMotivo: ${reason}\nCerrada por: ${currentSeller}`,
        es_mio: true,
        es_nota_privada: true,
        remitente_nombre: currentSeller,
        estado: 'enviado',
        plataforma: 'whatsapp'
    });
}

/**
 * 8. Reabrir conversación
 */
export async function reopenConversation(phone) {
    if (!phone) return;
    const { error } = await supabase
        .from('contactos')
        .update({
            estado: 'abierto',
            motivo_cierre: null,
            cerrado_at: null,
            cerrado_por: null
        })
        .eq('telefono', phone);

    if (error) throw error;
}

/**
 * 9. Guardar ficha del cliente (Ficha CRM)
 */
export async function saveCustomerCard(phone, cardData = {}) {
    if (!phone) return;

    const payload = {};
    if (cardData.nombre !== undefined) payload.nombre = cardData.nombre;
    if (cardData.email !== undefined) payload.email = cardData.email;
    if (cardData.interes !== undefined) payload.interes = cardData.interes;
    if (cardData.necesidad_cliente !== undefined) payload.interes = cardData.necesidad_cliente;
    if (cardData.modelo_dispositivo !== undefined) payload.modelo_dispositivo = cardData.modelo_dispositivo;
    if (cardData.dispositivo_interes !== undefined) payload.dispositivo_interes = cardData.dispositivo_interes;
    if (cardData.dispositivo_canje !== undefined) payload.dispositivo_canje = cardData.dispositivo_canje;
    if (cardData.cotizacion_estimada !== undefined) {
        if (cardData.cotizacion_estimada === '' || cardData.cotizacion_estimada === null) {
            payload.cotizacion_estimada = null;
        } else if (typeof cardData.cotizacion_estimada === 'number') {
            payload.cotizacion_estimada = cardData.cotizacion_estimada;
        } else {
            const digits = cardData.cotizacion_estimada.toString().replace(/[^0-9]/g, '');
            payload.cotizacion_estimada = digits ? parseFloat(digits) : null;
        }
    }
    if (cardData.notas !== undefined) payload.notas = cardData.notas;
    if (cardData.etiquetas !== undefined) payload.etiquetas = cardData.etiquetas;
    if (cardData.es_favorito !== undefined) payload.es_favorito = cardData.es_favorito;
    if (cardData.vendedor_asignado !== undefined) payload.vendedor_asignado = cardData.vendedor_asignado;

    const { data, error } = await supabase
        .from('contactos')
        .update(payload)
        .eq('telefono', phone)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * 10. Catálogo de Respuestas Rápidas (/atajo)
 */
export async function fetchQuickReplies() {
    try {
        const { data, error } = await supabase
            .from('crm_quick_replies')
            .select('*')
            .order('title', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.warn('Error cargando quick replies de Supabase:', err.message);
        return [];
    }
}

/**
 * 11. Suscripción en Tiempo Real (Realtime)
 */
export function subscribeToCrmRealtime({ onNewMessage, onContactUpdate }) {
    const channel = supabase
        .channel('crm_realtime_channel')
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'mensajes' },
            payload => {
                if (onNewMessage && payload.new) {
                    onNewMessage(payload.new);
                }
            }
        )
        .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'contactos' },
            payload => {
                if (onContactUpdate && payload.new) {
                    onContactUpdate(payload.new);
                }
            }
        )
        .subscribe();

    return {
        unsubscribe: () => {
            supabase.removeChannel(channel);
        }
    };
}

/**
 * 12. Generador de Notificación Sonora (Chime) OnLive
 */
export function playCrmChime() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        // Acorde agradable de dos tonos Apple-style (880Hz -> 1320Hz)
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);

        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.40);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.42);
    } catch (e) {
        // Fallback silencioso
    }
}
