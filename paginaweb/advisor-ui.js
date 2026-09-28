// ============================================
// UI DEL ASESOR ONLINE (Landing Page)
// ============================================

import { asesorOnlineIA } from './advisor-ai.js';

export class AdvisorUI {
    constructor() {
        this.isOpen = false;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        this.initialized = true;

        this.injectHTML();
        this.bindEvents();
    }

    injectHTML() {
        const modal = document.createElement('div');
        modal.id = 'advisorModal';
        modal.className = 'advisor-modal-wrap';
        modal.innerHTML = `
            <div class="advisor-backdrop" id="advisorBackdrop"></div>
            <div class="advisor-window" id="advisorWindow">
                <!-- Header -->
                <header class="advisor-header">
                    <div class="advisor-header-brand">
                        <div class="advisor-avatar">
                            <img src="/avatar-asesor.png" alt="Asesor Online" class="advisor-header-avatar-img">
                            <span class="advisor-live-dot"></span>
                        </div>
                        <div>
                            <div class="advisor-name">Asesor Online</div>
                            <div class="advisor-sub"><span class="advisor-dot"></span> Estilo Apple • San Juan</div>
                        </div>
                    </div>
                    <div class="advisor-header-tools">
                        <button class="advisor-icon-btn" id="advisorResetBtn" title="Reiniciar conversación">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                                <path d="M3 3v5h5"></path>
                            </svg>
                        </button>
                        <button class="advisor-icon-btn" id="advisorCloseBtn" title="Cerrar">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                </header>

                <!-- Quick Prompts Chips -->
                <div class="advisor-chips-bar" id="advisorChipsBar">
                    <button class="advisor-chip" data-text="¡Hola! Quiero ver el catálogo y consultar por stock">📱 Catálogo & Stock</button>
                    <button class="advisor-chip" data-text="Hola, quiero consultar por el Plan Canje">🔄 Plan Canje</button>
                    <button class="advisor-chip" data-text="Hola, necesito cambiar la batería o pantalla de mi iPhone">🛠️ Reparaciones</button>
                    <button class="advisor-chip" data-text="¿Dónde queda el local y en qué horarios están?">📍 Ubicación & Horarios</button>
                    <button class="advisor-chip" data-text="asesor">👤 Hablar con un Asesor</button>
                </div>

                <!-- Messages Stream -->
                <div class="advisor-messages" id="advisorMessages">
                    <div class="advisor-msg bot">
                        <div class="advisor-bubble">
                            ¡Hola! 👋 Qué lindo que nos escribas a Estilo Apple. ¿Cómo es tu nombre y en qué te puedo ayudar hoy con tu iPhone?
                        </div>
                        <span class="advisor-time">Ahora</span>
                    </div>
                </div>

                <!-- Handover Action Banner (Hidden until 'asesor' is triggered) -->
                <div class="advisor-handover-banner" id="advisorHandoverBanner" style="display: none;">
                    <a href="https://api.whatsapp.com/send/?phone=5492643229503&text=Hola!%20Vengo%20del%20Asesor%20Online%20de%20la%20p%C3%A1gina%20y%20quiero%20continuar%20mi%20consulta&type=phone_number&app_absent=0"
                       target="_blank" 
                       class="advisor-btn-wa">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2z"/>
                        </svg>
                        <span>Continuar por WhatsApp Oficial (264 322-9503)</span>
                    </a>
                </div>

                <!-- Input Field -->
                <footer class="advisor-footer" id="advisorFooter">
                    <div class="advisor-input-box">
                        <input type="text" id="advisorInput" placeholder="Escribí tu consulta..." autocomplete="off">
                        <button id="advisorSendBtn" class="advisor-send-btn" title="Enviar">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                <line x1="12" y1="19" x2="12" y2="5"></line>
                                <polyline points="5 12 12 5 19 12"></polyline>
                            </svg>
                        </button>
                    </div>
                    <div class="advisor-footer-note">Estilo Apple San Juan • Respuestas en vivo</div>
                </footer>
            </div>
        `;

        document.body.appendChild(modal);
    }

