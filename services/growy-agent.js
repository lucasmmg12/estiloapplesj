// ============================================
// SERVICIO: Agente de IA "Growy" (OpenAI + Tool Calling)
// Estilo Apple SJ & Grow Labs
// ============================================

import CONFIG from '../config.js';
import { supabase } from './supabase-client.js';
import { growyPDF } from './growy-pdf.js';
import { growyExcel } from './growy-excel.js';

export class GrowyAgent {
    constructor() {
        this.model = CONFIG.openai?.model || 'gpt-4o-mini';
        this.systemPrompt = `Eres Growy, el agente de Inteligencia Artificial propio y omnisciente de Estilo Apple San Juan (Grow Labs).
Eres un copiloto analítico, financiero, operativo y estratégico de élite. Tienes acceso directo y total a la base de datos viva del ERP/CRM mediante herramientas (tools).

CAPACIDADES Y ACCESO A DATOS:
1. Finanzas y ERP: Acceso completo a todas las transacciones de ingresos ('INCOME') y egresos ('EXPENSE'), categorías (Venta de Equipos, Venta de Accesorios, Servicio Tecnico, Proveedores, Alquiler, Empleados, Comisiones, Publicidad, Impuestos, etc.), medios de pago (Efectivo, Transferencia, USDT, MercadoPago) y cálculo de balances netos en USD y ARS.
2. Inventario y Stock: Acceso a iPhones y productos con modelo, almacenamiento, colores, batería, condición, precio de venta USD/ARS y costo USD para análisis de rentabilidad y CMV.
3. Movimientos de Stock: Historial de entradas (IN), salidas (OUT) y ajustes de stock en tiempo real.
4. Proveedores y Clientes: Información de proveedores y directorio de clientes/contactos con historiales de chat.
5. Cotización Dólar: Cotización del dólar blue y oficial en el sistema.
6. Snapshot Global: KPIs instantáneos del negocio con 'consultar_metricas_globales'.

REGLAS DE ORO:
1. SIEMPRE utiliza tus herramientas para consultar la base de datos viva antes de responder sobre finanzas, ingresos, egresos, stock, clientes o reportes. NUNCA inventes cifras.
2. GENERACIÓN DE REPORTES (PDF Y EXCEL):
   - Si el usuario pide un "excel", "planilla", "xlsx", "descargar datos" o "exportar": consulta los datos necesarios y llama a 'generar_reporte_excel'.
   - Si el usuario pide un "pdf", "informe formal", "reporte ejecutivo" o "documento": consulta los datos y llama a 'generar_reporte_pdf'.
   - Si el usuario pide "en PDF y Excel" o "ambos": consulta los datos y genera ambos reportes llamando consecutivamente a 'generar_reporte_pdf' y 'generar_reporte_excel'.
   - Si pide un reporte sin especificar formato: genera el informe en PDF con KPIs ejecutivos y menciona que también puedes descargárselo en Excel con el detalle tabular completo.
3. Formato y Análisis Financiero:
   - Siempre desglosa ingresos y egresos separando claramente dólares (USD) y pesos argentinos (ARS).
   - Calcula el Balance Neto = Total Ingresos - Total Egresos.
   - Destaca las categorías con mayor impacto financiero (ej: Margen por Venta de Equipos, Gastos en Proveedores o Alquiler).
4. Tono: Profesional, ejecutivo, directo y cortés (estética Apple y Grow Labs). Usa markdown con negritas, listas y emojis sobrios para facilitar la lectura.`;

        this.messages = [
            { role: 'system', content: this.systemPrompt }
        ];

        this.listeners = {
            onToolCall: [],
            onMessage: [],
            onError: []
        };
    }

