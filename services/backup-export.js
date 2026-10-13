// =========================================================================
// SERVICIO DE EXPORTACIÓN Y COPIA DE SEGURIDAD INTEGRAL (EXCEL .XLSX)
// Estilo Apple SJ & Grow Labs
// Genera y descarga el expediente completo con todas las tablas del sistema
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

    _getXLSX() {
        if (typeof window !== 'undefined' && window.XLSX) {
            return window.XLSX;
        }
        throw new Error('La librería SheetJS (XLSX) no está cargada en la página.');
    }

    /**
     * Muestra el modal interactivo de exportación y respaldo de cierre de servicio
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
     * Descarga directa del archivo maestro consolidado con todas las 16 hojas históricas (incluye 159k chats)
     */
    descargarArchivoMaestro() {
        const link = document.createElement('a');
        link.href = this.masterFileUrl;
        link.download = 'Estilo_Apple_SJ_Base_Datos_Completa.xlsx';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * Descarga del archivo operativo y financiero (15 hojas, sin los 159k chats para apertura instantánea)
     */
    descargarArchivoOperativo() {
        const link = document.createElement('a');
        link.href = this.operacionesFileUrl;
        link.download = 'Estilo_Apple_SJ_Operaciones_CRM_Finanzas.xlsx';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * Exporta en vivo directamente desde Supabase en el navegador a un archivo Excel multi-hoja
     * @param {Object} options { incluirMensajesRecientes: boolean }
     */
    async exportarDatosVivos(options = { incluirMensajesRecientes: true }) {
        const XLSX = this._getXLSX();
        const sb = getSupabase();
        const statusEl = document.getElementById('exportProgressStatus');
        const setStatus = (txt) => {
            if (statusEl) statusEl.innerText = txt;
            console.log(`[BackupExport] ${txt}`);
        };

        try {
            setStatus('Iniciando extracción de datos vivos de Supabase...');
            const wb = XLSX.utils.book_new();

            // 1. Contactos CRM
            setStatus('Consultando Contactos y Fichas CRM...');
            const { data: contactos, error: errContactos } = await sb
                .from('contactos')
                .select('*')
                .order('created_at', { ascending: false });
            if (errContactos) console.warn('Error contactos:', errContactos);

            // 2. Movimientos Financieros (Transacciones)
            setStatus('Consultando Movimientos Financieros...');
            const { data: transacciones, error: errTr } = await sb
                .from('transactions')
                .select('*')
                .order('date', { ascending: false });
            if (errTr) console.warn('Error transacciones:', errTr);

            // 3. Catálogo de Productos y Stock
            setStatus('Consultando Catálogo de Productos...');
            const { data: productos, error: errProd } = await sb
                .from('productos')
                .select('*')
                .order('modelo', { ascending: true });
            if (errProd) console.warn('Error productos:', errProd);

            // 4. Historial de Movimientos de Inventario
            setStatus('Consultando Historial de Stock...');
            const { data: inventario, error: errInv } = await sb
                .from('inventory_movements')
                .select('*')
                .order('created_at', { ascending: false });
            if (errInv) console.warn('Error inventario:', errInv);

            // 5. Categorías y Métodos de Pago
            setStatus('Consultando Categorías y Medios de Pago...');
            const { data: categorias } = await sb.from('transaction_categories').select('*');
            const { data: mediosPago } = await sb.from('payment_methods').select('*');

            // 6. Cotizaciones Dólar
            setStatus('Consultando Cotizaciones Dólar...');
            const { data: cotizaciones } = await sb
                .from('cotizacion_dolar')
                .select('*')
                .order('created_at', { ascending: false });

            // 7. Respuestas Rápidas CRM
            setStatus('Consultando Respuestas Rápidas...');
            const { data: quickReplies } = await sb.from('crm_quick_replies').select('*');

            // 8. Mensajes Automáticos, Programados, Embudo
            setStatus('Consultando Automatizaciones y Embudo...');
            const { data: msgAuto } = await sb.from('mensajes_automaticos').select('*');
            const { data: msgProg } = await sb.from('mensajes_programados').select('*');
            const { data: embudo } = await sb.from('embudo_ventas').select('*');
            const { data: botCfg } = await sb.from('bot_config').select('*');

            // 9. Mensajes Recientes (si solicitado)
            let mensajesRecientes = [];
            if (options.incluirMensajesRecientes) {
                setStatus('Consultando últimos 10.000 mensajes de chat...');
                const { data: msgs } = await sb
                    .from('mensajes')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(10000);
                mensajesRecientes = msgs || [];
            }

            // CREAR HOJAS
            setStatus('Compilando hojas de cálculo Excel...');

            // Hoja 1: Resumen y Metadatos
            const resumenAoa = [
                ['ESTILO APPLE SAN JUAN • EXPORTACIÓN Y CIERRE DE BASE DE DATOS'],
                ['Fecha de Generación:', new Date().toLocaleString('es-AR')],
                ['Origen:', 'Extracción en vivo desde Supabase'],
                [],
                ['Hoja', 'Registros', 'Descripción'],
                ['Contactos CRM', (contactos || []).length, 'Base de clientes, leads, intereses y canjes'],
                ['Movimientos Financieros', (transacciones || []).length, 'Flujo de caja, ingresos y egresos'],
                ['Catálogo Productos', (productos || []).length, 'Inventario valorizado de iPhones y accesorios'],
                ['Historial de Stock', (inventario || []).length, 'Trazabilidad de entradas, salidas y ajustes de stock'],
                ['Cotizaciones Dólar', (cotizaciones || []).length, 'Historial de tipo de cambio oficial'],
                ['Categorías Financieras', (categorias || []).length, 'Dimensiones contables'],
                ['Medios de Pago', (mediosPago || []).length, 'Efectivo, Transferencia, USDT, etc.'],
                ['Respuestas Rápidas', (quickReplies || []).length, 'Plantillas de atención comercial'],
                ['Automatizaciones', (msgAuto || []).length + (msgProg || []).length + (embudo || []).length, 'Disparadores y embudo'],
                ['Configuración Bot', (botCfg || []).length, 'WhatsApp e Instagram']
            ];
            if (options.incluirMensajesRecientes) {
                resumenAoa.push(['Mensajes Recientes', mensajesRecientes.length, 'Últimos mensajes de WhatsApp/Instagram']);
            }

            const wsResumen = XLSX.utils.aoa_to_sheet(resumenAoa);
            wsResumen['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 60 }];
            XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

            // Hojas operativas
            if (contactos && contactos.length) {
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(contactos), 'Contactos CRM');
            }
            if (transacciones && transacciones.length) {
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(transacciones), 'Movimientos Financieros');
            }
            if (productos && productos.length) {
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(productos), 'Catálogo Productos');
            }
            if (inventario && inventario.length) {
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(inventario), 'Historial Stock');
            }
            if (cotizaciones && cotizaciones.length) {
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(cotizaciones), 'Cotizaciones Dólar');
            }
            if (categorias && categorias.length) {
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(categorias), 'Categorías');
            }
            if (mediosPago && mediosPago.length) {
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mediosPago), 'Medios de Pago');
            }
            if (quickReplies && quickReplies.length) {
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(quickReplies), 'Respuestas Rápidas');
            }
            if (botCfg && botCfg.length) {
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(botCfg), 'Config Bot');
            }
            if (msgAuto && msgAuto.length) {
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(msgAuto), 'Mensajes Automáticos');
            }
            if (msgProg && msgProg.length) {
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(msgProg), 'Mensajes Programados');
            }
            if (embudo && embudo.length) {
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(embudo), 'Embudo Ventas');
            }
            if (mensajesRecientes && mensajesRecientes.length) {
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mensajesRecientes), 'Mensajes Recientes');
            }

            const fileName = `Estilo_Apple_SJ_Datos_Vivos_${Date.now()}.xlsx`;
            setStatus(`Descargando ${fileName}...`);
            XLSX.writeFile(wb, fileName);
            setStatus(`✅ ¡Descarga completada con éxito! Archivo: ${fileName}`);

            return { success: true, fileName };
        } catch (error) {
            console.error('Error exportando datos vivos:', error);
            setStatus(`❌ Error al generar archivo: ${error.message}`);
            throw error;
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
            backdrop-filter: blur(4px);
            z-index: 99999;
            align-items: center;
            justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        `;

        modal.innerHTML = `
            <div style="background: #FFFFFF; width: 92%; max-width: 640px; border-radius: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.25); overflow: hidden; display: flex; flex-direction: column; animation: modalPop 0.25s ease-out;">
                <!-- Header -->
                <div style="padding: 1.25rem 1.5rem; background: linear-gradient(135deg, #107C41 0%, #0B5A2F 100%); color: #FFFFFF; display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <div style="background: rgba(255,255,255,0.2); width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="12" y1="18" x2="12" y2="12"></line>
                                <polyline points="9 15 12 18 15 15"></polyline>
                            </svg>
                        </div>
                        <div>
                            <h3 style="margin: 0; font-size: 1.1rem; font-weight: 700; letter-spacing: -0.01em;">Descargar Base de Datos Completa (Excel)</h3>
                            <p style="margin: 0; font-size: 0.8rem; opacity: 0.85;">Estilo Apple San Juan • Cierre de Servicio</p>
                        </div>
                    </div>
                    <button id="btnCloseBackupModal" style="background: none; border: none; color: #FFFFFF; font-size: 1.5rem; cursor: pointer; line-height: 1; padding: 0.25rem;">&times;</button>
                </div>

                <!-- Body -->
                <div style="padding: 1.5rem; color: #1D1D1F; max-height: 70vh; overflow-y: auto;">
                    <div style="background: #F5F5F7; border-left: 4px solid #107C41; padding: 0.85rem 1rem; border-radius: 6px; font-size: 0.85rem; margin-bottom: 1.25rem;">
                        <strong>📦 Respaldo Integral del Sistema:</strong> Este archivo Excel contiene la base de datos completa distribuida en <strong>diferentes hojas de cálculo</strong>, organizada exclusivamente para Estilo Apple SJ.
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; font-size: 0.82rem; margin-bottom: 1.25rem;">
                        <div style="background: #FFFFFF; border: 1px solid #E5E5EA; padding: 0.6rem 0.8rem; border-radius: 8px;">
                            <span style="color: #86868B; display: block; font-size: 0.72rem;">CONTACTOS CRM</span>
                            <strong style="font-size: 1.05rem; color: #107C41;">21.291</strong> registros
                        </div>
                        <div style="background: #FFFFFF; border: 1px solid #E5E5EA; padding: 0.6rem 0.8rem; border-radius: 8px;">
                            <span style="color: #86868B; display: block; font-size: 0.72rem;">MOVIMIENTOS FINANCIEROS</span>
                            <strong style="font-size: 1.05rem; color: #107C41;">2.131</strong> transacciones
                        </div>
                        <div style="background: #FFFFFF; border: 1px solid #E5E5EA; padding: 0.6rem 0.8rem; border-radius: 8px;">
                            <span style="color: #86868B; display: block; font-size: 0.72rem;">CATÁLOGO & STOCK</span>
                            <strong style="font-size: 1.05rem; color: #107C41;">195</strong> productos / iPhones
                        </div>
                        <div style="background: #FFFFFF; border: 1px solid #E5E5EA; padding: 0.6rem 0.8rem; border-radius: 8px;">
                            <span style="color: #86868B; display: block; font-size: 0.72rem;">HISTORIAL DE MENSAJES</span>
                            <strong style="font-size: 1.05rem; color: #107C41;">159.263</strong> mensajes WhatsApp/IG
                        </div>
                    </div>

                    <h4 style="margin: 0 0 0.5rem 0; font-size: 0.9rem; color: #1D1D1F;">Opciones de Descarga:</h4>

                    <!-- Botón 1: Descarga Directa del Archivo Maestro Completo -->
                    <div style="border: 1.5px solid #107C41; background: #F0FBF4; border-radius: 12px; padding: 1rem; margin-bottom: 0.85rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
                        <div>
                            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.2rem;">
                                <span style="background: #107C41; color: #FFF; font-size: 0.65rem; font-weight: 700; padding: 0.15rem 0.45rem; border-radius: 4px; text-transform: uppercase;">Completo</span>
                                <div style="font-weight: 700; color: #0B5A2F; font-size: 0.95rem;">
                                    Base de Datos Maestra Total (.xlsx • 93 MB)
                                </div>
                            </div>
                            <div style="font-size: 0.78rem; color: #374151; line-height: 1.35;">
                                Contiene las <strong>16 hojas completas</strong> del sistema, incluyendo los <strong>159.263 chats históricos</strong> de WhatsApp e Instagram, contactos, finanzas y catálogo.
                            </div>
                        </div>
                        <button id="btnDownloadMasterBackup" style="background: #107C41; color: #FFFFFF; border: none; padding: 0.65rem 1.15rem; border-radius: 8px; font-weight: 600; font-size: 0.85rem; cursor: pointer; white-space: nowrap; transition: background 0.2s; box-shadow: 0 2px 6px rgba(16,124,65,0.25);">
                            📥 Descargar Todo (93MB)
                        </button>
                    </div>

                    <!-- Botón 2: Descarga del Expediente Operativo y CRM -->
                    <div style="border: 1px solid #0071E3; background: #F4F8FE; border-radius: 12px; padding: 1rem; margin-bottom: 0.85rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
                        <div>
                            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.2rem;">
                                <span style="background: #0071E3; color: #FFF; font-size: 0.65rem; font-weight: 700; padding: 0.15rem 0.45rem; border-radius: 4px; text-transform: uppercase;">Recomendado Rápido</span>
                                <div style="font-weight: 700; color: #004F9E; font-size: 0.95rem;">
                                    Expediente Operativo & CRM (.xlsx • 8.4 MB)
                                </div>
                            </div>
                            <div style="font-size: 0.78rem; color: #374151; line-height: 1.35;">
                                Contiene <strong>15 hojas</strong>: Contactos (21k), Finanzas (2.1k), Catálogo (195), Stock (250), Cotizaciones, etc. (sin el peso de los 159k chats).
                            </div>
                        </div>
                        <button id="btnDownloadOperacionesBackup" style="background: #0071E3; color: #FFFFFF; border: none; padding: 0.65rem 1.15rem; border-radius: 8px; font-weight: 600; font-size: 0.85rem; cursor: pointer; white-space: nowrap; transition: background 0.2s; box-shadow: 0 2px 6px rgba(0,113,227,0.25);">
                            ⚡ Descargar Ágil (8MB)
                        </button>
                    </div>

                    <!-- Botón 3: Exportar Datos Vivos -->
                    <div style="border: 1px solid #E5E5EA; background: #FFFFFF; border-radius: 12px; padding: 1rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
                        <div>
                            <div style="font-weight: 700; color: #1D1D1F; font-size: 0.95rem; margin-bottom: 0.2rem;">
                                🔄 Extraer Datos Vivos en Directo (.xlsx)
                            </div>
                            <div style="font-size: 0.78rem; color: #86868B;">
                                Consulta y compila en tiempo real las tablas de Supabase en este instante desde el navegador.
                            </div>
                        </div>
                        <button id="btnExportLiveBackup" style="background: #F5F5F7; color: #1D1D1F; border: 1px solid #D2D2D7; padding: 0.6rem 1.1rem; border-radius: 8px; font-weight: 600; font-size: 0.85rem; cursor: pointer; white-space: nowrap; transition: all 0.2s;">
                            Generar en Vivo
                        </button>
                    </div>

                    <!-- Status Bar -->
                    <div id="exportProgressStatus" style="margin-top: 1rem; font-size: 0.8rem; color: #666; text-align: center; min-height: 1.2rem;"></div>
                </div>

                <!-- Footer -->
                <div style="padding: 0.9rem 1.5rem; background: #F5F5F7; border-top: 1px solid #E5E5EA; display: flex; justify-content: flex-end;">
                    <button id="btnCloseBackupModalFooter" style="background: #E5E5EA; border: none; color: #1D1D1F; padding: 0.45rem 1rem; border-radius: 8px; font-size: 0.85rem; font-weight: 500; cursor: pointer;">Cerrar</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Bind events
        document.getElementById('btnCloseBackupModal').onclick = () => this.cerrarModal();
        document.getElementById('btnCloseBackupModalFooter').onclick = () => this.cerrarModal();
        modal.onclick = (e) => {
            if (e.target === modal) this.cerrarModal();
        };

        document.getElementById('btnDownloadMasterBackup').onclick = () => {
            this.descargarArchivoMaestro();
        };

        document.getElementById('btnDownloadOperacionesBackup').onclick = () => {
            this.descargarArchivoOperativo();
        };

        document.getElementById('btnExportLiveBackup').onclick = async () => {
            const btn = document.getElementById('btnExportLiveBackup');
            btn.disabled = true;
            btn.innerText = 'Generando...';
            try {
                await this.exportarDatosVivos();
            } finally {
                btn.disabled = false;
                btn.innerText = 'Generar en Vivo';
            }
        };
    }
}

export const backupExport = new BackupExportService();

if (typeof window !== 'undefined') {
    window.backupExport = backupExport;
    window.descargarBaseDatosExcel = () => backupExport.mostrarModal();
}