    bindEvents() {
        const backdrop = document.getElementById('advisorBackdrop');
        const closeBtn = document.getElementById('advisorCloseBtn');
        const resetBtn = document.getElementById('advisorResetBtn');
        const sendBtn = document.getElementById('advisorSendBtn');
        const input = document.getElementById('advisorInput');
        const chips = document.querySelectorAll('.advisor-chip');

        backdrop?.addEventListener('click', () => this.close());
        closeBtn?.addEventListener('click', () => this.close());

        resetBtn?.addEventListener('click', () => {
            asesorOnlineIA.reiniciar();
            const container = document.getElementById('advisorMessages');
            container.innerHTML = `
                <div class="advisor-msg bot">
                    <div class="advisor-bubble">
                        ¡Hola de nuevo! 👋 ¿Cómo es tu nombre y en qué te puedo ayudar hoy?
                    </div>
                    <span class="advisor-time">Ahora</span>
                </div>
            `;
            document.getElementById('advisorHandoverBanner').style.display = 'none';
            document.getElementById('advisorInput').disabled = false;
            document.getElementById('advisorSendBtn').disabled = false;
            document.getElementById('advisorChipsBar').style.display = 'flex';
        });

        // Chips
        chips.forEach(chip => {
            chip.addEventListener('click', () => {
                const text = chip.getAttribute('data-text');
                if (text) this.enviar(text);
            });
        });

        sendBtn?.addEventListener('click', () => this.manejarEnvio());
        input?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.manejarEnvio();
            }
        });

        // Trigger buttons on the landing page
        document.querySelectorAll('.btn-nav-whatsapp, [data-open-advisor], .floating-whatsapp-bubble').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.open();
            });
        });
    }

    open() {
        this.isOpen = true;
        document.getElementById('advisorModal')?.classList.add('active');
        document.body.style.overflow = 'hidden';
        setTimeout(() => {
            document.getElementById('advisorInput')?.focus();
            this.scrollToBottom();
        }, 200);
    }

    close() {
        this.isOpen = false;
        document.getElementById('advisorModal')?.classList.remove('active');
        document.body.style.overflow = '';
    }

    async manejarEnvio() {
        const input = document.getElementById('advisorInput');
        const text = input.value.trim();
        if (!text) return;
        input.value = '';
        await this.enviar(text);
    }

    async enviar(texto) {
        if (!this.isOpen) this.open();

        // 1. Renderizar mensaje del usuario
        this.renderizarMensaje('user', texto);

        const input = document.getElementById('advisorInput');
        const sendBtn = document.getElementById('advisorSendBtn');
        input.disabled = true;
        sendBtn.disabled = true;

        // 2. Indicador escribiendo...
        this.mostrarEscribiendo();

        // 3. Obtener respuesta del agente
        const resultado = await asesorOnlineIA.enviarMensaje(texto);

        this.ocultarEscribiendo();
        this.renderizarMensaje('bot', resultado.texto);

        // Si se activó el modo asesor, bloquear y mostrar botón de derivación
        if (resultado.bloqueado) {
            document.getElementById('advisorHandoverBanner').style.display = 'block';
            document.getElementById('advisorChipsBar').style.display = 'none';
            input.disabled = true;
            input.placeholder = "Consulta derivada a un asesor...";
            sendBtn.disabled = true;
        } else {
            input.disabled = false;
            sendBtn.disabled = false;
            input.focus();
        }
    }

    mostrarEscribiendo() {
        const container = document.getElementById('advisorMessages');
        if (!container) return;
        const el = document.createElement('div');
        el.className = 'advisor-typing-pill';
        el.id = 'advisorTyping';
        el.innerHTML = `
            <span></span>
            <span></span>
            <span></span>
        `;
        container.appendChild(el);
        this.scrollToBottom();
    }

    ocultarEscribiendo() {
        const el = document.getElementById('advisorTyping');
        if (el) el.remove();
    }

    renderizarMensaje(role, texto) {
        const container = document.getElementById('advisorMessages');
        if (!container) return;

        const msgEl = document.createElement('div');
        msgEl.className = `advisor-msg ${role}`;

        const hora = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
        const textFormatted = this.formatearTexto(texto);

        msgEl.innerHTML = `
            <div class="advisor-bubble">${textFormatted}</div>
            <span class="advisor-time">${hora}</span>
        `;

        container.appendChild(msgEl);
        this.scrollToBottom();
    }

    scrollToBottom() {
        const container = document.getElementById('advisorMessages');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }

    formatearTexto(raw) {
        if (!raw) return '';
        // Convierte URLs en links clicables seguros
        const urlPattern = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;
        let formatted = raw.replace(urlPattern, '<a href="$1" target="_blank" rel="noopener noreferrer" class="advisor-link">$1</a>');
        // Saltos de línea
        formatted = formatted.replace(/\n/g, '<br>');
        return formatted;
    }
}

export const advisorUI = new AdvisorUI();
