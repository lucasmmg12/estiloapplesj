// =========================================================================
// GROW LABS - SISTEMA DE CONTROL DE LICENCIA Y MEMBRESÍA
// Bloqueo de acceso a partir del 01/11/2026
// =========================================================================

(function () {
    'use strict';

    // Fecha de bloqueo: 01 de Noviembre de 2026 a las 00:00:00 (Hora Local)
    const FECHA_CORTE = new Date(2026, 10, 1, 0, 0, 0); // Mes 10 es Noviembre en JS (0-indexado)
    const GROWLABS_URL = 'https://growlabs.lat';

    /**
     * Comprueba si el sistema debe bloquearse
     * Evalúa tanto la hora del cliente como la hora del servidor si está disponible
     */
    async function verificarEstadoLicencia() {
        const ahoraLocal = new Date();

        if (ahoraLocal >= FECHA_CORTE) {
            activarBloqueoSistema();
            return;
        }

        // Validación secundaria contra reloj del servidor (evita atrasar reloj local)
        try {
            const resp = await fetch('https://gyonguqndcsmudqmptfb.supabase.co/rest/v1/', {
                method: 'HEAD',
                cache: 'no-cache'
            });
            const serverDateHeader = resp.headers.get('date');
            if (serverDateHeader) {
                const serverDate = new Date(serverDateHeader);
                if (serverDate >= FECHA_CORTE) {
                    activarBloqueoSistema();
                    return;
                }
            }
        } catch (e) {
            // Silencioso en caso de offline
        }
    }

    /**
     * Renderiza el cartel de bloqueo bloqueando toda interacción
     */
    function activarBloqueoSistema() {
        // Prevenir duplicados
        if (document.getElementById('growlabs-license-lockout-overlay')) {
            return;
        }

        // Detener scroll de la página
        try {
            document.documentElement.style.overflow = 'hidden';
            document.body.style.overflow = 'hidden';
        } catch (e) {}

        const overlay = document.createElement('div');
        overlay.id = 'growlabs-license-lockout-overlay';
        overlay.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            background: rgba(15, 23, 42, 0.88) !important;
            backdrop-filter: blur(12px) !important;
            -webkit-backdrop-filter: blur(12px) !important;
            z-index: 2147483647 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            padding: 1.5rem !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
            box-sizing: border-box !important;
            user-select: none !important;
        `;

        overlay.innerHTML = `
            <style>
                @keyframes lockPopIn {
                    0% { opacity: 0; transform: scale(0.92); }
                    100% { opacity: 1; transform: scale(1); }
                }
                .gl-btn-primary:hover {
                    background: #1D4ED8 !important;
                    transform: translateY(-1px);
                    box-shadow: 0 10px 20px -5px rgba(37, 99, 235, 0.4) !important;
                }
                .gl-btn-secondary:hover {
                    background: #F1F5F9 !important;
                    border-color: #CBD5E1 !important;
                }
            </style>
            <div style="background: #FFFFFF; width: 100%; max-width: 540px; border-radius: 20px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.45); border: 1px solid rgba(226, 232, 240, 0.9); overflow: hidden; animation: lockPopIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); display: flex; flex-direction: column; text-align: center;">
                
                <!-- Encabezado de Advertencia / Suspensión -->
                <div style="background: linear-gradient(135deg, #DC2626 0%, #991B1B 100%); padding: 2rem 2rem 1.75rem 2rem; color: #FFFFFF; display: flex; flex-direction: column; align-items: center;">
                    <div style="width: 64px; height: 64px; background: rgba(255, 255, 255, 0.18); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 1rem; border: 2px solid rgba(255, 255, 255, 0.35);">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                    </div>
                    <span style="background: rgba(0, 0, 0, 0.25); font-size: 0.72rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 0.25rem 0.75rem; border-radius: 9999px; margin-bottom: 0.5rem;">
                        Aviso de Suspensión de Servicio
                    </span>
                    <h2 style="margin: 0; font-size: 1.45rem; font-weight: 800; letter-spacing: -0.02em;">
                        Sistema Bloqueado
                    </h2>
                    <p style="margin: 0.35rem 0 0 0; font-size: 0.88rem; opacity: 0.92; font-weight: 400;">
                        Vencimiento de membresía operativa: 01/11/2026
                    </p>
                </div>

                <!-- Cuerpo del Cartel -->
                <div style="padding: 2rem 2rem 1.75rem 2rem; color: #1E293B;">
                    <div style="background: #FEF2F2; border-left: 4px solid #DC2626; border-radius: 8px; padding: 1rem 1.15rem; margin-bottom: 1.5rem; text-align: left;">
                        <p style="margin: 0; font-size: 0.95rem; line-height: 1.5; color: #991B1B; font-weight: 600;">
                            Para continuar con el servicio debe abonar su membresía. Para eso debe comunicarse con <a href="${GROWLABS_URL}" target="_blank" rel="noopener noreferrer" style="color: #991B1B; text-decoration: underline; font-weight: 800;">growlabs.lat</a>
                        </p>
                    </div>

                    <p style="margin: 0 0 1.75rem 0; font-size: 0.88rem; line-height: 1.55; color: #64748B;">
                        El acceso al CRM, WhatsApp, métricas financieras y panel administrativo se encuentra temporalmente inhabilitado hasta la regularización de la cuenta por parte del administrador.
                    </p>

                    <!-- Acciones -->
                    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                        <a href="${GROWLABS_URL}" target="_blank" rel="noopener noreferrer" class="gl-btn-primary" style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; background: #2563EB; color: #FFFFFF; text-decoration: none; padding: 0.85rem 1.5rem; border-radius: 12px; font-weight: 700; font-size: 0.95rem; transition: all 0.2s; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="2" y1="12" x2="22" y2="12"></line>
                                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                            </svg>
                            Contactar con growlabs.lat
                        </a>

                        <button id="btnLockDownloadBackup" class="gl-btn-secondary" style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; background: #FFFFFF; color: #0F172A; border: 1.5px solid #E2E8F0; padding: 0.75rem 1.5rem; border-radius: 12px; font-weight: 600; font-size: 0.88rem; cursor: pointer; transition: all 0.2s;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            Descargar Respaldo de Mis Datos (Excel .xlsx)
                        </button>
                    </div>
                </div>

                <!-- Footer institucional -->
                <div style="background: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 0.85rem 1.5rem; font-size: 0.75rem; color: #94A3B8; display: flex; justify-content: space-between; align-items: center;">
                    <span>Grow Labs • Software Architecture</span>
                    <span style="font-weight: 600; color: #64748B;">Estilo Apple SJ</span>
                </div>
            </div>
        `;

        // Inserción en el DOM
        if (document.body) {
            document.body.appendChild(overlay);
        } else {
            document.addEventListener('DOMContentLoaded', () => document.body.appendChild(overlay));
        }

        // Asignar descarga de backup ético
        setTimeout(() => {
            const btnBackup = document.getElementById('btnLockDownloadBackup');
            if (btnBackup) {
                btnBackup.onclick = () => {
                    if (window.backupExport) {
                        window.backupExport.mostrarModal();
                    } else if (window.descargarBaseDatosExcel) {
                        window.descargarBaseDatosExcel();
                    } else {
                        window.location.href = './Estilo_Apple_SJ_Operaciones_CRM_Finanzas.xlsx';
                    }
                };
            }
        }, 100);

        // Bloqueo total de teclas de escape o atajos
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' || (e.ctrlKey && e.key.toLowerCase() === 'k')) {
                e.preventDefault();
                e.stopPropagation();
            }
        }, true);
    }

    // Ejecutar verificación de inmediato y al cargar el DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', verificarEstadoLicencia);
    } else {
        verificarEstadoLicencia();
    }

    // Verificación periódica cada 60 segundos
    setInterval(verificarEstadoLicencia, 60000);

    // Exportar a window para pruebas o auditoría
    window.__verificarLicenciaGrowLabs = verificarEstadoLicencia;
    window.__activarBloqueoPrueba = activarBloqueoSistema;
})();
