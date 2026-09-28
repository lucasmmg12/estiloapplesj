// ============================================
// SERVICIO: Agente de IA "Growy" (OpenAI + Tool Calling)
// Estilo Apple SJ & Grow Labs
// ============================================

import CONFIG from '../config.js';
import { supabase } from './supabase-client.js';
import { growyPDF } from './growy-pdf.js';

export class GrowyAgent {
    constructor() {
        this.apiKey = CONFIG.openai?.apiKey || (typeof process !== 'undefined' ? process.env?.OPENAI_API_KEY : '') || '';
        this.model = CONFIG.openai?.model || 'gpt-4o-mini';
        this.systemPrompt = `Eres Growy, el agente de Inteligencia Artificial propio y omnisciente de Estilo Apple San Juan (Grow Labs).
Eres un copiloto analítico, financiero y operativo de élite. Tienes acceso directo a la base de datos viva del ERP/CRM mediante herramientas (tools).

TUS REGLAS DE ORO:
1. SIEMPRE utiliza tus herramientas cuando te pregunten sobre stock, inventario, precios, ventas, transacciones, finanzas, clientes o mensajes de chat. Nunca inventes datos que están en la base de datos.
2. Si el usuario te pide un "informe", "reporte", "análisis en PDF" o "descargar resumen":
   - Primero consulta los datos necesarios (inventario o finanzas).
   - Luego sintetiza la información, prepara los KPIs principales, arma una tabla estructurada y llama a la herramienta 'generar_reporte_pdf'.
   - Explica brevemente en tu respuesta lo que contiene el informe generado y confirma su descarga.
3. Si el usuario pide calcular un canje o cotización de trade-in, analiza el modelo entregado (porcentaje de batería, condición) vs el modelo que desea comprar y calcula la diferencia en USD y en ARS al dólar actual.
4. Tono: Profesional, ejecutivo, directo y cortés (estética Apple). Usa formato markdown con negritas, listas y emojis sobrios para facilitar la lectura.`;

        this.messages = [
            { role: 'system', content: this.systemPrompt }
        ];

        this.listeners = {
            onToolCall: [],
            onMessage: [],
            onError: []
        };
    }

    setApiKey(key) {
        this.apiKey = key;
    }

