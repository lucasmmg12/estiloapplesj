const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const envPath = path.resolve(__dirname, '../.env');
const env = {};
fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        let val = trimmed.substring(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
        }
        env[key] = val;
    }
});

const token = env.SUPABASE_ACCESS_TOKEN;
const projectRef = 'gyonguqndcsmudqmptfb';

async function runSql(query) {
    const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
    });
    return await res.json();
}

async function exportOperational() {
    console.log('--- GENERANDO EXPEDIENTE OPERATIVO Y FINANCIERO (SIN CHATS MASIVOS) ---');
    const wb = XLSX.utils.book_new();

    const categories = await runSql('SELECT * FROM transaction_categories ORDER BY type, name;');
    const paymentMethods = await runSql('SELECT * FROM payment_methods ORDER BY name;');
    const productos = await runSql('SELECT * FROM productos ORDER BY modelo ASC;');
    const transactions = await runSql(`
        SELECT 
            t.id, t.date, t.type, t.amount, t.currency, t.exchange_rate,
            CASE WHEN t.currency = 'USD' THEN t.amount ELSE ROUND(t.amount / NULLIF(t.exchange_rate, 0), 2) END as amount_usd_equiv,
            CASE WHEN t.currency = 'ARS' THEN t.amount ELSE ROUND(t.amount * t.exchange_rate, 2) END as amount_ars_equiv,
            tc.name as categoria, pm.name as medio_pago, t.branch as sucursal,
            p.modelo as producto_relacionado, t.is_personal as es_personal, t.description, t.created_at
        FROM transactions t
        LEFT JOIN transaction_categories tc ON t.category_id = tc.id
        LEFT JOIN payment_methods pm ON t.payment_method_id = pm.id
        LEFT JOIN productos p ON t.related_product_id = p.id
        ORDER BY t.date DESC;
    `);
    const inventory = await runSql(`
        SELECT im.id, im.created_at as fecha, p.modelo as producto, im.type as tipo_movimiento, im.quantity as cantidad, im.reason as motivo
        FROM inventory_movements im
        LEFT JOIN productos p ON im.product_id = p.id
        ORDER BY im.created_at DESC;
    `);
    const contactos = await runSql(`
        SELECT telefono, nombre, plataforma, estado, es_favorito, vendedor_asignado, modelo_dispositivo,
               dispositivo_interes, dispositivo_canje, cotizacion_estimada, array_to_string(etiquetas, ', ') as etiquetas,
               motivo_cierre, email, notas, created_at as fecha_creacion, cerrado_at as fecha_cierre, cerrado_por
        FROM contactos ORDER BY created_at DESC;
    `);
    const dolar = await runSql('SELECT * FROM cotizacion_dolar ORDER BY created_at DESC;');
    const quickReplies = await runSql('SELECT * FROM crm_quick_replies ORDER BY shortcut ASC;');
    const botConfig = await runSql('SELECT * FROM bot_config ORDER BY platform ASC;');
    const msgAuto = await runSql('SELECT * FROM mensajes_automaticos ORDER BY created_at DESC;');
    const msgProg = await runSql('SELECT * FROM mensajes_programados ORDER BY fecha_envio DESC;');
    const embudo = await runSql('SELECT * FROM embudo_ventas ORDER BY created_at DESC;');
    const importaciones = await runSql('SELECT * FROM importaciones_catalogo ORDER BY created_at DESC;');
    const conversaciones = await runSql('SELECT id, cliente_id, resumen_breve, intencion_detectada, crm_stage, vendedor_asignado, created_at FROM conversaciones ORDER BY created_at DESC;');

    // Resumen
    const resumenAoa = [
        ['ESTILO APPLE SAN JUAN - EXPEDIENTE OPERATIVO, CRM Y FINANZAS'],
        ['EXPEDIENTE EJECUTIVO DE CIERRE DE SERVICIO'],
        ['Generado por:', 'Grow Labs & Antigravity IDE'],
        ['Fecha y Hora:', new Date().toLocaleString('es-AR')],
        ['Cliente / Proyecto:', 'Estilo Apple San Juan (estiloapplesj)'],
        [],
        ['--- RESUMEN DE HOJAS CONTENIDAS ---'],
        ['Hoja', 'Tabla Base de Datos', 'Cantidad de Filas', 'Descripción'],
        ['Contactos CRM', 'contactos', contactos.length, 'Base de clientes, teléfonos, preferencias de compra, canjes y estados'],
        ['Movimientos Financieros', 'transactions', transactions.length, 'Libro mayor de ingresos y egresos en USD y ARS'],
        ['Catálogo de Productos', 'productos', productos.length, 'Inventario de iPhones y equipos con precios, costos, cuotas y stock actual'],
        ['Historial de Stock', 'inventory_movements', inventory.length, 'Movimientos de inventario (ingresos, egresos, ajustes)'],
        ['Cotizaciones Dólar', 'cotizacion_dolar', dolar.length, 'Historial de tipo de cambio oficial del sistema'],
        ['Categorías Financieras', 'transaction_categories', categories.length, 'Clasificación contable de ingresos y gastos'],
        ['Medios de Pago', 'payment_methods', paymentMethods.length, 'Métodos de cobro y pago admitidos'],
        ['Respuestas Rápidas', 'crm_quick_replies', quickReplies.length, 'Plantillas de atención y atajos de vendedores'],
        ['Configuración Bot', 'bot_config', botConfig.length, 'Estado y configuración de automatización WhatsApp e Instagram'],
        ['Automatizaciones y Embudo', 'mensajes_automaticos/programados/embudo', msgAuto.length + msgProg.length + embudo.length, 'Disparadores y mensajes automáticos configurados'],
        ['Conversaciones IA', 'conversaciones', conversaciones.length, 'Resúmenes e intenciones clasificadas por IA'],
        ['Historial Importaciones', 'importaciones_catalogo', importaciones.length, 'Logs históricos de carga de listas'],
        [],
        ['Nota:', 'Para el historial de los 159.263 chats individuales de WhatsApp/Instagram, descargar el archivo maestro "Estilo_Apple_SJ_Base_Datos_Completa.xlsx".']
    ];
    const wsResumen = XLSX.utils.aoa_to_sheet(resumenAoa);
    wsResumen['!cols'] = [{ wch: 30 }, { wch: 30 }, { wch: 20 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen y Control');

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(contactos), 'Contactos CRM');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(transactions), 'Movimientos Financieros');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(productos), 'Catálogo de Productos');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(inventory), 'Historial de Stock');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dolar), 'Cotizaciones Dólar');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(categories), 'Categorías');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(paymentMethods), 'Medios de Pago');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(quickReplies), 'Respuestas Rápidas');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(botConfig), 'Config Bot');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(msgAuto), 'Mensajes Automáticos');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(msgProg), 'Mensajes Programados');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(embudo), 'Embudo Ventas');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(conversaciones), 'Conversaciones IA');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(importaciones), 'Historial Importaciones');

    const filename = 'Estilo_Apple_SJ_Operaciones_CRM_Finanzas.xlsx';
    const outputPath = path.resolve(__dirname, '../', filename);
    const publicOutputPath = path.resolve(__dirname, '../public/', filename);

    XLSX.writeFile(wb, outputPath);
    try {
        fs.copyFileSync(outputPath, publicOutputPath);
    } catch (e) {
        console.log('Nota public/:', e.message);
    }

    const stats = fs.statSync(outputPath);
    console.log(`✅ Archivo operativo generado: ${outputPath} (${(stats.size/(1024*1024)).toFixed(2)} MB)`);
}

exportOperational().catch(console.error);
