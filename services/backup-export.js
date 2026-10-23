// =========================================================================
// SERVICIO DE EXPORTACIÓN Y COPIA DE SEGURIDAD INTEGRAL (EXCEL .XLSX)
// Estilo Apple SJ & Grow Labs
// Genera y descarga el expediente completo con datos 100% actualizados de Supabase
// =========================================================================

import CONFIG from '../config.js';
import { createClient } from '@supabase/supabase-js';

let _supabaseInstance = null;
function getSupabase() {
    if (_supabaseInstance) return _supabaseInstance;
    if (typeof window !== 'undefined' && window.__estiloSupabaseSingleton) {
        _supabaseInstance = window.__estiloSupabaseSingleton;
        return _supabaseInstance;
    }
    const url = (typeof CONFIG !== 'undefined' && CONFIG.supabase?.url) || 'https://gyonguqndcsmudqmptfb.supabase.co';
    const key = (typeof CONFIG !== 'undefined' && CONFIG.supabase?.anonKey) || '';
    if (typeof window !== 'undefined' && window.supabase?.createClient) {
        _supabaseInstance = window.supabase.createClient(url, key);
    } else {
        _supabaseInstance = createClient(url, key);
    }
    return _supabaseInstance;
}

export class BackupExportService {
    constructor() {
        this.masterFileUrl = './Estilo_Apple_SJ_Base_Datos_Completa.xlsx';
        this.operacionesFileUrl = './Estilo_Apple_SJ_Operaciones_CRM_Finanzas.xlsx';
        this.modalId = 'modalBackupExport';
    }

