// ============================================
// SERVICIO: API de Builderbot
// ============================================

import CONFIG from '../config.js';

// ============================================
// Enviar Mensajes
// ============================================

export async function enviarMensajeWhatsApp(numero, contenido, mediaUrl = null) {
    const url = `${CONFIG.whatsapp.baseUrl}/${CONFIG.whatsapp.botId}/messages`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-builderbot': CONFIG.whatsapp.apiKey
        },
        body: JSON.stringify({
            messages: {
                content: contenido,
                mediaUrl: mediaUrl || undefined
            },
            number: numero,
            checkIfExists: false
        })
    });

    if (!response.ok) {
        throw new Error(`Error al enviar mensaje WhatsApp: ${response.statusText}`);
    }

    return await response.json();
}

export async function enviarMensajeInstagram(numero, contenido, mediaUrl = null) {
    const url = `${CONFIG.instagram.baseUrl}/${CONFIG.instagram.botId}/messages`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-builderbot': CONFIG.instagram.apiKey
        },
        body: JSON.stringify({
            messages: {
                content: contenido,
                mediaUrl: mediaUrl || undefined
            },
            number: numero,
            checkIfExists: false
        })
    });

    if (!response.ok) {
        throw new Error(`Error al enviar mensaje Instagram: ${response.statusText}`);
    }

    return await response.json();
}

// ============================================
// Función Genérica de Envío
// ============================================

export async function enviarMensaje(plataforma, numero, contenido, mediaUrl = null) {
    if (plataforma === 'whatsapp') {
        return await enviarMensajeWhatsApp(numero, contenido, mediaUrl);
    } else if (plataforma === 'instagram') {
        return await enviarMensajeInstagram(numero, contenido, mediaUrl);
    } else {
        throw new Error(`Plataforma no soportada: ${plataforma}`);
    }
}

// ============================================
// Blacklist Management
// ============================================

export async function manageBlacklist(numero, intent, plataforma = 'whatsapp') {
    // intent: 'add' (bloquear bot) | 'remove' (activar bot)

    let config;
    if (plataforma === 'instagram') {
        config = CONFIG.instagram;
    } else {
        config = CONFIG.whatsapp;
    }

    const url = `${config.baseUrl}/${config.botId}/blacklist`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-builderbot': config.apiKey
            },
            body: JSON.stringify({
                number: numero,
                intent: intent
            })
        });

        if (!response.ok) {
            console.error(`Error blacklist ${intent} (${plataforma}):`, response.statusText);
            return false;
        }

        return await response.json();
    } catch (e) {
        console.error(`Excepción gestionando blacklist (${plataforma}):`, e);
        return false;
    }
}

export default {
    enviarMensajeWhatsApp,
    enviarMensajeInstagram,
    enviarMensaje,
    manageBlacklist
};
