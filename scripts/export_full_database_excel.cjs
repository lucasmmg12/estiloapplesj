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
    if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status}: ${txt}`);
    }
    return await res.json();
}

async function exportDatabase() {
    console.log('--- INICIANDO EXPORTACIÓN COMPLETA A EXCEL ---');
    const tStart = Date.now();
    const wb = XLSX.utils.book_new();

    // 1. Tablas Maestras
    console.log('1/12 Consultando categorías y medios de pago...');
    const categories = await runSql('SELECT * FROM transaction_categories ORDER BY type, name;');
    const catMap = new Map(categories.map(c => [c.id, c.name]));

    const paymentMethods = await runSql('SELECT * FROM payment_methods ORDER BY name;');
    const pmMap = new Map(paymentMethods.map(p => [p.id, p.name]));

    // 2. Productos
    console.log('2/12 Consultando catálogo de productos...');
    const productos = await runSql('SELECT * FROM productos ORDER BY modelo ASC;');
    const prodMap = new Map(productos.map(p => [p.id, p.modelo]));

    // 3. Transacciones enriquecidas
    console.log('3/12 Consultando movimientos financieros (transacciones)...');
    const transactions = await runSql(`
        SELECT 
            t.id,
            t.date,
            t.type,
            t.amount,
            t.currency,
            t.exchange_rate,
            CASE 
                WHEN t.currency = 'USD' THEN t.amount 
                ELSE ROUND(t.amount / NULLIF(t.exchange_rate, 0), 2) 
            END as amount_usd_equiv,
            CASE 
                WHEN t.currency = 'ARS' THEN t.amount 
                ELSE ROUND(t.amount * t.exchange_rate, 2) 
            END as amount_ars_equiv,
            tc.name as categoria,
            pm.name as medio_pago,
            t.branch as sucursal,
            p.modelo as producto_relacionado,
            t.is_personal as es_personal,
            t.description,
            t.created_at
        FROM transactions t
        LEFT JOIN transaction_categories tc ON t.category_id = tc.id
        LEFT JOIN payment_methods pm ON t.payment_method_id = pm.id
        LEFT JOIN productos p ON t.related_product_id = p.id
        ORDER BY t.date DESC;
    `);

    // 4. Historial de Stock
    console.log('4/12 Consultando historial de movimientos de inventario...');
    const inventory = await runSql(`
        SELECT 
            im.id,
            im.created_at as fecha,
            p.modelo as producto,
            im.type as tipo_movimiento,
            im.quantity as cantidad,
            im.reason as motivo
        FROM inventory_movements im
        LEFT JOIN productos p ON im.product_id = p.id
        ORDER BY im.created_at DESC;
    `);

    // 5. Contactos CRM
    console.log('5/12 Consultando base completa de contactos (21k+)...');
    const contactos = await runSql(`
        SELECT 
            telefono,
            nombre,
            plataforma,
            estado,
            es_favorito,
            vendedor_asignado,
            modelo_dispositivo,
            dispositivo_interes,
            dispositivo_canje,
            cotizacion_estimada,
            array_to_string(etiquetas, ', ') as etiquetas,
            motivo_cierre,
            email,
            notas,
            created_at as fecha_creacion,
            cerrado_at as fecha_cierre,
            cerrado_por
        FROM contactos
        ORDER BY created_at DESC;
    `);

    // 6. Cotización Dólar
    console.log('6/12 Consultando cotizaciones históricas...');
    const dolar = await runSql('SELECT * FROM cotizacion_dolar ORDER BY created_at DESC;');

    // 7. Respuestas Rápidas CRM
    console.log('7/12 Consultando respuestas rápidas CRM...');
    const quickReplies = await runSql('SELECT * FROM crm_quick_replies ORDER BY shortcut ASC;');

    // 8. Mensajes Automáticos, Programados, Embudo, Bot Config
    console.log('8/12 Consultando automatizaciones y configuración de bot...');
    const botConfig = await runSql('SELECT * FROM bot_config ORDER BY platform ASC;');
    const msgAuto = await runSql('SELECT * FROM mensajes_automaticos ORDER BY created_at DESC;');
    const msgProg = await runSql('SELECT * FROM mensajes_programados ORDER BY fecha_envio DESC;');
    const embudo = await runSql('SELECT * FROM embudo_ventas ORDER BY created_at DESC;');
    const importaciones = await runSql('SELECT * FROM importaciones_catalogo ORDER BY created_at DESC;');
    const conversaciones = await runSql('SELECT id, cliente_id, resumen_breve, intencion_detectada, crm_stage, vendedor_asignado, created_at FROM conversaciones ORDER BY created_at DESC;');

    // 9. Mensajes de Chat (159k registros) por lotes
    console.log('9/12 Consultando historial completo de mensajes por meses...');
    const monthsRes = await runSql(`
        SELECT DISTINCT to_char(created_at, 'YYYY-MM') as month 
        FROM mensajes 
        ORDER BY 1 DESC;
    `);
    const months = monthsRes.map(m => m.month);
    console.log(`Meses detectados: ${months.join(', ')}`);

    let allMessages = [];
    for (const m of months) {
        process.stdout.write(`  Descargando mensajes mes ${m}... `);
        const tMonth = Date.now();
        const batch = await runSql(`
            SELECT 
                created_at as fecha_hora,
                cliente_telefono as telefono,
                plataforma,
                CASE WHEN es_mio THEN 'Saliente (Nosotros)' ELSE 'Entrante (Cliente)' END as direccion,
                remitente_nombre as remitente,
                CASE WHEN es_nota_privada THEN 'SI' ELSE 'NO' END as nota_interna,
                contenido as mensaje,
                media_url,
                media_type,
                estado
            FROM mensajes
            WHERE to_char(created_at, 'YYYY-MM') = '${m}'
            ORDER BY created_at ASC;
        `);
        console.log(`${batch.length} registros (${((Date.now() - tMonth)/1000).toFixed(1)}s)`);
        allMessages = allMessages.concat(batch);
    }
    console.log(`Total mensajes acumulados: ${allMessages.length}`);

    // CREACIÓN DE HOJAS EN EL LIBRO EXCEL
    console.log('10/12 Ensamblando hojas de cálculo...');

    // Hoja 1: Resumen y Metadatos
    const resumenAoa = [
        ['ESTILO APPLE SAN JUAN - COPIA DE SEGURIDAD Y CIERRE DE SERVICIO'],
        ['EXPEDIENTE COMPLETO DE BASE DE DATOS'],
        ['Generado por:', 'Grow Labs & Antigravity IDE'],
        ['Fecha y Hora:', new Date().toLocaleString('es-AR')],
        ['Cliente / Proyecto:', 'Estilo Apple San Juan (estiloapplesj)'],
        [],
        ['--- RESUMEN DE REGISTROS POR TABLA / HOJA ---'],
        ['Hoja', 'Tabla Base de Datos', 'Cantidad de Filas', 'Descripción'],
        ['Contactos CRM', 'contactos', contactos.length, 'Base de clientes, teléfonos, preferencias de compra, canjes y estados'],
        ['Movimientos Financieros', 'transactions', transactions.length, 'Libro mayor de ingresos y egresos en USD y ARS con categorías y medios de pago'],
        ['Catálogo de Productos', 'productos', productos.length, 'Inventario de iPhones y equipos con precios, costos, cuotas y stock actual'],
        ['Historial de Stock', 'inventory_movements', inventory.length, 'Movimientos de inventario (ingresos, egresos, ajustes)'],
        ['Historial de Mensajes', 'mensajes', allMessages.length, 'Trazabilidad completa de chats de WhatsApp e Instagram'],
        ['Cotizaciones Dólar', 'cotizacion_dolar', dolar.length, 'Historial de tipo de cambio oficial del sistema'],
        ['Categorías Financieras', 'transaction_categories', categories.length, 'Clasificación contable de ingresos y gastos'],
        ['Medios de Pago', 'payment_methods', paymentMethods.length, 'Métodos de cobro y pago admitidos'],
        ['Respuestas Rápidas', 'crm_quick_replies', quickReplies.length, 'Plantillas de atención y atajos de vendedores'],
        ['Configuración Bot', 'bot_config', botConfig.length, 'Estado y configuración de automatización WhatsApp e Instagram'],
        ['Automatizaciones y Embudo', 'mensajes_automaticos/programados/embudo', msgAuto.length + msgProg.length + embudo.length, 'Disparadores y mensajes automáticos configurados'],
        ['Conversaciones IA', 'conversaciones', conversaciones.length, 'Resúmenes e intenciones clasificadas por IA'],
        [],
        ['--- TOTALES Y MÉTRICAS CLAVE ---'],
        ['Total Contactos Registrados:', contactos.length],
        ['Total Mensajes Transmitidos:', allMessages.length],
        ['Total Movimientos Financieros:', transactions.length],
        ['Total Productos en Catálogo:', productos.length]
    ];
    const wsResumen = XLSX.utils.aoa_to_sheet(resumenAoa);
    wsResumen['!cols'] = [{ wch: 30 }, { wch: 30 }, { wch: 20 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen y Control');

    // Hoja 2: Contactos CRM
    const wsContactos = XLSX.utils.json_to_sheet(contactos);
    XLSX.utils.book_append_sheet(wb, wsContactos, 'Contactos CRM');

    // Hoja 3: Movimientos Financieros
    const wsTransactions = XLSX.utils.json_to_sheet(transactions);
    XLSX.utils.book_append_sheet(wb, wsTransactions, 'Movimientos Financieros');

    // Hoja 4: Catálogo de Productos
    const wsProductos = XLSX.utils.json_to_sheet(productos);
    XLSX.utils.book_append_sheet(wb, wsProductos, 'Catálogo de Productos');

    // Hoja 5: Historial de Stock
    const wsInventory = XLSX.utils.json_to_sheet(inventory);
    XLSX.utils.book_append_sheet(wb, wsInventory, 'Historial de Stock');

    // Hoja 6: Historial de Mensajes (Chat)
    console.log('11/12 Escribiendo hoja de Mensajes (159k filas)...');
    const wsMensajes = XLSX.utils.json_to_sheet(allMessages);
    XLSX.utils.book_append_sheet(wb, wsMensajes, 'Historial de Mensajes');

    // Hoja 7: Cotizaciones Dólar
    const wsDolar = XLSX.utils.json_to_sheet(dolar);
    XLSX.utils.book_append_sheet(wb, wsDolar, 'Cotizaciones Dólar');

    // Hoja 8: Categorías y Medios de Pago
    const wsCategories = XLSX.utils.json_to_sheet(categories);
    XLSX.utils.book_append_sheet(wb, wsCategories, 'Categorías');

    const wsPM = XLSX.utils.json_to_sheet(paymentMethods);
    XLSX.utils.book_append_sheet(wb, wsPM, 'Medios de Pago');

    // Hoja 9: Respuestas Rápidas CRM
    const wsQuick = XLSX.utils.json_to_sheet(quickReplies);
    XLSX.utils.book_append_sheet(wb, wsQuick, 'Respuestas Rápidas');

    // Hoja 10: Bot y Automatizaciones
    const wsBot = XLSX.utils.json_to_sheet(botConfig);
    XLSX.utils.book_append_sheet(wb, wsBot, 'Config Bot');

    const wsAuto = XLSX.utils.json_to_sheet(msgAuto);
    XLSX.utils.book_append_sheet(wb, wsAuto, 'Mensajes Automáticos');

    const wsProg = XLSX.utils.json_to_sheet(msgProg);
    XLSX.utils.book_append_sheet(wb, wsProg, 'Mensajes Programados');

    const wsEmbudo = XLSX.utils.json_to_sheet(embudo);
    XLSX.utils.book_append_sheet(wb, wsEmbudo, 'Embudo Ventas');

    // Hoja 11: Conversaciones IA
    const wsConv = XLSX.utils.json_to_sheet(conversaciones);
    XLSX.utils.book_append_sheet(wb, wsConv, 'Conversaciones IA');

    // Hoja 12: Importaciones Históricas
    const wsImp = XLSX.utils.json_to_sheet(importaciones);
    XLSX.utils.book_append_sheet(wb, wsImp, 'Historial Importaciones');

    // 12. Guardar Archivo Excel
    console.log('12/12 Escribiendo archivo a disco...');
    const filename = 'Estilo_Apple_SJ_Base_Datos_Completa.xlsx';
    const outputPath = path.resolve(__dirname, '../', filename);
    const publicOutputPath = path.resolve(__dirname, '../public/', filename);

    XLSX.writeFile(wb, outputPath);
    try {
        fs.copyFileSync(outputPath, publicOutputPath);
    } catch (e) {
        console.log('Nota: no se copió a public/:', e.message);
    }

    const stats = fs.statSync(outputPath);
    const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
    const elapsed = ((Date.now() - tStart) / 1000).toFixed(1);

    console.log(`\n======================================================`);
    console.log(`✅ EXPORTACIÓN EXITOSA A EXCEL (.xlsx)`);
    console.log(`📁 Archivo generado: ${outputPath}`);
    console.log(`📦 Tamaño del archivo: ${sizeMb} MB`);
    console.log(`📑 Hojas creadas: ${wb.SheetNames.length} hojas (${wb.SheetNames.join(', ')})`);
    console.log(`⏱️ Tiempo total: ${elapsed} segundos`);
    console.log(`======================================================\n`);
}

exportDatabase().catch(err => {
    console.error('Error fatal en exportación:', err);
});
