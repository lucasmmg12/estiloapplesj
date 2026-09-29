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
                <button class="growy-chip" data-prompt="Genera un informe ejecutivo del mes en PDF con KPIs de ventas, finanzas y recomendaciones">📊 Informe Mensual PDF</button>
                <button class="growy-chip" data-prompt="¿Qué stock disponible tenemos de iPhone 13 a 15, capacidades, precios y condición?">📱 Stock iPhones</button>
                <button class="growy-chip" data-prompt="Dame un balance financiero de los ingresos y egresos recientes con total en USD y ARS">💰 Balance Financiero</button>
                <button class="growy-chip" data-prompt="Genera un reporte de inventario valorizado en PDF">📦 Reporte Inventario PDF</button>
                <button class="growy-chip" data-prompt="¿Cuál es la cotización del dólar actual en el sistema?">💵 Cotización Dólar</button>
            </div>

            <!-- Chat Body -->
            <div class="growy-body" id="growyMessages">
                <div class="growy-msg assistant">
                    <div class="growy-bubble">
                        Hola, soy <strong>Growy</strong>, tu copiloto inteligente de <strong>Estilo Apple</strong>. 
                        Tengo conexión directa al inventario, ventas, clientes y finanzas. 
                        <br><br>
                        Puedo responder consultas de stock, balance financiero o redactar y <strong>descargar informes ejecutivos en PDF</strong> con la estética oficial del sistema. ¿En qué te ayudo hoy?
                    </div>
                    <span class="growy-msg-time">Ahora</span>
                </div>
            </div>

            <!-- Footer / Input -->
            <footer class="growy-footer">
                <div class="growy-input-wrap">
                    <textarea class="growy-textarea" id="growyInput" placeholder="Pregunta sobre stock, finanzas o pide un informe en PDF..." rows="1"></textarea>
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

        growyAgent.on('onMessage', (msg) => {
            this.ocultarIndicadorTool();
        });
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
            const respuesta = await growyAgent.enviarMensaje(text);
            this.ocultarIndicadorTool();
            this.renderizarMensaje('assistant', respuesta);
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
        if (nombre === 'consultar_inventario') label = '🔍 Consultando stock en inventario...';
        if (nombre === 'consultar_finanzas') label = '💰 Extrayendo transacciones y balance...';
        if (nombre === 'consultar_clientes') label = '👥 Buscando en base de clientes...';
        if (nombre === 'consultar_conversacion_chat') label = '💬 Leyendo historial de chat...';
        if (nombre === 'obtener_cotizacion_dolar') label = '💵 Obteniendo cotización del dólar...';
        if (nombre === 'generar_reporte_pdf') label = '📄 Generando reporte ejecutivo en PDF...';

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

        // Sanitizar entidades básicas
        text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        // Bloques de código
        text = text.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
        // Código inline
        text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Negrita **texto**
        text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // Cursiva *texto*
        text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');

        // Líneas y saltos de párrafo
        const lines = text.split('\n');
        let inList = false;
        let htmlLines = [];

        for (let line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ')) {
                if (!inList) {
                    htmlLines.push('<ul>');
                    inList = true;
                }
                htmlLines.push(`<li>${trimmed.substring(2)}</li>`);
            } else if (/^\d+\.\s/.test(trimmed)) {
                if (!inList) {
                    htmlLines.push('<ol>');
                    inList = true;
                }
                htmlLines.push(`<li>${trimmed.replace(/^\d+\.\s/, '')}</li>`);
            } else {
                if (inList) {
                    htmlLines.push(inList === 'ol' ? '</ol>' : '</ul>');
                    inList = false;
                }
                if (trimmed.length > 0) {
                    htmlLines.push(`<p>${line}</p>`);
                }
            }
        }

        if (inList) {
            htmlLines.push('</ul>');
        }

        return htmlLines.join('');
    }
}

export const growyUI = new GrowyUI();