    on(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event].push(callback);
        }
    }

    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(cb => {
                try { cb(data); } catch (e) { console.error(`Error en listener ${event}:`, e); }
            });
        }
    }

    limpiarConversacion() {
        this.messages = [
            { role: 'system', content: this.systemPrompt }
        ];
    }

    // Definición de Tools para OpenAI
    getToolsDefinition() {
        return [
            {
                type: 'function',
                function: {
                    name: 'consultar_inventario',
                    description: 'Consulta productos e iPhones en stock del inventario. Permite filtrar por modelo, capacidad, estado (disponible, reservado, vendido) y condición (Sellado, Usado).',
                    parameters: {
                        type: 'object',
                        properties: {
                            modelo: {
                                type: 'string',
                                description: 'Término de búsqueda del modelo (ej: "iPhone 13", "iPhone 15 Pro", "AirPods", "Watch")'
                            },
                            estado: {
                                type: 'string',
                                enum: ['disponible', 'reservado', 'vendido', 'todos'],
                                description: 'Estado del producto. Por defecto "disponible"'
                            },
                            condicion: {
                                type: 'string',
                                enum: ['Sellado', 'Usado', 'todos'],
                                description: 'Condición del equipo. Por defecto "todos"'
                            },
                            limite: {
                                type: 'number',
                                description: 'Cantidad máxima de productos a retornar (por defecto 20)'
                            }
                        }
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'consultar_finanzas',
                    description: 'Consulta transacciones financieras, ventas, gastos, balance de ingresos y egresos en un rango de fechas.',
                    parameters: {
                        type: 'object',
                        properties: {
                            tipo: {
                                type: 'string',
                                enum: ['ingreso', 'egreso', 'todos'],
                                description: 'Tipo de transacción'
                            },
                            categoria: {
                                type: 'string',
                                description: 'Categoría opcional (ej: "Venta Equipos", "Servicio Técnico", "Alquiler", "Sueldos")'
                            },
                            fecha_inicio: {
                                type: 'string',
                                description: 'Fecha de inicio en formato YYYY-MM-DD'
                            },
                            fecha_fin: {
                                type: 'string',
                                description: 'Fecha de fin en formato YYYY-MM-DD'
                            },
                            limite: {
                                type: 'number',
                                description: 'Máximo número de transacciones a retornar (por defecto 30)'
                            }
                        }
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'consultar_clientes',
                    description: 'Busca clientes registrados en el sistema por nombre, teléfono, plataforma (WhatsApp/Instagram) o intención de compra.',
                    parameters: {
                        type: 'object',
                        properties: {
                            busqueda: {
                                type: 'string',
                                description: 'Nombre o número de teléfono del cliente a buscar'
                            },
                            plataforma: {
                                type: 'string',
                                enum: ['whatsapp', 'instagram', 'todas'],
                                description: 'Plataforma de contacto'
                            },
                            intencion: {
                                type: 'string',
                                description: 'Intención de compra registrada (ej: "interes_iphone_15", "consulta_precio")'
                            },
                            limite: {
                                type: 'number',
                                description: 'Máximo de clientes a retornar (default 15)'
                            }
                        }
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'consultar_conversacion_chat',
                    description: 'Consulta los últimos mensajes de chat intercambiados con un cliente mediante su número de teléfono.',
                    parameters: {
                        type: 'object',
                        required: ['telefono'],
                        properties: {
                            telefono: {
                                type: 'string',
                                description: 'Teléfono del cliente (con o sin código de país)'
                            },
                            limite: {
                                type: 'number',
                                description: 'Cantidad de mensajes recientes (default 25)'
                            }
                        }
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'obtener_cotizacion_dolar',
                    description: 'Obtiene la cotización actual del dólar blue y oficial en Argentina guardada en el sistema o de la API financiera.',
                    parameters: {
                        type: 'object',
                        properties: {}
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'generar_reporte_pdf',
                    description: 'Genera y descarga un informe ejecutivo formal en PDF con la identidad de marca de Estilo Apple SJ (Borgoña y Oro). Incluye tarjetas de KPIs, tabla de datos estructurada, diagnóstico de IA y recomendaciones de negocio.',
                    parameters: {
                        type: 'object',
                        required: ['titulo', 'kpis', 'resumenEjecutivo', 'tabla'],
                        properties: {
                            titulo: {
                                type: 'string',
                                description: 'Título principal del informe (ej: "INFORME EJECUTIVO DE VENTAS Y RENTABILIDAD")'
                            },
                            subtitulo: {
                                type: 'string',
                                description: 'Subtítulo o alcance (ej: "Estilo Apple San Juan • Cierre Mensual")'
                            },
                            periodo: {
                                type: 'string',
                                description: 'Período analizado (ej: "Septiembre 2026", "Últimos 30 días")'
                            },
                            kpis: {
                                type: 'array',
                                description: 'Array de 2 a 4 tarjetas de métricas clave',
                                items: {
                                    type: 'object',
                                    required: ['label', 'valor'],
                                    properties: {
                                        label: { type: 'string', description: 'Nombre de la métrica (ej: "Facturación Total", "Margen Bruto")' },
                                        valor: { type: 'string', description: 'Valor formateado (ej: "$14.250 USD", "32 Unidades")' },
                                        tipo: { type: 'string', enum: ['positivo', 'negativo', 'info'], description: 'Color/estado del KPI' }
                                    }
                                }
                            },
                            resumenEjecutivo: {
                                type: 'string',
                                description: 'Texto explicativo del análisis: qué sucedió, tendencias y hallazgos clave.'
                            },
                            tabla: {
                                type: 'object',
                                required: ['head', 'body'],
                                description: 'Tabla con cabeceras y filas de datos',
                                properties: {
                                    head: {
                                        type: 'array',
                                        items: { type: 'string' },
                                        description: 'Nombres de las columnas (ej: ["Modelo", "Stock", "Batería", "Precio USD"])'
                                    },
                                    body: {
                                        type: 'array',
                                        items: {
                                            type: 'array',
                                            items: { type: 'string' }
                                        },
                                        description: 'Filas de la tabla (cada fila es un array de strings correspondientes a las columnas)'
                                    }
                                }
                            },
                            recomendaciones: {
                                type: 'array',
                                items: { type: 'string' },
                                description: 'Lista de recomendaciones estratégicas numeradas o en viñetas'
                            }
                        }
                    }
                }
            }
        ];
    }

    // Ejecución de Tools
    async ejecutarTool(nombre, args) {
        this.emit('onToolCall', { nombre, args });

        switch (nombre) {
            case 'consultar_inventario': {
                let query = supabase.from('productos').select('*');
                if (args.estado && args.estado !== 'todos') {
                    query = query.eq('estado', args.estado);
                }
                if (args.condicion && args.condicion !== 'todos') {
                    query = query.ilike('condicion', `%${args.condicion}%`);
                }
                if (args.modelo) {
                    query = query.ilike('modelo', `%${args.modelo}%`);
                }
                const limit = args.limite || 20;
                query = query.order('created_at', { ascending: false }).limit(limit);

                const { data, error } = await query;
                if (error) return { error: error.message };

                return {
                    total_encontrados: data.length,
                    productos: data.map(p => ({
                        id: p.id,
                        modelo: p.modelo,
                        capacidad: p.capacidad,
                        color: p.color,
                        condicion: p.condicion,
                        bateria: p.bateria ? `${p.bateria}%` : 'N/A',
                        precio_usd: p.precio_usd ? `$${p.precio_usd}` : 'N/A',
                        precio_ars: p.precio_ars ? `$${p.precio_ars.toLocaleString('es-AR')}` : 'N/A',
                        estado: p.estado
                    }))
                };
            }

            case 'consultar_finanzas': {
                let query = supabase.from('transactions').select('*');
                if (args.tipo && args.tipo !== 'todos') {
                    // Mapeo flexible
                    const typeVal = args.tipo === 'ingreso' ? 'income' : (args.tipo === 'egreso' ? 'expense' : args.tipo);
                    query = query.eq('type', typeVal);
                }
                if (args.categoria) {
                    query = query.ilike('category', `%${args.categoria}%`);
                }
                if (args.fecha_inicio) {
                    query = query.gte('date', args.fecha_inicio);
                }
                if (args.fecha_fin) {
                    query = query.lte('date', args.fecha_fin);
                }

                query = query.order('date', { ascending: false }).limit(args.limite || 30);
                const { data, error } = await query;
                if (error) return { error: error.message };

                // Resumen rápido
                let totalIngresosUSD = 0;
                let totalEgresosUSD = 0;
                let totalIngresosARS = 0;
                let totalEgresosARS = 0;

                data.forEach(t => {
                    const monto = parseFloat(t.amount) || 0;
                    const isIncome = t.type === 'income' || t.type === 'ingreso';
                    const isUSD = (t.currency || '').toUpperCase() === 'USD';

                    if (isIncome) {
                        if (isUSD) totalIngresosUSD += monto;
                        else totalIngresosARS += monto;
                    } else {
                        if (isUSD) totalEgresosUSD += monto;
                        else totalEgresosARS += monto;
                    }
                });

                return {
                    cantidad_transacciones: data.length,
                    totales: {
                        ingresos_usd: totalIngresosUSD,
                        egresos_usd: totalEgresosUSD,
                        balance_neto_usd: totalIngresosUSD - totalEgresosUSD,
                        ingresos_ars: totalIngresosARS,
                        egresos_ars: totalEgresosARS,
                        balance_neto_ars: totalIngresosARS - totalEgresosARS
                    },
                    ultimas_transacciones: data.slice(0, 15).map(t => ({
                        fecha: t.date,
                        descripcion: t.description,
                        tipo: t.type,
                        categoria: t.category,
                        monto: `${t.currency || 'ARS'} ${t.amount}`,
                        metodo: t.payment_method
                    }))
                };
            }

            case 'consultar_clientes': {
                let query = supabase.from('clientes').select('*');
                if (args.busqueda) {
                    query = query.or(`nombre.ilike.%${args.busqueda}%,telefono.ilike.%${args.busqueda}%`);
                }
                if (args.plataforma && args.plataforma !== 'todas') {
                    query = query.eq('plataforma', args.plataforma);
                }
                if (args.intencion) {
                    query = query.ilike('intencion', `%${args.intencion}%`);
                }
                query = query.order('ultima_interaccion', { ascending: false }).limit(args.limite || 15);

                const { data, error } = await query;
                if (error) return { error: error.message };

                return {
                    total: data.length,
                    clientes: data.map(c => ({
                        id: c.id,
                        nombre: c.nombre || 'Sin nombre',
                        telefono: c.telefono,
                        plataforma: c.plataforma,
                        intencion: c.intencion,
                        resumen: c.resumen,
                        ultima_interaccion: c.ultima_interaccion
                    }))
                };
            }

            case 'consultar_conversacion_chat': {
                const telLimpio = args.telefono.replace(/\D/g, '');
                const { data, error } = await supabase
                    .from('mensajes')
                    .select('*')
                    .ilike('cliente_telefono', `%${telLimpio}%`)
                    .order('created_at', { ascending: false })
                    .limit(args.limite || 25);

                if (error) return { error: error.message };

                return {
                    telefono: telLimpio,
                    total_mensajes: data.length,
                    mensajes: data.reverse().map(m => ({
                        remitente: m.es_mio ? 'Vendedor/Bot' : 'Cliente',
                        fecha: m.created_at,
                        contenido: m.contenido || '[Multimedia]'
                    }))
                };
            }

            case 'obtener_cotizacion_dolar': {
                try {
                    const { data } = await supabase
                        .from('cotizacion_dolar')
                        .select('*')
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .single();

                    return {
                        cotizacion_actual: data || { valor: 1420, fuente: 'Sistema', fecha: new Date().toISOString() },
                        timestamp: new Date().toISOString()
                    };
                } catch {
                    return { valor: 1420, fuente: 'Estimado' };
                }
            }

            case 'generar_reporte_pdf': {
                try {
                    const result = growyPDF.generarReporteEjecutivo(args);
                    return {
                        success: true,
                        archivo: result.filename,
                        total_paginas: result.totalPages,
                        mensaje: `El reporte "${args.titulo}" se generó y descargó con éxito (${result.totalPages} páginas).`
                    };
                } catch (err) {
                    console.error('Error generando PDF en Growy:', err);
                    return {
                        success: false,
                        error: err.message
                    };
                }
            }

            default:
                return { error: `Herramienta desconocida: ${nombre}` };
        }
    }

    /**
     * Enviar mensaje del usuario al agente Growy
     * @param {string} userText 
     */
    async enviarMensaje(userText) {
        if (!this.apiKey) {
            throw new Error('API Key de OpenAI no configurada. Por favor verifica tu archivo .env (OPENAI_API_KEY o VITE_OPENAI_API_KEY).');
        }

        this.messages.push({
            role: 'user',
            content: userText
        });

        const tools = this.getToolsDefinition();
        let loopCount = 0;
        const maxLoops = 6;

        while (loopCount < maxLoops) {
            loopCount++;

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: this.messages,
                    tools: tools,
                    tool_choice: 'auto',
                    temperature: 0.3
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error?.message || `Error HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            const choice = data.choices[0];
            const message = choice.message;

            this.messages.push(message);

            // Si el modelo solicitó ejecutar herramientas
            if (message.tool_calls && message.tool_calls.length > 0) {
                for (const toolCall of message.tool_calls) {
                    const toolName = toolCall.function.name;
                    let toolArgs = {};
                    try {
                        toolArgs = JSON.parse(toolCall.function.arguments);
                    } catch (e) {
                        console.error('Error parseando argumentos de tool:', e);
                    }

                    const toolResult = await this.ejecutarTool(toolName, toolArgs);

                    this.messages.push({
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        name: toolName,
                        content: JSON.stringify(toolResult)
                    });
                }
                // Continuar el bucle para que el modelo procese el resultado de las tools
                continue;
            }

            // Si no hay más tool_calls, es la respuesta final de texto
            this.emit('onMessage', {
                role: 'assistant',
                content: message.content
            });

            return message.content;
        }

        throw new Error('Se superó el límite de llamadas recursivas de herramientas.');
    }
}

export const growyAgent = new GrowyAgent();