    setApiKey() {
        // Obsoleto por seguridad: Las API Keys se gestionan exclusivamente en el servidor / Edge Function
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
                    name: 'consultar_metricas_globales',
                    description: 'Obtiene un snapshot ejecutivo global instantáneo del negocio: stock disponible valorizado (costo vs venta), balance financiero acumulado del mes actual (ingresos, egresos y balance neto en USD y ARS) y cotización de referencia del dólar.',
                    parameters: {
                        type: 'object',
                        properties: {}
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'consultar_finanzas',
                    description: 'Consulta transacciones financieras de ingresos (INCOME) y egresos (EXPENSE), ventas, gastos operativos, balance neto y márgenes en el ERP. Permite filtrar por tipo, categoría, medio de pago y rango de fechas.',
                    parameters: {
                        type: 'object',
                        properties: {
                            tipo: {
                                type: 'string',
                                enum: ['ingreso', 'egreso', 'todos'],
                                description: 'Tipo de transacción: "ingreso" (ventas, servicios), "egreso" (gastos, proveedores, servicios) o "todos"'
                            },
                            categoria: {
                                type: 'string',
                                description: 'Categoría opcional (ej: "Venta de Equipos", "Venta de Accesorios", "Servicio Tecnico", "Proveedores", "Alquiler", "Empleados local", "Marketing")'
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
                                description: 'Máximo número de transacciones a retornar (por defecto 50, hasta 200)'
                            }
                        }
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'consultar_inventario',
                    description: 'Consulta productos e iPhones en stock del inventario. Incluye modelo, almacenamiento, colores, porcentaje de batería, condición, precio de venta en USD y costo USD para rentabilidad.',
                    parameters: {
                        type: 'object',
                        properties: {
                            modelo: {
                                type: 'string',
                                description: 'Término de búsqueda del modelo (ej: "iPhone 13", "iPhone 15 Pro", "AirPods", "Watch")'
                            },
                            solo_activos: {
                                type: 'boolean',
                                description: 'Filtrar solo productos activos (por defecto true)'
                            },
                            limite: {
                                type: 'number',
                                description: 'Cantidad máxima de productos a retornar (por defecto 30)'
                            }
                        }
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'consultar_movimientos_inventario',
                    description: 'Consulta el historial de movimientos de stock (entradas IN, salidas OUT, ajustes ADJUSTMENT).',
                    parameters: {
                        type: 'object',
                        properties: {
                            tipo: {
                                type: 'string',
                                enum: ['IN', 'OUT', 'ADJUSTMENT', 'todos'],
                                description: 'Tipo de movimiento de inventario'
                            },
                            limite: {
                                type: 'number',
                                description: 'Cantidad de movimientos a retornar (default 25)'
                            }
                        }
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'consultar_proveedores',
                    description: 'Consulta el directorio de proveedores registrados en el ERP con sus datos de contacto.',
                    parameters: {
                        type: 'object',
                        properties: {
                            busqueda: {
                                type: 'string',
                                description: 'Nombre o dato del proveedor a buscar'
                            }
                        }
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'consultar_clientes',
                    description: 'Busca clientes y contactos registrados en el sistema por nombre, teléfono, plataforma (WhatsApp/Instagram) o intención de compra.',
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
                            limite: {
                                type: 'number',
                                description: 'Máximo de clientes a retornar (default 20)'
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
            },
            {
                type: 'function',
                function: {
                    name: 'generar_reporte_excel',
                    description: 'Genera y descarga una planilla de cálculo profesional en formato Excel (.xlsx). Permite incluir tarjetas de KPIs, diagnóstico ejecutivo, tabla de datos estructurada y hojas adicionales opcionales.',
                    parameters: {
                        type: 'object',
                        required: ['titulo', 'columnas', 'filas'],
                        properties: {
                            titulo: {
                                type: 'string',
                                description: 'Título principal del reporte en Excel (ej: "REPORTE DE INGRESOS Y EGRESOS", "INVENTARIO VALORIZADO")'
                            },
                            subtitulo: {
                                type: 'string',
                                description: 'Subtítulo del reporte (ej: "Estilo Apple SJ • Cierre Financiero")'
                            },
                            periodo: {
                                type: 'string',
                                description: 'Período analizado (ej: "Octubre 2026", "Año 2026")'
                            },
                            nombreHoja: {
                                type: 'string',
                                description: 'Nombre de la hoja principal (por defecto "Resumen Financiero" o "Movimientos")'
                            },
                            kpis: {
                                type: 'array',
                                description: 'Tarjetas de métricas clave que encabezarán la hoja',
                                items: {
                                    type: 'object',
                                    required: ['label', 'valor'],
                                    properties: {
                                        label: { type: 'string', description: 'Nombre del KPI' },
                                        valor: { type: 'string', description: 'Valor formateado' }
                                    }
                                }
                            },
                            resumenEjecutivo: {
                                type: 'string',
                                description: 'Texto explicativo del análisis y hallazgos financieros o de stock'
                            },
                            columnas: {
                                type: 'array',
                                items: { type: 'string' },
                                description: 'Nombres de las columnas de la tabla (ej: ["Fecha", "Tipo", "Categoría", "Descripción", "Monto", "Moneda", "Medio de Pago"])'
                            },
                            filas: {
                                type: 'array',
                                items: {
                                    type: 'array',
                                    items: { type: 'string' }
                                },
                                description: 'Filas de la tabla (cada elemento es un array de valores en el mismo orden que las columnas)'
                            },
                            hojasAdicionales: {
                                type: 'array',
                                description: 'Hojas adicionales opcionales para desgloses específicos (ej: hoja "Ingresos", hoja "Egresos", hoja "Stock")',
                                items: {
                                    type: 'object',
                                    required: ['nombre', 'columnas', 'filas'],
                                    properties: {
                                        nombre: { type: 'string' },
                                        columnas: { type: 'array', items: { type: 'string' } },
                                        filas: { type: 'array', items: { type: 'array', items: { type: 'string' } } }
                                    }
                                }
                            },
                            filename: {
                                type: 'string',
                                description: 'Nombre de archivo sugerido (ej: "reporte_financiero_2026.xlsx")'
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
            case 'consultar_metricas_globales': {
                try {
                    // 1. Stock total y valorización
                    const { data: prods } = await supabase
                        .from('productos')
                        .select('id, modelo, precio_usd, costo_usd, stock, activo')
                        .or('stock.gt.0,activo.eq.true');

                    let totalStockUnidades = 0;
                    let valorVentaStockUSD = 0;
                    let valorCostoStockUSD = 0;

                    if (prods && prods.length > 0) {
                        totalStockUnidades = prods.length;
                        prods.forEach(p => {
                            valorVentaStockUSD += parseFloat(p.precio_usd) || 0;
                            valorCostoStockUSD += parseFloat(p.costo_usd) || 0;
                        });
                    }

                    // 2. Transacciones del mes actual (Desde el 1 del mes en curso)
                    const now = new Date();
                    const firstDayMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
                    const { data: transMonth } = await supabase
                        .from('transactions')
                        .select('amount, currency, type, category_id, transaction_categories(name)')
                        .gte('date', firstDayMonth);

                    let mesIngresosUSD = 0;
                    let mesEgresosUSD = 0;
                    let mesIngresosARS = 0;
                    let mesEgresosARS = 0;

                    if (transMonth && transMonth.length > 0) {
                        transMonth.forEach(t => {
                            const monto = parseFloat(t.amount) || 0;
                            const isIncome = (t.type || '').toUpperCase() === 'INCOME';
                            const isUSD = (t.currency || '').toUpperCase() === 'USD';

                            if (isIncome) {
                                if (isUSD) mesIngresosUSD += monto;
                                else mesIngresosARS += monto;
                            } else {
                                if (isUSD) mesEgresosUSD += monto;
                                else mesEgresosARS += monto;
                            }
                        });
                    }

                    // 3. Cotización actual del dólar
                    let cotizacion = 1420;
                    try {
                        const { data: cotData } = await supabase
                            .from('cotizacion_dolar')
                            .select('*')
                            .order('created_at', { ascending: false })
                            .limit(1)
                            .single();
                        if (cotData?.valor) cotizacion = cotData.valor;
                    } catch (e) {
                        console.warn('Cotización fallback:', e);
                    }

                    return {
                        inventario: {
                            unidades_en_stock: totalStockUnidades,
                            valor_venta_usd: Math.round(valorVentaStockUSD),
                            valor_costo_usd: Math.round(valorCostoStockUSD),
                            margen_bruto_potencial_usd: Math.round(valorVentaStockUSD - valorCostoStockUSD)
                        },
                        mes_actual: {
                            ingresos_usd: mesIngresosUSD,
                            egresos_usd: mesEgresosUSD,
                            balance_neto_usd: mesIngresosUSD - mesEgresosUSD,
                            ingresos_ars: mesIngresosARS,
                            egresos_ars: mesEgresosARS,
                            balance_neto_ars: mesIngresosARS - mesEgresosARS,
                            total_movimientos_mes: transMonth ? transMonth.length : 0
                        },
                        cotizacion_dolar: cotizacion
                    };
                } catch (err) {
                    console.error('Error en consultar_metricas_globales:', err);
                    return { error: err.message };
                }
            }

            case 'consultar_finanzas': {
                try {
                    let query = supabase
                        .from('transactions')
                        .select(`
                            id,
                            date,
                            amount,
                            currency,
                            exchange_rate,
                            type,
                            description,
                            is_personal,
                            branch,
                            category_id,
                            payment_method_id,
                            supplier_id,
                            transaction_categories (id, name, type),
                            payment_methods (id, name),
                            suppliers (id, name)
                        `);

                    // 1. Filtro por tipo: normalización 'ingreso' -> 'INCOME', 'egreso' -> 'EXPENSE'
                    if (args.tipo && args.tipo !== 'todos') {
                        const tNorm = args.tipo.toLowerCase();
                        if (tNorm.includes('ingreso') || tNorm === 'income') {
                            query = query.eq('type', 'INCOME');
                        } else if (tNorm.includes('egreso') || tNorm.includes('gasto') || tNorm === 'expense') {
                            query = query.eq('type', 'EXPENSE');
                        }
                    }

                    // 2. Filtro por categoría mediante subconsulta a transaction_categories
                    if (args.categoria) {
                        const { data: catMatches } = await supabase
                            .from('transaction_categories')
                            .select('id')
                            .ilike('name', `%${args.categoria}%`);
                        if (catMatches && catMatches.length > 0) {
                            query = query.in('category_id', catMatches.map(c => c.id));
                        }
                    }

                    // 3. Filtros por rango de fechas
                    if (args.fecha_inicio) {
                        query = query.gte('date', args.fecha_inicio);
                    }
                    if (args.fecha_fin) {
                        query = query.lte('date', args.fecha_fin);
                    }

                    const limit = Math.min(args.limite || 50, 200);
                    query = query.order('date', { ascending: false }).limit(limit);

                    const { data, error } = await query;
                    if (error) return { error: error.message };

                    // Cálculo de métricas agregadas
                    let totalIngresosUSD = 0;
                    let totalEgresosUSD = 0;
                    let totalIngresosARS = 0;
                    let totalEgresosARS = 0;
                    const porCategoria = {};
                    const porMedioPago = {};

                    data.forEach(t => {
                        const monto = parseFloat(t.amount) || 0;
                        const isIncome = (t.type || '').toUpperCase() === 'INCOME';
                        const isUSD = (t.currency || '').toUpperCase() === 'USD';
                        const catName = t.transaction_categories?.name || 'Sin Categoría';
                        const payName = t.payment_methods?.name || 'No especificado';

                        if (isIncome) {
                            if (isUSD) totalIngresosUSD += monto;
                            else totalIngresosARS += monto;
                        } else {
                            if (isUSD) totalEgresosUSD += monto;
                            else totalEgresosARS += monto;
                        }

                        // Acumulación por categoría
                        if (!porCategoria[catName]) {
                            porCategoria[catName] = { tipo: t.type, total_usd: 0, total_ars: 0, cantidad: 0 };
                        }
                        porCategoria[catName].cantidad += 1;
                        if (isUSD) porCategoria[catName].total_usd += monto;
                        else porCategoria[catName].total_ars += monto;

                        // Acumulación por medio de pago
                        if (!porMedioPago[payName]) {
                            porMedioPago[payName] = { total_usd: 0, total_ars: 0, cantidad: 0 };
                        }
                        porMedioPago[payName].cantidad += 1;
                        if (isUSD) porMedioPago[payName].total_usd += monto;
                        else porMedioPago[payName].total_ars += monto;
                    });

                    return {
                        total_transacciones_obtenidas: data.length,
                        totales_consolidados: {
                            ingresos_usd: totalIngresosUSD,
                            egresos_usd: totalEgresosUSD,
                            balance_neto_usd: totalIngresosUSD - totalEgresosUSD,
                            ingresos_ars: totalIngresosARS,
                            egresos_ars: totalEgresosARS,
                            balance_neto_ars: totalIngresosARS - totalEgresosARS
                        },
                        desglose_por_categoria: porCategoria,
                        desglose_por_medio_pago: porMedioPago,
                        transacciones: data.map(t => ({
                            id: t.id,
                            fecha: t.date ? t.date.split('T')[0] : 'N/A',
                            tipo: t.type === 'INCOME' ? 'Ingreso' : 'Egreso',
                            categoria: t.transaction_categories?.name || 'Sin categoría',
                            descripcion: t.description || 'Sin descripción',
                            monto: `${t.currency || 'ARS'} ${Number(t.amount).toLocaleString('es-AR')}`,
                            monto_num: Number(t.amount),
                            moneda: t.currency || 'ARS',
                            medio_pago: t.payment_methods?.name || 'N/A',
                            proveedor: t.suppliers?.name || null,
                            es_personal: t.is_personal || false
                        }))
                    };
                } catch (err) {
                    console.error('Error en consultar_finanzas:', err);
                    return { error: err.message };
                }
            }

            case 'consultar_inventario': {
                try {
                    let query = supabase.from('productos').select('*');
                    if (args.solo_activos !== false) {
                        query = query.or('stock.gt.0,activo.eq.true');
                    }
                    if (args.modelo) {
                        query = query.ilike('modelo', `%${args.modelo}%`);
                    }
                    const limit = args.limite || 40;
                    query = query.order('created_at', { ascending: false }).limit(limit);

                    const { data, error } = await query;
                    if (error) return { error: error.message };

                    let totalValorVentaUSD = 0;
                    let totalValorCostoUSD = 0;

                    const prods = data.map(p => {
                        const precioUSD = parseFloat(p.precio_usd) || 0;
                        const costoUSD = parseFloat(p.costo_usd) || 0;
                        totalValorVentaUSD += precioUSD;
                        totalValorCostoUSD += costoUSD;

                        return {
                            id: p.id,
                            modelo: p.modelo,
                            almacenamiento: p.almacenamiento || 'N/A',
                            colores: p.colores || 'N/A',
                            bateria: p.bateria ? (p.bateria.includes('%') ? p.bateria : `${p.bateria}%`) : 'N/A',
                            precio_usd: precioUSD ? `$${precioUSD}` : 'N/A',
                            costo_usd: costoUSD ? `$${costoUSD}` : 'N/A',
                            margen_estimado_usd: (precioUSD && costoUSD) ? `$${precioUSD - costoUSD}` : 'N/A',
                            precio_ars: p.precio_ars ? `$${Number(p.precio_ars).toLocaleString('es-AR')}` : 'N/A',
                            stock: p.stock ?? 1,
                            activo: p.activo ?? true
                        };
                    });

                    return {
                        total_encontrados: data.length,
                        resumen_inventario: {
                            unidades_analizadas: prods.length,
                            valor_venta_usd: totalValorVentaUSD,
                            valor_costo_usd: totalValorCostoUSD,
                            margen_potencial_usd: totalValorVentaUSD - totalValorCostoUSD
                        },
                        productos: prods
                    };
                } catch (err) {
                    console.error('Error en consultar_inventario:', err);
                    return { error: err.message };
                }
            }

            case 'consultar_movimientos_inventario': {
                try {
                    let query = supabase
                        .from('inventory_movements')
                        .select('*, productos(modelo, almacenamiento, colores)')
                        .order('created_at', { ascending: false })
                        .limit(args.limite || 25);

                    if (args.tipo && args.tipo !== 'todos') {
                        query = query.eq('type', args.tipo);
                    }

                    const { data, error } = await query;
                    if (error) return { error: error.message };

                    return {
                        total_movimientos: data.length,
                        movimientos: data.map(m => ({
                            id: m.id,
                            fecha: m.created_at ? m.created_at.split('T')[0] : 'N/A',
                            tipo: m.type,
                            cantidad: m.quantity,
                            motivo: m.reason || 'Sin motivo',
                            producto: m.productos ? `${m.productos.modelo} (${m.productos.almacenamiento || ''})` : 'Producto eliminado'
                        }))
                    };
                } catch (err) {
                    return { error: err.message };
                }
            }

            case 'consultar_proveedores': {
                try {
                    let query = supabase.from('suppliers').select('*').order('name');
                    if (args.busqueda) {
                        query = query.ilike('name', `%${args.busqueda}%`);
                    }
                    const { data, error } = await query;
                    if (error) return { error: error.message };

                    return {
                        total_proveedores: data.length,
                        proveedores: data.map(s => ({
                            id: s.id,
                            nombre: s.name,
                            contacto: s.contact_info || 'Sin datos de contacto'
                        }))
                    };
                } catch (err) {
                    return { error: err.message };
                }
            }

            case 'consultar_clientes': {
                try {
                    let query = supabase.from('clientes').select('*');
                    if (args.busqueda) {
                        query = query.or(`nombre.ilike.%${args.busqueda}%,telefono.ilike.%${args.busqueda}%`);
                    }
                    if (args.plataforma && args.plataforma !== 'todas') {
                        query = query.eq('plataforma', args.plataforma);
                    }
                    query = query.order('ultima_interaccion', { ascending: false }).limit(args.limite || 20);

                    let { data, error } = await query;
                    if (error || !data) {
                        const { data: contactosData } = await supabase.from('contactos').select('*').limit(args.limite || 20);
                        data = (contactosData || []).map(c => ({
                            id: c.telefono,
                            nombre: c.nombre || 'Contacto',
                            telefono: c.telefono,
                            plataforma: 'whatsapp'
                        }));
                    }

                    return {
                        total: data.length,
                        clientes: data.map(c => ({
                            id: c.id,
                            nombre: c.nombre || 'Sin nombre',
                            telefono: c.telefono,
                            plataforma: c.plataforma || 'whatsapp',
                            intencion: c.intencion || 'N/A',
                            resumen: c.resumen || '',
                            ultima_interaccion: c.ultima_interaccion || c.created_at
                        }))
                    };
                } catch (err) {
                    return { error: err.message };
                }
            }

            case 'consultar_conversacion_chat': {
                try {
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
                } catch (err) {
                    return { error: err.message };
                }
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
                    this.emit('onReportGenerated', {
                        tipo: 'PDF',
                        filename: result.filename,
                        totalPaginas: result.totalPages,
                        titulo: args.titulo
                    });
                    return {
                        success: true,
                        archivo: result.filename,
                        total_paginas: result.totalPages,
                        tipo_reporte: 'PDF',
                        mensaje: `El reporte en PDF "${args.titulo}" se generó y descargó con éxito (${result.totalPages} página(s)).`
                    };
                } catch (err) {
                    console.error('Error generando PDF en Growy:', err);
                    return {
                        success: false,
                        error: err.message
                    };
                }
            }

            case 'generar_reporte_excel': {
                try {
                    const result = growyExcel.generarReporte(args);
                    this.emit('onReportGenerated', {
                        tipo: 'EXCEL',
                        filename: result.filename,
                        totalHojas: result.totalHojas,
                        totalFilas: result.totalFilas,
                        titulo: args.titulo
                    });
                    return {
                        success: true,
                        archivo: result.filename,
                        total_hojas: result.totalHojas,
                        total_filas: result.totalFilas,
                        tipo_reporte: 'EXCEL',
                        mensaje: `La planilla de cálculo Excel "${result.filename}" se generó y descargó con éxito (${result.totalFilas} registros en ${result.totalHojas} hoja(s)).`
                    };
                } catch (err) {
                    console.error('Error generando Excel en Growy:', err);
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
     * Llamada segura a OpenAI delegada en la Edge Function de Supabase o en el servidor backend
     */
    async _llamarOpenAiSeguro({ messages, tools, tool_choice, model, temperature }) {
        // 1. Intentar llamar a la Edge Function de Supabase (sin credenciales en el cliente)
        try {
            const { data, error } = await supabase.functions.invoke('growy-agent', {
                body: { messages, tools, tool_choice, model, temperature }
            });
            if (!error && data && data.choices && data.choices[0]) {
                return data;
            }
        } catch (edgeErr) {
            console.warn('Edge function no alcanzable directamente, intentando con endpoint local /api/growy-chat...', edgeErr);
        }

        // 2. Fallback al endpoint backend seguro
        const response = await fetch('/api/growy-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages, tools, tool_choice, model, temperature })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error?.message || errData.error || `Error HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    }

    /**
     * Enviar mensaje del usuario al agente Growy
     * @param {string} userText 
     */
    async enviarMensaje(userText) {
        this.messages.push({
            role: 'user',
            content: userText
        });

        const tools = this.getToolsDefinition();
        let loopCount = 0;
        const maxLoops = 6;

        while (loopCount < maxLoops) {
            loopCount++;

            const data = await this._llamarOpenAiSeguro({
                model: this.model,
                messages: this.messages,
                tools: tools,
                tool_choice: 'auto',
                temperature: 0.3
            });

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
