// ============================================
// SERVICIO: Interfaz de Usuario de Growy (UI Controller)
// ============================================

import { growyAgent } from './growy-agent.js';

export class GrowyUI {
    constructor() {
        this.isOpen = false;
        this.initialized = false;
        this.pendingTool = null;
        this.lastGeneratedPDF = null;
        this.pendingReports = [];
    }

    init() {
        if (this.initialized) return;
        this.initialized = true;

        this.injectHTML();
        this.bindEvents();
        this.setupAgentListeners();
    }

    injectHTML() {
        // 1. Inyectar Botón Flotante (FAB)
        const fab = document.createElement('button');
        fab.className = 'growy-fab';
        fab.id = 'growyFab';
        fab.title = 'Abrir Growy AI Copilot (Ctrl + G)';
        fab.innerHTML = `
            <div class="growy-avatar-wrap">
                <img src="/logogrow.webp" alt="Growy" class="growy-avatar-img" onerror="this.src='/logogrow.png'">
                <span class="growy-status-dot"></span>
            </div>
            <span>Growy IA</span>
            <span class="growy-fab-badge">Ctrl+G</span>
        `;
        document.body.appendChild(fab);

        // 2. Inyectar Overlay y Drawer
        const overlay = document.createElement('div');
        overlay.className = 'growy-drawer-overlay';
        overlay.id = 'growyOverlay';

        const drawer = document.createElement('aside');
        drawer.className = 'growy-drawer';
        drawer.id = 'growyDrawer';
        drawer.innerHTML = `
            <!-- Header -->
            <header class="growy-header">
                <div class="growy-header-info">
                    <div class="growy-header-avatar">
                        <img src="/logogrow.webp" alt="Growy" onerror="this.src='/logogrow.png'">
                    </div>
                    <div class="growy-header-text">
                        <h3>Growy <span>AI Copilot</span></h3>
                        <p><span class="dot-live"></span> Conectado a ERP & BD • Estilo Apple</p>
                    </div>
                </div>
                <div class="growy-header-actions">
                    <button class="growy-btn-icon" id="growyClearBtn" title="Limpiar conversación">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                    <button class="growy-btn-icon" id="growyCloseBtn" title="Cerrar panel">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </header>

            <!-- Quick Prompts Bar -->
            <div class="growy-quick-bar">
                <button class="growy-chip" data-prompt="Dame un balance financiero completo de los ingresos y egresos registrados, con total en USD y ARS y desglose por categorías">💰 Balance Ingresos vs Egresos</button>
                <button class="growy-chip" data-prompt="Genera y descarga un reporte completo de finanzas en Excel (.xlsx) con KPIs y transacciones de ingresos y egresos">📥 Descargar Excel Finanzas</button>
                <button class="growy-chip" data-prompt="Genera un informe ejecutivo formal del mes en PDF con KPIs de ventas, finanzas y recomendaciones">📑 Informe Mensual PDF</button>
                <button class="growy-chip" data-prompt="¿Cuál es el valor total del inventario disponible en USD (costo vs venta) y qué modelos tenemos en stock?">📦 Stock Valorizado</button>
                <button class="growy-chip" data-prompt="¿Cuál es la cotización del dólar actual en el sistema?">💵 Cotización Dólar</button>
            </div>

            <!-- Chat Body -->
            <div class="growy-body" id="growyMessages">
                <div class="growy-msg assistant">
                    <div class="growy-bubble">
                        Hola, soy <strong>Growy</strong>, tu copiloto inteligente de <strong>Estilo Apple</strong>. 
                        Tengo acceso en tiempo real a toda la base de datos viva: <strong>ingresos, egresos, transacciones, inventario valorizado, clientes y proveedores</strong>. 
                        <br><br>
                        Puedo responder consultas analíticas, auditar balances en USD y ARS, y redactar o <strong>descargar informes y reportes tanto en PDF ejecutivo como en planillas Excel (.xlsx)</strong> con la estética oficial del sistema. ¿En qué te ayudo hoy?
                    </div>
                    <span class="growy-msg-time">Ahora</span>
                </div>
            </div>

            <!-- Footer / Input -->
            <footer class="growy-footer">
                <div class="growy-input-wrap">
                    <textarea class="growy-textarea" id="growyInput" placeholder="Pregunta sobre ingresos, egresos, stock o pide un reporte en PDF / Excel..." rows="1"></textarea>
                    <button class="growy-send-btn" id="growySendBtn" title="Enviar mensaje">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <line x1="12" y1="19" x2="12" y2="5"></line>
                            <polyline points="5 12 12 5 19 12"></polyline>
                        </svg>
                    </button>
                </div>
                <div class="growy-footer-caption">Potenciado por OpenAI • Presiona Enter para enviar</div>
            </footer>
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(drawer);
    }

    bindEvents() {
        const fab = document.getElementById('growyFab');
        const overlay = document.getElementById('growyOverlay');
        const closeBtn = document.getElementById('growyCloseBtn');
        const clearBtn = document.getElementById('growyClearBtn');
        const sendBtn = document.getElementById('growySendBtn');
        const input = document.getElementById('growyInput');
        const quickChips = document.querySelectorAll('.growy-chip');

        fab.addEventListener('click', () => this.toggle());
        overlay.addEventListener('click', () => this.close());
        closeBtn.addEventListener('click', () => this.close());

        clearBtn.addEventListener('click', () => {
            if (confirm('¿Deseas reiniciar la conversación con Growy?')) {
                growyAgent.limpiarConversacion();
                const container = document.getElementById('growyMessages');
                container.innerHTML = `
                    <div class="growy-msg assistant">
                        <div class="growy-bubble">
                            Conversación reiniciada. ¿Qué información o reporte necesitas generar?
                        </div>
                        <span class="growy-msg-time">Ahora</span>
                    </div>
                `;
            }
        });

        // Quick prompts
        quickChips.forEach(chip => {
            chip.addEventListener('click', () => {
                const prompt = chip.getAttribute('data-prompt');
                if (prompt) {
                    this.enviarPrompt(prompt);
                }
            });
        });

        // Send message
        sendBtn.addEventListener('click', () => this.manejarEnvio());

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.manejarEnvio();
            }
        });

        // Auto-resize textarea
        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 100) + 'px';
        });

        // Atajo global Ctrl+G o Cmd+G
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
                e.preventDefault();
                this.toggle();
            }
        });
    }

    setupAgentListeners() {
        growyAgent.on('onToolCall', (data) => {
            this.mostrarIndicadorTool(data.nombre, data.args);
        });

        growyAgent.on('onReportGenerated', (report) => {
            this.pendingReports.push(report);
            this.renderizarReportCard(report);
        });

        growyAgent.on('onMessage', () => {
            this.ocultarIndicadorTool();
        });
    }

    renderizarReportCard(report) {
        const container = document.getElementById('growyMessages');
        if (!container) return;

        const card = document.createElement('div');
        if (report.tipo === 'EXCEL') {
            card.className = 'growy-excel-card';
            card.innerHTML = `
                <div class="growy-excel-info">
                    <div class="growy-excel-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="8" y1="13" x2="16" y2="13"></line>
                            <line x1="8" y1="17" x2="16" y2="17"></line>
                            <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                    </div>
                    <div>
                        <div class="growy-excel-title">${report.titulo || 'Planilla de Cálculo Excel (.xlsx)'}</div>
                        <div class="growy-excel-sub">${report.filename} • ${report.totalFilas || 0} registros • ${report.totalHojas || 1} hoja(s)</div>
                    </div>
                </div>
                ${report.blobUrl ? `
                <a href="${report.blobUrl}" download="${report.filename}" class="growy-excel-download-btn" title="Descargar archivo Excel">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Descargar
                </a>` : `<span class="growy-excel-download-btn">✓ Descargado</span>`}
            `;
        } else {
            card.className = 'growy-pdf-card';
            card.innerHTML = `
                <div class="growy-pdf-info">
                    <div class="growy-pdf-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                    </div>
                    <div>
                        <div class="growy-pdf-title">${report.titulo || 'Informe Ejecutivo en PDF'}</div>
                        <div class="growy-pdf-sub">${report.filename} • ${report.totalPaginas || 1} página(s)</div>
                    </div>
                </div>
                ${report.blobUrl ? `
                <a href="${report.blobUrl}" download="${report.filename}" class="growy-pdf-download-btn" title="Descargar archivo PDF">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Descargar
                </a>` : `<span class="growy-pdf-download-btn">✓ Descargado</span>`}
            `;
        }

        container.appendChild(card);
        this.scrollToBottom();
    }

    toggle() {
        if (this.isOpen) this.close();
        else this.open();
    }

    open() {
        this.isOpen = true;
        document.getElementById('growyDrawer')?.classList.add('active');
        document.getElementById('growyOverlay')?.classList.add('active');
        setTimeout(() => {
            document.getElementById('growyInput')?.focus();
        }, 150);
    }

    close() {
        this.isOpen = false;
        document.getElementById('growyDrawer')?.classList.remove('active');
        document.getElementById('growyOverlay')?.classList.remove('active');
    }

    async manejarEnvio() {
        const input = document.getElementById('growyInput');
        const text = input.value.trim();
        if (!text) return;

        input.value = '';
        input.style.height = 'auto';
        await this.enviarPrompt(text);
    }

    async enviarPrompt(text) {
        if (!this.isOpen) this.open();

        // 1. Renderizar mensaje del usuario
        this.renderizarMensaje('user', text);

        // 2. Deshabilitar input durante procesamiento
        const sendBtn = document.getElementById('growySendBtn');
        const input = document.getElementById('growyInput');
        sendBtn.disabled = true;
        input.disabled = true;

        // 3. Indicador de "pensando"
        this.mostrarIndicadorTool('pensando');

        try {
            this.pendingReports = [];
            const respuesta = await growyAgent.enviarMensaje(text);
            this.ocultarIndicadorTool();
            this.renderizarMensaje('assistant', respuesta);
            this.pendingReports = [];
        } catch (err) {
            this.ocultarIndicadorTool();
            this.renderizarMensaje('assistant', `⚠️ **Error:** ${err.message || 'No se pudo conectar con el agente de IA.'}`);
        } finally {
            sendBtn.disabled = false;
            input.disabled = false;
            input.focus();
        }
    }

    mostrarIndicadorTool(nombre, args) {
        this.ocultarIndicadorTool();
        const container = document.getElementById('growyMessages');
        if (!container) return;

        let label = 'Growy está analizando...';
        if (nombre === 'consultar_metricas_globales') label = '📈 Obteniendo métricas globales y snapshot del ERP...';
        if (nombre === 'consultar_inventario') label = '🔍 Consultando stock valorizado en inventario...';
        if (nombre === 'consultar_finanzas') label = '💰 Extrayendo transacciones de ingresos, egresos y balance...';
        if (nombre === 'consultar_movimientos_inventario') label = '📦 Revisando movimientos de stock...';
        if (nombre === 'consultar_proveedores') label = '🏭 Consultando directorio de proveedores...';
        if (nombre === 'consultar_clientes') label = '👥 Buscando en base de clientes...';
        if (nombre === 'consultar_conversacion_chat') label = '💬 Leyendo historial de chat...';
        if (nombre === 'obtener_cotizacion_dolar') label = '💵 Obteniendo cotización del dólar...';
        if (nombre === 'generar_reporte_pdf') label = '📄 Compilando informe ejecutivo en PDF...';
        if (nombre === 'generar_reporte_excel') label = '📊 Compilando planilla de cálculo en Excel (.xlsx)...';

        const el = document.createElement('div');
        el.className = 'growy-tool-indicator';
        el.id = 'growyActiveToolIndicator';
        el.innerHTML = `
            <div class="growy-spinner"></div>
            <span>${label}</span>
        `;
        container.appendChild(el);
        this.scrollToBottom();
    }

    ocultarIndicadorTool() {
        const el = document.getElementById('growyActiveToolIndicator');
        if (el) el.remove();
    }

    renderizarMensaje(role, content) {
        const container = document.getElementById('growyMessages');
        if (!container) return;

        const msgEl = document.createElement('div');
        msgEl.className = `growy-msg ${role}`;

        const hora = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
        const formattedText = this.formatearMarkdown(content);

        msgEl.innerHTML = `
            <div class="growy-bubble">${formattedText}</div>
            <span class="growy-msg-time">${hora}</span>
        `;

        container.appendChild(msgEl);
        this.scrollToBottom();
    }

    scrollToBottom() {
        const container = document.getElementById('growyMessages');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }

    formatearMarkdown(raw) {
        if (!raw) return '';
        let text = raw;

        // 1. Limpiar enlaces sandbox alucinados por OpenAI
        text = text.replace(/\[([^\]]+)\]\(sandbox:[^\)]+\)/g, '<strong>$1</strong>');

        // 2. Bloques de código con escape de HTML
        text = text.replace(/```([\s\S]*?)```/g, (match, code) => {
            const safeCode = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return `<pre class="growy-pre"><code>${safeCode}</code></pre>`;
        });

        // 3. Código inline
        text = text.replace(/`([^`]+)`/g, (match, code) => {
            const safeCode = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return `<code>${safeCode}</code>`;
        });

        // 4. Negritas e itálicas
        text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');

        // 5. Enlaces externos válidos (https o http)
        text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="growy-link">$1</a>');

        const lines = text.split('\n');
        const htmlParts = [];
        let i = 0;

        while (i < lines.length) {
            const line = lines[i];
            const trimmed = line.trim();

            if (!trimmed) {
                i++;
                continue;
            }

            // Ya fue transformado en bloque pre
            if (trimmed.startsWith('<pre') || trimmed.endsWith('</pre>')) {
                htmlParts.push(trimmed);
                i++;
                continue;
            }

            // Encabezados Markdown
            if (trimmed.startsWith('#### ')) {
                htmlParts.push(`<h4 class="growy-h4">${trimmed.slice(5)}</h4>`);
                i++;
                continue;
            }
            if (trimmed.startsWith('### ')) {
                htmlParts.push(`<h4 class="growy-h4">${trimmed.slice(4)}</h4>`);
                i++;
                continue;
            }
            if (trimmed.startsWith('## ')) {
                htmlParts.push(`<h3 class="growy-h3">${trimmed.slice(3)}</h3>`);
                i++;
                continue;
            }
            if (trimmed.startsWith('# ')) {
                htmlParts.push(`<h2 class="growy-h2">${trimmed.slice(2)}</h2>`);
                i++;
                continue;
            }

            // Separador horizontal
            if (/^(\-{3,}|\*{3,})$/.test(trimmed)) {
                htmlParts.push('<hr class="growy-hr">');
                i++;
                continue;
            }

            // Tablas Markdown
            if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
                const tableLines = [];
                while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
                    tableLines.push(lines[i].trim());
                    i++;
                }

                if (tableLines.length >= 2) {
                    const parseRow = (r) => r.slice(1, -1).split('|').map(c => c.trim());
                    const headers = parseRow(tableLines[0]);
                    let startIdx = 1;
                    if (tableLines[1].replace(/[\s\-\|:]/g, '') === '') {
                        startIdx = 2;
                    }

                    let tableHtml = '<div class="growy-table-wrap"><table class="growy-table"><thead><tr>';
                    headers.forEach(h => { tableHtml += `<th>${h}</th>`; });
                    tableHtml += '</tr></thead><tbody>';

                    for (let r = startIdx; r < tableLines.length; r++) {
                        const cells = parseRow(tableLines[r]);
                        tableHtml += '<tr>';
                        cells.forEach(c => { tableHtml += `<td>${c}</td>`; });
                        tableHtml += '</tr>';
                    }
                    tableHtml += '</tbody></table></div>';
                    htmlParts.push(tableHtml);
                    continue;
                }
            }

            // Listas desordenadas
            if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ')) {
                let listHtml = '<ul class="growy-ul">';
                while (i < lines.length && (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('• ') || lines[i].trim().startsWith('* '))) {
                    const itemText = lines[i].trim().replace(/^[\-\•\*]\s+/, '');
                    listHtml += `<li>${itemText}</li>`;
                    i++;
                }
                listHtml += '</ul>';
                htmlParts.push(listHtml);
                continue;
            }

            // Listas ordenadas
            if (/^\d+\.\s/.test(trimmed)) {
                let listHtml = '<ol class="growy-ol">';
                while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
                    const itemText = lines[i].trim().replace(/^\d+\.\s+/, '');
                    listHtml += `<li>${itemText}</li>`;
                    i++;
                }
                listHtml += '</ol>';
                htmlParts.push(listHtml);
                continue;
            }

            // Párrafo de texto normal
            htmlParts.push(`<p>${trimmed}</p>`);
            i++;
        }

        return htmlParts.join('');
    }
}

export const growyUI = new GrowyUI();
