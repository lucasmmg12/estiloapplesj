
// ============================================
// SERVICIO: Monitoreo de Errores (System Sentinel)
// ============================================

import { enviarMensajeWhatsApp } from './builderbot-api.js';

const ADMIN_PHONE = '5492645438114';
const ERROR_COOLDOWN_MS = 10000; // Evitar spam: máximo 1 mensaje cada 10 seg
let lastErrorTime = 0;

export function initErrorMonitoring() {
    console.log('🛡️ Sentinel: Monitoreo de errores activado');

    // 1. Errores Globales (Sintaxis, Throw Error no capturados)
    window.onerror = function (message, source, lineno, colno, error) {
        reportarErrorCritico({
            tipo: 'CRITICAL_ERROR',
            mensaje: message,
            archivo: source,
            linea: lineno,
            stack: error ? error.stack : null
        });
        return false; // Dejar que el error se propague a la consola
    };

    // 2. Promesas Rechazadas no manejadas (Async/Await fallidos)
    window.addEventListener('unhandledrejection', function (event) {
        reportarErrorCritico({
            tipo: 'UNHANDLED_PROMISE',
            mensaje: event.reason ? (event.reason.message || event.reason) : 'Promesa rechazada sin motivo',
            archivo: 'Desconocido (Async)',
            linea: 'N/A',
            stack: event.reason ? event.reason.stack : null
        });
    });
}

async function reportarErrorCritico(detalles) {
    const now = Date.now();
    // Rate Limiting para no spamear WhatsApp
    if (now - lastErrorTime < ERROR_COOLDOWN_MS) {
        console.warn('🛡️ Sentinel: Error detectado pero silenciado por rate-limit.');
        return;
    }
    lastErrorTime = now;

    console.error('🛡️ Sentinel: Reportando error a Admin...', detalles);

    // Formatear Mensaje
    // Hola lucas tenemos "este error" y esta es la linea de codigo que genera el problema "linea de codigo"
    const mensajeAlerta = `🚨 *ALERTA DE SISTEMA*\n\nHola Lucas, tenemos este error:\n"${detalles.mensaje}"\n\nY esta es la ubicación del problema:\nArchivo: ${detalles.archivo}\nLínea: ${detalles.linea}`;

    try {
        await enviarMensajeWhatsApp(ADMIN_PHONE, mensajeAlerta);
        console.log('✅ Sentinel: Alerta enviada a WhatsApp');
    } catch (e) {
        console.error('🔥 Sentinel: FATAL - No se pudo enviar la alerta de WhatsApp', e);
    }
}
