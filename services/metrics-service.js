/**
 * services/metrics-service.js
 * Servicio de Auditoría y Métricas Mensuales para Estilo Apple SJ
 * 
 * Métricas calculadas:
 * 1. Mensajes recibidos y enviados (total y desglose diario).
 * 2. Conversaciones iniciadas por Estilo Apple (Business-Initiated bajo ventana de 24hs de Meta).
 * 3. Conversaciones iniciadas por el cliente (User-Initiated bajo ventana de 24hs de Meta).
 * 4. Gasto acumulado y proyectado mensual a razón de $0.026 USD por mensaje enviado.
 */

import { supabase } from './supabase-client.js';

export const COST_PER_SENT_MESSAGE_USD = 0.026;
export const DEFAULT_USD_ARS_RATE = 1485;
const META_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 horas

/**
 * Obtener métricas consolidadas de un mes específico (YYYY-MM)
 * @param {number} year - Año (ej: 2026)
 * @param {number} month - Mes 1-12 (ej: 9 para Septiembre)
 * @param {number} dollarRate - Cotización Dólar ARS (ej: 1485)
 */
export async function fetchMonthlyMetrics(year = 2026, month = 9, dollarRate = DEFAULT_USD_ARS_RATE) {
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const daysInMonth = new Date(year, month, 0).getDate();
    const endDate = new Date(Date.UTC(year, month - 1, daysInMonth, 23, 59, 59, 999));

    const startIso = startDate.toISOString();
    const endIso = endDate.toISOString();

    // 1. Obtener conteo exacto de enviados y recibidos usando head: true
    const [sentRes, receivedRes] = await Promise.all([
        supabase
            .from('mensajes')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', startIso)
            .lte('created_at', endIso)
            .eq('es_mio', true)
            .eq('es_nota_privada', false),
        supabase
            .from('mensajes')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', startIso)
            .lte('created_at', endIso)
            .eq('es_mio', false)
            .eq('es_nota_privada', false)
    ]);

    const totalSent = sentRes.count || 0;
    const totalReceived = receivedRes.count || 0;
    const totalMessages = totalSent + totalReceived;

    // 2. Traer mensajes para cálculo de ventanas de 24hs y desglose diario
    // Paginamos hasta 10,000 registros para alta precisión
    const pageSize = 1000;
    let page = 0;
    let allMsgs = [];
    const maxPages = 10; // Hasta 10,000 mensajes

    while (page < maxPages) {
        const { data, error } = await supabase
            .from('mensajes')
            .select('cliente_telefono, es_mio, created_at')
            .gte('created_at', startIso)
            .lte('created_at', endIso)
            .eq('es_nota_privada', false)
            .order('created_at', { ascending: true })
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error || !data || data.length === 0) break;
        allMsgs.push(...data);
        if (data.length < pageSize) break;
        page++;
    }

    // 3. Cálculo de Ventanas de 24 Horas de Meta (Business vs User Initiated)
    const byPhone = new Map();
    allMsgs.forEach(m => {
        if (!byPhone.has(m.cliente_telefono)) byPhone.set(m.cliente_telefono, []);
        byPhone.get(m.cliente_telefono).push(m);
    });

    let sampleBusinessInitiated = 0;
    let sampleUserInitiated = 0;

    byPhone.forEach((msgs) => {
        let windowEndTime = null;

        msgs.forEach(m => {
            const t = new Date(m.created_at).getTime();
            const isMine = m.es_mio;

            if (!isMine) {
                // Mensaje recibido del cliente
                if (!windowEndTime || t > windowEndTime) {
                    sampleUserInitiated++;
                    windowEndTime = t + META_WINDOW_MS;
                } else {
                    // El cliente extiende la ventana de 24hs
                    windowEndTime = t + META_WINDOW_MS;
                }
            } else {
                // Mensaje enviado por Estilo Apple
                if (!windowEndTime || t > windowEndTime) {
                    // Fuera de ventana: Abre conversación de negocio (Business-Initiated)
                    sampleBusinessInitiated++;
                    windowEndTime = t + META_WINDOW_MS;
                }
            }
        });
    });

    // Factor de escala si la muestra fue acotada
    const sampleTotal = allMsgs.length;
    const scaleFactor = (sampleTotal > 0 && totalMessages > sampleTotal)
        ? (totalMessages / sampleTotal)
        : 1;

    const businessInitiated = Math.round(sampleBusinessInitiated * scaleFactor);
    const userInitiated = Math.round(sampleUserInitiated * scaleFactor);
    const totalConversations = businessInitiated + userInitiated;

    // 4. Desglose Diario (Día 1 al Día N)
    const dailyStats = [];
    for (let d = 1; d <= daysInMonth; d++) {
        dailyStats.push({
            day: d,
            sent: 0,
            received: 0,
            costUsd: 0
        });
    }

    allMsgs.forEach(m => {
        const dateObj = new Date(m.created_at);
        const day = dateObj.getUTCDate();
        if (day >= 1 && day <= daysInMonth) {
            if (m.es_mio) {
                dailyStats[day - 1].sent++;
            } else {
                dailyStats[day - 1].received++;
            }
        }
    });

    // Ajustar con factor de escala si aplicó
    if (scaleFactor !== 1) {
        dailyStats.forEach(ds => {
            ds.sent = Math.round(ds.sent * (totalSent / (allMsgs.filter(m => m.es_mio).length || 1)));
            ds.received = Math.round(ds.received * (totalReceived / (allMsgs.filter(m => !m.es_mio).length || 1)));
            ds.costUsd = +(ds.sent * COST_PER_SENT_MESSAGE_USD).toFixed(3);
        });
    } else {
        dailyStats.forEach(ds => {
            ds.costUsd = +(ds.sent * COST_PER_SENT_MESSAGE_USD).toFixed(3);
        });
    }

    // 5. Cálculos de Costos y Proyección
    const now = new Date();
    const isCurrentMonth = (now.getUTCFullYear() === year && (now.getUTCMonth() + 1) === month);
    const currentDay = isCurrentMonth ? Math.max(1, now.getUTCDate()) : daysInMonth;

    const actualCostUsd = +(totalSent * COST_PER_SENT_MESSAGE_USD).toFixed(2);
    const actualCostArs = Math.round(actualCostUsd * dollarRate);

    // Proyección lineal a fin de mes
    const projectedCostUsd = isCurrentMonth
        ? +((actualCostUsd / currentDay) * daysInMonth).toFixed(2)
        : actualCostUsd;
    const projectedCostArs = Math.round(projectedCostUsd * dollarRate);

    const projectedSentMessages = isCurrentMonth
        ? Math.round((totalSent / currentDay) * daysInMonth)
        : totalSent;

    return {
        year,
        month,
        daysInMonth,
        currentDay,
        isCurrentMonth,
        dollarRate,
        costPerMessageUsd: COST_PER_SENT_MESSAGE_USD,
        // Mensajes
        totalMessages,
        totalSent,
        totalReceived,
        sentPercentage: totalMessages > 0 ? +((totalSent / totalMessages) * 100).toFixed(1) : 0,
        receivedPercentage: totalMessages > 0 ? +((totalReceived / totalMessages) * 100).toFixed(1) : 0,
        // Sesiones 24h Meta
        businessInitiated,
        userInitiated,
        totalConversations,
        businessPercentage: totalConversations > 0 ? +((businessInitiated / totalConversations) * 100).toFixed(1) : 0,
        userPercentage: totalConversations > 0 ? +((userInitiated / totalConversations) * 100).toFixed(1) : 0,
        // Costos
        actualCostUsd,
        actualCostArs,
        projectedCostUsd,
        projectedCostArs,
        projectedSentMessages,
        // Desglose por día
        dailyStats
    };
}