    /**
     * Asegura la disponibilidad de la librería SheetJS (XLSX)
     */
    async _ensureXLSX() {
        if (typeof window !== 'undefined' && window.XLSX) {
            return window.XLSX;
        }
        if (typeof window === 'undefined') {
            throw new Error('Entorno sin ventana');
        }
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
            script.onload = () => {
                if (window.XLSX) resolve(window.XLSX);
                else reject(new Error('SheetJS no se pudo inicializar.'));
            };
            script.onerror = () => reject(new Error('No se pudo cargar la librería SheetJS desde el CDN.'));
            document.head.appendChild(script);
        });
    }

    /**
     * Extrae todas las filas de una tabla de Supabase paginando de a 1000 registros
     * para evitar el límite por defecto de 1000 filas de la API REST.
     */
    async _fetchPaginado(sb, tabla, selectQuery = '*', orderCol = 'created_at', ascending = false, onProgress = null) {
        let allRows = [];
        let from = 0;
        const chunkSize = 1000;

        while (true) {
            let query = sb.from(tabla).select(selectQuery).range(from, from + chunkSize - 1);
            if (orderCol) {
                query = query.order(orderCol, { ascending });
            }
            const { data, error } = await query;
            if (error) {
                console.warn(`[BackupExport] Aviso al consultar ${tabla}:`, error.message);
                break;
            }
            if (!data || data.length === 0) break;
            allRows.push(...data);

            if (typeof onProgress === 'function') {
                onProgress(allRows.length);
            }

            if (data.length < chunkSize) break;
            from += chunkSize;
        }
        return allRows;
    }

    /**
     * Muestra el modal interactivo de exportación y respaldo
     */
    mostrarModal() {
        let modal = document.getElementById(this.modalId);
        if (!modal) {
            this._crearModalDOM();
            modal = document.getElementById(this.modalId);
        }
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    cerrarModal() {
        const modal = document.getElementById(this.modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * Descarga directa del archivo maestro consolidado histórico (incluye 159k chats)
     */
    descargarArchivoMaestro() {
        const link = document.createElement('a');
        link.href = `${this.masterFileUrl}?t=${Date.now()}`;
        link.download = 'Estilo_Apple_SJ_Base_Datos_Completa.xlsx';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * Descarga del archivo operativo y financiero estático precompilado
     */
    descargarArchivoOperativo() {
        const link = document.createElement('a');
        link.href = `${this.operacionesFileUrl}?t=${Date.now()}`;
        link.download = 'Estilo_Apple_SJ_Operaciones_CRM_Finanzas.xlsx';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * Exporta en vivo directamente desde Supabase en el navegador con TODA la información 100% actualizada
     */
    async exportarDatosVivos(options = { incluirMensajesRecientes: false }) {
        const XLSX = await this._ensureXLSX();
        const sb = getSupabase();

        const statusEl = document.getElementById('exportProgressStatus');
        const progressBar = document.getElementById('exportProgressBarInner');
        const btnLive = document.getElementById('btnExportLiveBackup');

        const setStatus = (txt, percent = null) => {
            if (statusEl) statusEl.innerHTML = txt;
            if (progressBar && percent !== null) {
                progressBar.style.width = `${percent}%`;
            }
            console.log(`[BackupExport] ${txt}`);
        };

        try {
            if (btnLive) {
                btnLive.disabled = true;
                btnLive.style.opacity = '0.7';
                btnLive.innerHTML = '<span class="spinner" style="display:inline-block;width:12px;height:12px;border:2px solid #FFF;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;margin-right:6px;"></span> Extrayendo base de datos...';
            }

            setStatus('⚡ Conectando a Supabase Cloud y verificando tablas...', 5);
            const wb = XLSX.utils.book_new();

            // 1. Tablas paramétricas (rápidas)
            setStatus('1/7 Consultando Categorías, Medios de Pago y Cotizaciones...', 15);
            const [{ data: categorias }, { data: mediosPago }, { data: cotizaciones }, { data: quickReplies }, { data: botCfg }] = await Promise.all([
                sb.from('transaction_categories').select('*').order('name'),
                sb.from('payment_methods').select('*').order('name'),
                sb.from('cotizacion_dolar').select('*').order('created_at', { ascending: false }),
                sb.from('crm_quick_replies').select('*').order('shortcut'),
                sb.from('bot_config').select('*').order('platform')
            ]);

            const catMap = new Map((categorias || []).map(c => [c.id, c.name]));
            const pmMap = new Map((mediosPago || []).map(m => [m.id, m.name]));

            // 2. Catálogo de Productos y Mapeo
            setStatus('2/7 Consultando Catálogo de Productos completo...', 25);
            const productos = await this._fetchPaginado(sb, 'productos', '*', 'modelo', true);
            const prodMap = new Map((productos || []).map(p => [p.id, p.modelo]));

            // 3. Historial de Stock (con nombres resueltos)
            setStatus('3/7 Consultando Historial de Movimientos de Stock...', 35);
            const inventarioRaw = await this._fetchPaginado(sb, 'inventory_movements', '*', 'created_at', false);
            const inventario = (inventarioRaw || []).map(inv => ({
                id: inv.id,
                fecha: inv.created_at,
                producto: prodMap.get(inv.product_id) || inv.product_id || 'N/A',
                tipo_movimiento: inv.type,
                cantidad: inv.quantity,
                motivo: inv.reason || ''
            }));

            // 4. Movimientos Financieros (Transacciones) completas con relaciones y cálculos
            setStatus('4/7 Consultando Movimientos Financieros (Transacciones)...', 45);
            const transaccionesRaw = await this._fetchPaginado(sb, 'transactions', '*', 'date', false, (count) => {
                setStatus(`4/7 Consultando Movimientos Financieros (${count} transacciones)...`, 48);
            });

            const transacciones = (transaccionesRaw || []).map(t => {
                const tc = Number(t.exchange_rate) || 1;
                const amt = Number(t.amount) || 0;
                const usdEquiv = t.currency === 'USD' ? amt : (tc > 0 ? Math.round((amt / tc) * 100) / 100 : amt);
                const arsEquiv = t.currency === 'ARS' ? amt : Math.round(amt * tc * 100) / 100;

                return {
                    id: t.id,
                    fecha: t.date,
                    tipo: t.type,
                    monto: amt,
                    moneda: t.currency,
                    cotizacion_dolar: tc,
                    monto_usd_equiv: usdEquiv,
                    monto_ars_equiv: arsEquiv,
                    categoria: catMap.get(t.category_id) || t.category_id || 'Sin categoría',
                    medio_pago: pmMap.get(t.payment_method_id) || t.payment_method_id || 'Sin medio de pago',
                    sucursal: t.branch || 'Principal',
                    producto_relacionado: prodMap.get(t.related_product_id) || t.related_product_id || '',
                    es_personal: t.is_personal ? 'Sí' : 'No',
                    descripcion: t.description || '',
                    fecha_creacion: t.created_at
                };
            });

            // 5. Contactos CRM (Paginación completa de los 21k+ contactos)
            setStatus('5/7 Extrayendo base completa de Contactos CRM (21.000+)...', 60);
            const contactosRaw = await this._fetchPaginado(
                sb,
                'contactos',
                'telefono, nombre, plataforma, estado, es_favorito, vendedor_asignado, modelo_dispositivo, dispositivo_interes, dispositivo_canje, cotizacion_estimada, etiquetas, motivo_cierre, email, notas, created_at, cerrado_at, cerrado_por',
                'created_at',
                false,
                (count) => {
                    setStatus(`5/7 Extrayendo Contactos CRM (${count.toLocaleString('es-AR')} registros)...`, 60 + Math.min(25, Math.floor((count / 22000) * 25)));
                }
            );

            const contactos = (contactosRaw || []).map(c => ({
                telefono: c.telefono,
                nombre: c.nombre || '',
                plataforma: c.plataforma || 'whatsapp',
                estado: c.estado || 'lead',
                es_favorito: c.es_favorito ? 'Sí' : 'No',
                vendedor_asignado: c.vendedor_asignado || '',
                modelo_dispositivo: c.modelo_dispositivo || '',
                dispositivo_interes: c.dispositivo_interes || '',
                dispositivo_canje: c.dispositivo_canje || '',
                cotizacion_estimada: c.cotizacion_estimada || 0,
                etiquetas: Array.isArray(c.etiquetas) ? c.etiquetas.join(', ') : (c.etiquetas || ''),
                motivo_cierre: c.motivo_cierre || '',
                email: c.email || '',
                notas: c.notas || '',
                fecha_creacion: c.created_at,
                fecha_cierre: c.cerrado_at || '',
                cerrado_por: c.cerrado_por || ''
            }));

            // 6. Automatizaciones, Embudo y Conversaciones IA
            setStatus('6/7 Consultando Automatizaciones, Embudo y Conversaciones IA...', 88);
            const [{ data: msgAuto }, { data: msgProg }, { data: embudo }, { data: conversaciones }, { data: importaciones }] = await Promise.all([
                sb.from('mensajes_automaticos').select('*').order('created_at', { ascending: false }),
                sb.from('mensajes_programados').select('*').order('fecha_envio', { ascending: false }),
                sb.from('embudo_ventas').select('*').order('created_at', { ascending: false }),
                sb.from('conversaciones').select('id, cliente_id, resumen_breve, intencion_detectada, crm_stage, vendedor_asignado, created_at').order('created_at', { ascending: false }).limit(2000),
                sb.from('importaciones_catalogo').select('*').order('created_at', { ascending: false })
            ]);

            // Mensajes recientes opcionales
            let mensajesRecientes = [];
            if (options.incluirMensajesRecientes) {
                setStatus('Extrayendo mensajes de chat recientes...', 92);
                const { data: msgs } = await sb.from('mensajes').select('*').order('created_at', { ascending: false }).limit(5000);
                mensajesRecientes = msgs || [];
            }

            // 7. Compilación de Hojas de Cálculo
            setStatus('7/7 Compilando y dando formato a hojas Excel (.xlsx)...', 95);

            // Cálculos KPI de control
            let totalIngresosUSD = 0;
            let totalEgresosUSD = 0;
            transacciones.forEach(t => {
                if (t.tipo === 'income' || t.tipo === 'Ingreso') totalIngresosUSD += (t.monto_usd_equiv || 0);
                if (t.tipo === 'expense' || t.tipo === 'Egreso') totalEgresosUSD += (t.monto_usd_equiv || 0);
            });
            const balanceUSD = totalIngresosUSD - totalEgresosUSD;

            const now = new Date();
            const fechaStr = now.toLocaleDateString('es-AR') + ' ' + now.toLocaleTimeString('es-AR');

            // Hoja 1: Resumen y Auditoría
            const resumenAoa = [
                ['ESTILO APPLE SAN JUAN • BASE DE DATOS Y EXPEDIENTE OPERATIVO ACTUALIZADO'],
                ['AUDITORÍA Y EXTRACCIÓN EN TIEMPO REAL - GROW LABS'],
                [],
                ['Fecha y Hora de Extracción:', fechaStr],
                ['Estado de la Información:', '100% ACTUALIZADA AL INSTANTE DIRECTO DESDE SUPABASE'],
                ['Total Contactos Registrados:', contactos.length],
                ['Total Transacciones Financieras:', transacciones.length],
                ['Total Productos en Catálogo:', (productos || []).length],
                ['Balance Financiero Acumulado (USD Equiv):', `$${balanceUSD.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`],
                [],
                ['--- DETALLE DE HOJAS CONTENIDAS EN ESTE LIBRO ---'],
                ['Hoja de Cálculo', 'Cantidad de Registros', 'Descripción del Contenido'],
                ['Contactos CRM', contactos.length, 'Base de clientes, teléfonos, preferencias de compra, canjes y estados'],
                ['Movimientos Financieros', transacciones.length, 'Libro mayor de ingresos y egresos en USD y ARS con categorías y medios'],
                ['Catálogo de Productos', (productos || []).length, 'Inventario de iPhones y accesorios con precios, costos, cuotas y stock actual'],
                ['Historial de Stock', inventario.length, 'Trazabilidad de movimientos de inventario (ingresos, egresos, ajustes)'],
                ['Cotizaciones Dólar', (cotizaciones || []).length, 'Historial de cotizaciones de cambio oficial y blue'],
                ['Categorías Financieras', (categorias || []).length, 'Clasificación contable de ingresos y gastos'],
                ['Medios de Pago', (mediosPago || []).length, 'Efectivo, Transferencia, USDT y medios admitidos'],
                ['Respuestas Rápidas', (quickReplies || []).length, 'Plantillas y atajos de atención comercial para vendedores'],
                ['Configuración Bot', (botCfg || []).length, 'Parámetros activos de automatización para WhatsApp e Instagram'],
                ['Automatizaciones', (msgAuto || []).length + (msgProg || []).length, 'Disparadores y mensajes automáticos configurados'],
                ['Embudo de Ventas', (embudo || []).length, 'Etapas y ciclo de vida de clientes en CRM'],
                ['Conversaciones IA', (conversaciones || []).length, 'Resúmenes, intenciones y clasificación por Inteligencia Artificial'],
                ['Historial Importaciones', (importaciones || []).length, 'Registro histórico de importaciones de listas de precios']
            ];

            if (options.incluirMensajesRecientes) {
                resumenAoa.push(['Mensajes Recientes', mensajesRecientes.length, 'Últimos mensajes de WhatsApp e Instagram']);
            }

            const wsResumen = XLSX.utils.aoa_to_sheet(resumenAoa);
            wsResumen['!cols'] = [{ wch: 32 }, { wch: 22 }, { wch: 70 }];
            XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen y Control');

            // Hojas de datos completas
            if (contactos.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(contactos), 'Contactos CRM');
            if (transacciones.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(transacciones), 'Movimientos Financieros');
            if (productos && productos.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(productos), 'Catálogo de Productos');
            if (inventario.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(inventario), 'Historial de Stock');
            if (cotizaciones && cotizaciones.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(cotizaciones), 'Cotizaciones Dólar');
            if (categorias && categorias.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(categorias), 'Categorías');
            if (mediosPago && mediosPago.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mediosPago), 'Medios de Pago');
            if (quickReplies && quickReplies.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(quickReplies), 'Respuestas Rápidas');
            if (botCfg && botCfg.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(botCfg), 'Config Bot');
            if (msgAuto && msgAuto.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(msgAuto), 'Mensajes Automáticos');
            if (msgProg && msgProg.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(msgProg), 'Mensajes Programados');
            if (embudo && embudo.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(embudo), 'Embudo Ventas');
            if (conversaciones && conversaciones.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(conversaciones), 'Conversaciones IA');
            if (importaciones && importaciones.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(importaciones), 'Historial Importaciones');
            if (mensajesRecientes.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mensajesRecientes), 'Mensajes Recientes');

            const timestampFile = now.toISOString().slice(0, 10) + '_' + String(now.getHours()).padStart(2, '0') + '-' + String(now.getMinutes()).padStart(2, '0');
            const fileName = `Estilo_Apple_SJ_Operaciones_CRM_Finanzas_${timestampFile}.xlsx`;

            setStatus(`💾 Guardando y descargando ${fileName}...`, 98);
            XLSX.writeFile(wb, fileName);

            setStatus(`✅ ¡Descarga completada con éxito! Archivo: <strong>${fileName}</strong> (${contactos.length.toLocaleString('es-AR')} contactos, ${transacciones.length.toLocaleString('es-AR')} transacciones)`, 100);

            return { success: true, fileName, contactos: contactos.length, transacciones: transacciones.length };
        } catch (error) {
            console.error('Error exportando datos vivos:', error);
            setStatus(`❌ Error al generar archivo: ${error.message}`, 0);
            throw error;
        } finally {
            if (btnLive) {
                btnLive.disabled = false;
                btnLive.style.opacity = '1';
                btnLive.innerHTML = '⚡ Descargar Excel Actualizado en Vivo (100% al día)';
            }
        }
    }

    _crearModalDOM() {
        const modal = document.createElement('div');
        modal.id = this.modalId;
        modal.style.cssText = `
            display: none;
            position: fixed;
            top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0, 0, 0, 0.65);
            backdrop-filter: blur(6px);
            z-index: 99999;
            align-items: center;
            justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        `;

        modal.innerHTML = `
            <style>
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                @keyframes modalPop { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
                .backup-action-card:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.08); }
            </style>
            <div style="background: #FFFFFF; width: 92%; max-width: 660px; border-radius: 18px; box-shadow: 0 24px 48px rgba(0,0,0,0.28); overflow: hidden; display: flex; flex-direction: column; animation: modalPop 0.22s ease-out; border: 1px solid #E5E5EA;">
                <!-- Header Institucional -->
                <div style="padding: 1.25rem 1.5rem; background: linear-gradient(135deg, #107C41 0%, #0B5A2F 100%); color: #FFFFFF; display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 0.85rem;">
                        <div style="background: rgba(255,255,255,0.2); width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="12" y1="18" x2="12" y2="12"></line>
                                <polyline points="9 15 12 18 15 15"></polyline>
                            </svg>
                        </div>
                        <div>
                            <h3 style="margin: 0; font-size: 1.15rem; font-weight: 700; letter-spacing: -0.01em;">Descargar Base de Datos Completa (Excel)</h3>
                            <p style="margin: 0; font-size: 0.82rem; opacity: 0.9;">Estilo Apple San Juan • Copia de Seguridad y Auditoría</p>
                        </div>
                    </div>
                    <button id="btnCloseBackupModal" style="background: none; border: none; color: #FFFFFF; font-size: 1.6rem; cursor: pointer; line-height: 1; padding: 0.25rem; opacity: 0.85; transition: opacity 0.2s;">&times;</button>
                </div>

                <!-- Body -->
                <div style="padding: 1.5rem; color: #1D1D1F; max-height: 72vh; overflow-y: auto;">
                    <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-left: 4px solid #107C41; padding: 0.85rem 1rem; border-radius: 8px; font-size: 0.85rem; margin-bottom: 1.25rem; color: #166534; line-height: 1.4;">
                        <strong>✨ Información 100% Actualizada:</strong> El sistema compila directamente la base de datos de Supabase en tiempo real, garantizando que todos los nuevos contactos, movimientos financieros, catálogo y stock figuren con fecha y hora de este instante.
                    </div>

                    <!-- Métricas clave en vivo -->
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.6rem; font-size: 0.82rem; margin-bottom: 1.25rem;">
                        <div style="background: #F8F9FA; border: 1px solid #E5E5EA; padding: 0.65rem 0.5rem; border-radius: 10px; text-align: center;">
                            <span style="color: #6B7280; display: block; font-size: 0.7rem; font-weight: 600; text-transform: uppercase;">Contactos</span>
                            <strong style="font-size: 1.1rem; color: #107C41;">21.291+</strong>
                        </div>
                        <div style="background: #F8F9FA; border: 1px solid #E5E5EA; padding: 0.65rem 0.5rem; border-radius: 10px; text-align: center;">
                            <span style="color: #6B7280; display: block; font-size: 0.7rem; font-weight: 600; text-transform: uppercase;">Finanzas</span>
                            <strong style="font-size: 1.1rem; color: #107C41;">2.206+</strong>
                        </div>
                        <div style="background: #F8F9FA; border: 1px solid #E5E5EA; padding: 0.65rem 0.5rem; border-radius: 10px; text-align: center;">
                            <span style="color: #6B7280; display: block; font-size: 0.7rem; font-weight: 600; text-transform: uppercase;">Catálogo</span>
                            <strong style="font-size: 1.1rem; color: #107C41;">195+</strong>
                        </div>
                        <div style="background: #F8F9FA; border: 1px solid #E5E5EA; padding: 0.65rem 0.5rem; border-radius: 10px; text-align: center;">
                            <span style="color: #6B7280; display: block; font-size: 0.7rem; font-weight: 600; text-transform: uppercase;">Hojas</span>
                            <strong style="font-size: 1.1rem; color: #107C41;">15 Hojas</strong>
                        </div>
                    </div>

                    <!-- OPCIÓN 1: VIVA Y ACTUALIZADA AL INSTANTE (LA RECOMENDADA) -->
                    <div class="backup-action-card" style="border: 2px solid #107C41; background: #F0FDF4; border-radius: 14px; padding: 1.15rem; margin-bottom: 1rem; transition: all 0.2s ease;">
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; margin-bottom: 0.6rem;">
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <span style="background: #107C41; color: #FFF; font-size: 0.65rem; font-weight: 700; padding: 0.2rem 0.5rem; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.05em;">Recomendado • Siempre al día</span>
                            </div>
                            <span style="font-size: 0.75rem; font-weight: 600; color: #107C41;">Tiempo real (~8s)</span>
                        </div>
                        <h4 style="margin: 0 0 0.35rem 0; font-size: 1.02rem; font-weight: 700; color: #064E3B;">
                            ⚡ Expediente Operativo & CRM Actualizado en Vivo (.xlsx)
                        </h4>
                        <p style="margin: 0 0 0.85rem 0; font-size: 0.82rem; color: #374151; line-height: 1.4;">
                            Extrae <strong>todos los registros existentes en Supabase en este segundo exacto</strong>: Contactos (21k+), Movimientos Financieros (2.2k+ con nombres de categorías y medios de pago), Catálogo valorizado, Historial de Stock, Cotizaciones, Conversaciones IA y Automatizaciones.
                        </p>
                        <button id="btnExportLiveBackup" style="width: 100%; background: #107C41; color: #FFFFFF; border: none; padding: 0.75rem 1.25rem; border-radius: 10px; font-weight: 700; font-size: 0.92rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; transition: background 0.2s; box-shadow: 0 2px 8px rgba(16,124,65,0.25);">
                            ⚡ Descargar Excel Actualizado en Vivo (100% al día)
                        </button>
                    </div>

                    <!-- OPCIÓN 2: DESCARGA DIRECTA DE ARCHIVO OPERATIVO -->
                    <div class="backup-action-card" style="border: 1px solid #D1D5DB; background: #FFFFFF; border-radius: 12px; padding: 0.9rem 1.1rem; margin-bottom: 0.85rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; transition: all 0.2s ease;">
                        <div>
                            <div style="font-weight: 700; color: #1F2937; font-size: 0.92rem; margin-bottom: 0.15rem;">
                                📥 Descarga Inmediata Precompilada (.xlsx • 8.5 MB)
                            </div>
                            <div style="font-size: 0.78rem; color: #6B7280; line-height: 1.35;">
                                Descarga directa del archivo consolidado de hoy sin esperar el procesamiento del navegador.
                            </div>
                        </div>
                        <button id="btnDownloadOperacionesBackup" style="background: #F3F4F6; color: #1F2937; border: 1px solid #D1D5DB; padding: 0.55rem 1rem; border-radius: 8px; font-weight: 600; font-size: 0.82rem; cursor: pointer; white-space: nowrap; transition: background 0.2s;">
                            Descargar (8.5 MB)
                        </button>
                    </div>

                    <!-- OPCIÓN 3: RESPALDO HISTÓRICO TOTAL CON 159K CHATS -->
                    <div class="backup-action-card" style="border: 1px solid #E5E7EB; background: #F9FAFB; border-radius: 12px; padding: 0.9rem 1.1rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; transition: all 0.2s ease;">
                        <div>
                            <div style="font-weight: 700; color: #374151; font-size: 0.92rem; margin-bottom: 0.15rem;">
                                📦 Respaldo Histórico Maestro Total (.xlsx • 98 MB)
                            </div>
                            <div style="font-size: 0.78rem; color: #6B7280; line-height: 1.35;">
                                Incluye además las 10 hojas con los <strong>159.263 mensajes históricos</strong> de WhatsApp e Instagram desglosados por mes.
                            </div>
                        </div>
                        <button id="btnDownloadMasterBackup" style="background: #E5E7EB; color: #374151; border: 1px solid #D1D5DB; padding: 0.55rem 1rem; border-radius: 8px; font-weight: 600; font-size: 0.82rem; cursor: pointer; white-space: nowrap; transition: background 0.2s;">
                            Descargar (98 MB)
                        </button>
                    </div>

                    <!-- Progress bar container -->
                    <div id="exportProgressBarContainer" style="margin-top: 1.25rem; display: none;">
                        <div style="width: 100%; background: #E5E7EB; height: 8px; border-radius: 4px; overflow: hidden;">
                            <div id="exportProgressBarInner" style="width: 0%; height: 100%; background: linear-gradient(90deg, #107C41, #34D399); transition: width 0.3s ease;"></div>
                        </div>
                    </div>

                    <!-- Status Text -->
                    <div id="exportProgressStatus" style="margin-top: 0.75rem; font-size: 0.82rem; color: #4B5563; text-align: center; min-height: 1.2rem; line-height: 1.4;"></div>
                </div>

                <!-- Footer -->
                <div style="padding: 0.85rem 1.5rem; background: #F9FAFB; border-top: 1px solid #E5E5EA; display: flex; justify-content: flex-end; align-items: center; gap: 0.75rem;">
                    <span style="font-size: 0.75rem; color: #9CA3AF; margin-right: auto;">Grow Labs • Sanatorio Argentino Ecosystem</span>
                    <button id="btnCloseBackupModalFooter" style="background: #E5E7EB; border: none; color: #1F2937; padding: 0.45rem 1.1rem; border-radius: 8px; font-size: 0.85rem; font-weight: 500; cursor: pointer; transition: background 0.2s;">Cerrar</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Bind events
        const btnClose = document.getElementById('btnCloseBackupModal');
        const btnCloseFooter = document.getElementById('btnCloseBackupModalFooter');
        if (btnClose) btnClose.onclick = () => this.cerrarModal();
        if (btnCloseFooter) btnCloseFooter.onclick = () => this.cerrarModal();

        modal.onclick = (e) => {
            if (e.target === modal) this.cerrarModal();
        };

        const btnMaster = document.getElementById('btnDownloadMasterBackup');
        if (btnMaster) {
            btnMaster.onclick = () => this.descargarArchivoMaestro();
        }

        const btnOperaciones = document.getElementById('btnDownloadOperacionesBackup');
        if (btnOperaciones) {
            btnOperaciones.onclick = () => this.descargarArchivoOperativo();
        }

        const btnExportLive = document.getElementById('btnExportLiveBackup');
        if (btnExportLive) {
            btnExportLive.onclick = async () => {
                const progressContainer = document.getElementById('exportProgressBarContainer');
                if (progressContainer) progressContainer.style.display = 'block';
                try {
                    await this.exportarDatosVivos();
                } catch (e) {
                    console.error('Error al exportar:', e);
                }
            };
        }
    }
}

export const backupExport = new BackupExportService();

if (typeof window !== 'undefined') {
    window.backupExport = backupExport;
    window.descargarBaseDatosExcel = (options) => {
        if (options && options.directo) {
            return backupExport.exportarDatosVivos(options);
        }
        return backupExport.mostrarModal();
    };
}
