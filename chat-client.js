/**
 * chat-client.js
 * Consola Operativa de Contact Center y CRM para Estilo Apple SJ
 * 
 * Basado en la arquitectura de Sistema ADM-QUI (Sanatorio Argentino / Grow Labs)
 * Adaptado 100% para Estilo Apple SJ (Venta, Plan Canje, Cotizaciones y Servicio Técnico)
 */

import {
    fetchCrmConversations,
    fetchChatMessages,
    sendCrmMessage,
    assignSellerToChat,
    unassignSellerFromChat,
    transferChat,
    closeConversationWithReason,
    reopenConversation,
    saveCustomerCard,
    fetchQuickReplies,
    subscribeToCrmRealtime,
    playCrmChime,
    SELLERS,
    RESOLUTION_REASONS,
    DEFAULT_TAGS
} from './services/crm-service.js';
import { fetchMonthlyMetrics, COST_PER_SENT_MESSAGE_USD } from './services/metrics-service.js';

// ============================================================================
// 1. ESTADO GLOBAL DE LA CONSOLA
// ============================================================================

let activeSeller = localStorage.getItem('estilo_crm_active_seller') || 'Nahuel';
let activeTab = 'sin_asignar'; // 'sin_asignar' | 'mis_chats' | 'todos' | 'cerrados'
let activeChannel = 'all';     // 'all' | 'whatsapp' | 'instagram'
let searchQuery = '';
let activeChatPhone = null;
let activeContact = null;
let isPrivateNoteMode = false;
let isSoundEnabled = localStorage.getItem('estilo_crm_sound') !== 'false';

// Mapa de conversaciones indexado por teléfono: phone -> convObject
const conversationsMap = new Map();

// Catálogo de respuestas rápidas cargadas desde Supabase
let quickRepliesCatalog = [];

// ============================================================================
// 2. REFERENCIAS AL DOM
// ============================================================================

// Header & Operador
const activeSellerSelect = document.getElementById('activeSellerSelect');
const operatorAvatarBadge = document.getElementById('operatorAvatarBadge');
const chimeToggleBtn = document.getElementById('chimeToggleBtn');
const refreshBtn = document.getElementById('refreshBtn');

// Buscador & Filtros
const crmSearchInput = document.getElementById('crmSearchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const crmTabsBar = document.getElementById('crmTabsBar');
const crmContactsList = document.getElementById('crmContactsList');
const countSinAsignarEl = document.getElementById('countSinAsignar');
const countMisChatsEl = document.getElementById('countMisChats');
const countTodosEl = document.getElementById('countTodos');
const countCerradosEl = document.getElementById('countCerrados');

// Área de Chat
const crmEmptyState = document.getElementById('crmEmptyState');
const crmActiveChat = document.getElementById('crmActiveChat');
const crmMessagesContainer = document.getElementById('crmMessagesContainer');
const mobileBackBtn = document.getElementById('mobileBackBtn');
const activeChatAvatar = document.getElementById('activeChatAvatar');
const activeChatName = document.getElementById('activeChatName');
const activeChatPhoneEl = document.getElementById('activeChatPhone');
const activeChatSellerChip = document.getElementById('activeChatSellerChip');
const activeChatSellerText = document.getElementById('activeChatSellerText');
const activeChatStatusBadge = document.getElementById('activeChatStatusBadge');
const activeChatDeviceBadge = document.getElementById('activeChatDeviceBadge');

// Botones de Acción de Cabecera
const btnClaimChat = document.getElementById('btnClaimChat');
const btnTransferChat = document.getElementById('btnTransferChat');
const btnCloseChat = document.getElementById('btnCloseChat');
const btnCloseChatLabel = document.getElementById('btnCloseChatLabel');
const btnToggleCrmCard = document.getElementById('btnToggleCrmCard');

// Entrada de Mensajes
const messageTextInput = document.getElementById('messageTextInput');
const btnSendMessage = document.getElementById('btnSendMessage');
const btnTogglePrivateNote = document.getElementById('btnTogglePrivateNote');
const privateNoteToggleLabel = document.getElementById('privateNoteToggleLabel');
const privateNoteBanner = document.getElementById('privateNoteBanner');
const textareaWrapper = document.querySelector('.textarea-wrapper');
const btnQuickRepliesTrigger = document.getElementById('btnQuickRepliesTrigger');
const quickRepliesFlyout = document.getElementById('quickRepliesFlyout');
const quickRepliesList = document.getElementById('quickRepliesList');
const btnAttachMedia = document.getElementById('btnAttachMedia');
const mediaFileInput = document.getElementById('mediaFileInput');
const emojiBtn = document.getElementById('emojiBtn');
const emojiPickerContainer = document.getElementById('emojiPickerContainer');
const emojiPicker = document.querySelector('emoji-picker');

// Ficha Comercial (Sidebar Izquierda de todo - Desplegable)
const crmDetailsSidebar = document.getElementById('crmDetailsSidebar');
const btnCloseDetailsSidebar = document.getElementById('btnCloseDetailsSidebar');
const btnFoldDetailsSidebar = document.getElementById('btnFoldDetailsSidebar');
const btnToggleFichaSidebar = document.getElementById('btnToggleFichaSidebar');
const cardClientName = document.getElementById('cardClientName');
const cardClientPhone = document.getElementById('cardClientPhone');
const cardWhatsAppDirect = document.getElementById('cardWhatsAppDirect');
const cardClientEmail = document.getElementById('cardClientEmail');
const cardDeviceInterest = document.getElementById('cardDeviceInterest');
const cardDeviceCanje = document.getElementById('cardDeviceCanje');
const cardCotizacion = document.getElementById('cardCotizacion');
const tagsSelectorGrid = document.getElementById('tagsSelectorGrid');
const cardNotes = document.getElementById('cardNotes');
const btnSaveCrmCard = document.getElementById('btnSaveCrmCard');
const crmSaveStatusMsg = document.getElementById('crmSaveStatusMsg');
const btnAiAutoFillCard = document.getElementById('btnAiAutoFillCard');
const aiAutoFillLabel = document.getElementById('aiAutoFillLabel');
const btnToggleSidebarDock = document.getElementById('btnToggleSidebarDock');
const dockPosLabel = document.getElementById('dockPosLabel');

// Modales
const transferModal = document.getElementById('transferModal');
const btnCloseTransferModal = document.getElementById('btnCloseTransferModal');
const btnCancelTransfer = document.getElementById('btnCancelTransfer');
const btnConfirmTransfer = document.getElementById('btnConfirmTransfer');
const transferNoteInput = document.getElementById('transferNoteInput');

const closeChatModal = document.getElementById('closeChatModal');
const btnCloseCloseModal = document.getElementById('btnCloseCloseModal');
const btnCancelCloseModal = document.getElementById('btnCancelCloseModal');
const btnConfirmCloseChat = document.getElementById('btnConfirmCloseChat');
const closeReasonSelect = document.getElementById('closeReasonSelect');

const imageLightboxModal = document.getElementById('imageLightboxModal');
const lightboxImg = document.getElementById('lightboxImg');
const btnCloseLightbox = document.getElementById('btnCloseLightbox');

// Métricas & Auditoría Meta
const btnMetricsModal = document.getElementById('btnMetricsModal');
const btnOpenMetricsFromChat = document.getElementById('btnOpenMetricsFromChat');
const metricsModal = document.getElementById('metricsModal');
const btnCloseMetricsModal = document.getElementById('btnCloseMetricsModal');
const btnCloseMetricsFooter = document.getElementById('btnCloseMetricsFooter');
const btnRefreshMetrics = document.getElementById('btnRefreshMetrics');
const metricsMonthSelect = document.getElementById('metricsMonthSelect');
const metricsLoadingState = document.getElementById('metricsLoadingState');
const metricsMainContent = document.getElementById('metricsMainContent');

const metricTotalMessages = document.getElementById('metricTotalMessages');
const metricTotalSent = document.getElementById('metricTotalSent');
const metricSentPercent = document.getElementById('metricSentPercent');
const metricTotalReceived = document.getElementById('metricTotalReceived');
const metricReceivedPercent = document.getElementById('metricReceivedPercent');
const ratioBarSent = document.getElementById('ratioBarSent');
const ratioBarReceived = document.getElementById('ratioBarReceived');

const metricBusinessInitiated = document.getElementById('metricBusinessInitiated');
const metricBusinessPercent = document.getElementById('metricBusinessPercent');
const metricUserInitiated = document.getElementById('metricUserInitiated');
const metricUserPercent = document.getElementById('metricUserPercent');

const metricProjectedCostUsd = document.getElementById('metricProjectedCostUsd');
const metricProjectedCostArs = document.getElementById('metricProjectedCostArs');
const metricActualCostUsd = document.getElementById('metricActualCostUsd');
const metricActualCostArs = document.getElementById('metricActualCostArs');
const metricProjectedSent = document.getElementById('metricProjectedSent');
const metricCardPeriod1 = document.getElementById('metricCardPeriod1');
const dailyBarsContainer = document.getElementById('dailyBarsContainer');

// ============================================================================
// 3. INICIALIZACIÓN
// ============================================================================

async function initConsole() {
    console.log('🚀 Iniciando Consola CRM Estilo Apple SJ...');

    // 1. Configurar Operador Activo
    setupOperatorProfile();

    // 1b. Inicializar estado desplegable de la Ficha del Cliente (A la izquierda de todo)
    initFichaState();

    // 2. Renderizar Etiquetas en Ficha CRM
    renderAvailableTags();

    // 3. Cargar Respuestas Rápidas
    loadQuickReplies();

    // 4. Configurar Listeners de UI
    setupEventListeners();

    // 4b. Configurar Modal de Métricas Mensuales & Costos Meta
    setupMetricsModal();

    // 5. Cargar Conversaciones
    await loadConversations();

    // 6. Activar Suscripción en Tiempo Real
    subscribeToCrmRealtime({
        onNewMessage: handleRealtimeNewMessage,
        onContactUpdate: handleRealtimeContactUpdate
    });
}

// ============================================================================
// 4. GESTIÓN DEL OPERADOR ACTIVO Y SONIDO
// ============================================================================

function setupOperatorProfile() {
    activeSellerSelect.value = activeSeller;
    operatorAvatarBadge.innerText = activeSeller.charAt(0).toUpperCase();

    // Color del avatar según operador
    const sellerObj = SELLERS.find(s => s.id === activeSeller);
    if (sellerObj) {
        operatorAvatarBadge.style.background = sellerObj.color;
    }

    // Toggle de sonido
    updateSoundButtonUI();
}

function updateSoundButtonUI() {
    if (isSoundEnabled) {
        chimeToggleBtn.classList.add('active');
        chimeToggleBtn.title = 'Sonido de nuevos mensajes (Activado)';
    } else {
        chimeToggleBtn.classList.remove('active');
        chimeToggleBtn.title = 'Sonido de nuevos mensajes (Silenciado)';
    }
}

// ============================================================================
// 5. CARGA Y PROCESAMIENTO DE CONVERSACIONES
// ============================================================================

async function loadConversations() {
    crmContactsList.innerHTML = `
        <div class="loading-state">
            <div class="crm-spinner"></div>
            <p>Sincronizando bandejas de Estilo Apple SJ...</p>
        </div>
    `;

    try {
        const conversations = await fetchCrmConversations(200);
        console.log(`✅ ${conversations.length} conversaciones recuperadas`);

        conversationsMap.clear();
        conversations.forEach(c => {
            conversationsMap.set(c.phone, c);
        });

        updateTabBadges();
        renderContactsList();

        // Si había un chat abierto, refrescar su cabecera si sigue en lista
        if (activeChatPhone && conversationsMap.has(activeChatPhone)) {
            activeContact = conversationsMap.get(activeChatPhone);
            updateChatHeader(activeContact);
        }
    } catch (err) {
        console.error('Error cargando conversaciones:', err);
        crmContactsList.innerHTML = `
            <div class="loading-state" style="color:#E11D48;">
                <p>⚠️ Error al sincronizar conversaciones.</p>
                <button onclick="location.reload()" style="margin-top:10px; padding:6px 12px; border-radius:6px; cursor:pointer;">Reintentar</button>
            </div>
        `;
    }
}

// Actualizar contadores de las 4 bandejas
function updateTabBadges() {
    let sinAsignar = 0;
    let misChats = 0;
    let todos = 0;
    let cerrados = 0;

    conversationsMap.forEach(c => {
        const isClosed = c.contact_status === 'cerrado';
        const seller = c.contact_seller;

        if (isClosed) {
            cerrados++;
        } else {
            todos++;
            if (!seller || seller === 'Sin Asignar' || c.contact_status === 'sin_asignar') {
                sinAsignar++;
            }
            if (seller === activeSeller) {
                misChats++;
            }
        }
    });

    countSinAsignarEl.innerText = sinAsignar;
    countMisChatsEl.innerText = misChats;
    countTodosEl.innerText = todos;
    countCerradosEl.innerText = cerrados;
}

// Renderizado de la lista según bandeja y búsqueda
function renderContactsList() {
    const list = Array.from(conversationsMap.values());

    // 1. Filtrar por Bandeja
    let filtered = list.filter(c => {
        const isClosed = c.contact_status === 'cerrado';
        const seller = c.contact_seller;

        if (activeTab === 'sin_asignar') {
            return !isClosed && (!seller || seller === 'Sin Asignar' || c.contact_status === 'sin_asignar');
        } else if (activeTab === 'mis_chats') {
            return !isClosed && seller === activeSeller;
        } else if (activeTab === 'todos') {
            return !isClosed;
        } else if (activeTab === 'cerrados') {
            return isClosed;
        }
        return true;
    });

    // 2. Filtrar por Canal / Plataforma
    if (activeChannel !== 'all') {
        filtered = filtered.filter(c => (c.platform || 'whatsapp') === activeChannel);
    }

    // 3. Filtrar por Búsqueda
    if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        filtered = filtered.filter(c => {
            const nameMatch = c.contact_name && c.contact_name.toLowerCase().includes(q);
            const phoneMatch = c.phone && c.phone.includes(q);
            const msgMatch = c.last_message && c.last_message.toLowerCase().includes(q);
            const deviceMatch = c.modelo_dispositivo && c.modelo_dispositivo.toLowerCase().includes(q);
            return nameMatch || phoneMatch || msgMatch || deviceMatch;
        });
    }

    // 4. Ordenar: los más recientes arriba
    filtered.sort((a, b) => new Date(b.last_message_time) - new Date(a.last_message_time));

    crmContactsList.innerHTML = '';

    if (filtered.length === 0) {
        crmContactsList.innerHTML = `
            <div style="padding: 30px 20px; text-align: center; color: var(--text-muted); font-size: 13px;">
                No hay conversaciones en esta bandeja.
            </div>
        `;
        return;
    }

    filtered.forEach(c => {
        const isActive = activeChatPhone === c.phone ? 'active' : '';
        const timeStr = formatRelativeTime(c.last_message_time);
        const displayName = c.contact_name || formatPhoneNumber(c.phone);
        const initial = (displayName.charAt(0) || '?').toUpperCase();
        const avatarBg = getAvatarColor(c.phone);

        // Chip de vendedor
        let sellerBadgeHtml = '';
        if (c.contact_seller === 'Nahuel') {
            sellerBadgeHtml = `<span class="seller-pill-badge seller-pill-nahuel">Nahuel</span>`;
        } else if (c.contact_seller === 'Cristofer') {
            sellerBadgeHtml = `<span class="seller-pill-badge seller-pill-cristofer">Cristofer</span>`;
        } else if (c.contact_seller === 'Lucas') {
            sellerBadgeHtml = `<span class="seller-pill-badge seller-pill-lucas">Lucas</span>`;
        } else {
            sellerBadgeHtml = `<span class="seller-pill-badge seller-pill-none">Sin Asignar</span>`;
        }

        const unreadHtml = c.unread_count > 0 
            ? `<span class="card-unread-badge">${c.unread_count}</span>` 
            : '';

        const itemHtml = `
            <div class="contact-card-item ${isActive}" data-phone="${c.phone}">
                <div class="card-avatar-wrap">
                    <div class="card-avatar" style="background:${avatarBg};">
                        ${c.contact_avatar && c.contact_avatar.startsWith('http') 
                            ? `<img src="${c.contact_avatar}" alt="${displayName}">` 
                            : initial}
                    </div>
                    <div class="channel-icon-badge" title="${c.platform || 'whatsapp'}">
                        <svg viewBox="0 0 24 24"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2Z"/></svg>
                    </div>
                </div>

                <div class="card-content">
                    <div class="card-top-line">
                        <span class="card-client-title" title="${displayName}">
                            ${displayName}
                        </span>
                        <span class="card-time">${timeStr}</span>
                    </div>

                    <div class="card-meta-line">
                        ${sellerBadgeHtml}
                        ${c.modelo_dispositivo ? `<span class="status-chip">📱 ${c.modelo_dispositivo}</span>` : ''}
                        ${c.cotizacion_estimada ? `<span class="status-chip chip-price" style="background:#ECFDF5; color:#047857; border:1px solid #A7F3D0; font-size:10px;">💰 ${escapeHtml(c.cotizacion_estimada)}</span>` : ''}
                        ${Array.isArray(c.etiquetas) && c.etiquetas.length > 0 ? `<span class="status-chip" style="background:#F1F5F9; color:#475569; font-size:10px;">#${c.etiquetas[0]}</span>` : ''}
                    </div>

                    <div class="card-message-snippet">
                        ${c.last_message_is_mine ? '<strong>Tú: </strong>' : ''}${escapeHtml(c.last_message || 'Archivo multimedia')}
                    </div>
                </div>

                ${unreadHtml}
            </div>
        `;

        crmContactsList.insertAdjacentHTML('beforeend', itemHtml);
    });

    // Agregar eventos de clic a cada tarjeta
    document.querySelectorAll('.contact-card-item').forEach(el => {
        el.addEventListener('click', () => {
            const phone = el.getAttribute('data-phone');
            openChat(phone);
        });
    });
}

// ============================================================================
// 6. ABRIR Y GESTIONAR CHAT ACTIVO
// ============================================================================

export async function openChat(phone) {
    if (!phone) return;
    activeChatPhone = phone;

    // Actualizar selección activa en sidebar
    document.querySelectorAll('.contact-card-item').forEach(el => {
        el.classList.toggle('active', el.getAttribute('data-phone') === phone);
    });

    // Cambiar vista de empty a active
    crmEmptyState.style.display = 'none';
    crmActiveChat.style.display = 'flex';
    document.getElementById('crmChatPane').classList.add('mobile-open');

    // Obtener objeto del contacto
    activeContact = conversationsMap.get(phone) || {
        phone: phone,
        contact_name: phone,
        contact_status: 'abierto',
        contact_seller: null
    };

    // Actualizar Header
    updateChatHeader(activeContact);

    // Poblar Ficha Comercial (Sidebar derecha)
    populateCustomerCard(activeContact);

    // Cargar historial de mensajes
    await loadChatMessages(phone);

    // Auto-analizar el chat con IA para completar la Ficha del Cliente y el sidebar
    scheduleAutoAnalysis(phone);

    // Marcar como leído localmente
    if (activeContact && activeContact.unread_count > 0) {
        activeContact.unread_count = 0;
        updateTabBadges();
        renderContactsList();
    }

    // Enfocar input
    messageTextInput.focus();
}

function updateChatHeader(contact) {
    const displayName = contact.contact_name || formatPhoneNumber(contact.phone);
    const initial = (displayName.charAt(0) || '?').toUpperCase();
    const avatarBg = getAvatarColor(contact.phone);

    activeChatAvatar.style.background = avatarBg;
    if (contact.contact_avatar && contact.contact_avatar.startsWith('http')) {
        activeChatAvatar.innerHTML = `<img src="${contact.contact_avatar}" alt="${displayName}">`;
    } else {
        activeChatAvatar.innerText = initial;
    }

    activeChatName.innerText = displayName;
    activeChatPhoneEl.innerText = '+' + contact.phone;

    // Estado del chat
    const isClosed = contact.contact_status === 'cerrado';
    if (isClosed) {
        activeChatStatusBadge.className = 'status-badge closed';
        activeChatStatusBadge.innerText = `Cerrado (${contact.motivo_cierre || 'Resuelto'})`;
        btnCloseChatLabel.innerText = 'Reabrir Chat';
        btnCloseChat.className = 'btn-action btn-secondary';
    } else {
        activeChatStatusBadge.className = 'status-badge';
        activeChatStatusBadge.innerText = 'Abierto';
        btnCloseChatLabel.innerText = 'Cerrar Chat';
        btnCloseChat.className = 'btn-action btn-danger-subtle';
    }

    // Vendedor Asignado
    const seller = contact.contact_seller;
    if (seller && seller !== 'Sin Asignar') {
        activeChatSellerText.innerText = seller;
        activeChatSellerChip.style.background = '#EFF6FF';
        activeChatSellerChip.style.color = '#1E3A5F';
        activeChatSellerChip.style.borderColor = '#BFDBFE';
        
        // Si está asignado a mí
        if (seller === activeSeller) {
            btnClaimChat.style.display = 'none';
        } else {
            btnClaimChat.style.display = 'inline-flex';
            btnClaimChat.querySelector('span').innerText = 'Tomar para mí';
        }
    } else {
        activeChatSellerText.innerText = 'Sin Asignar';
        activeChatSellerChip.style.background = '#FEF3C7';
        activeChatSellerChip.style.color = '#92400E';
        activeChatSellerChip.style.borderColor = '#FDE68A';
        btnClaimChat.style.display = 'inline-flex';
        btnClaimChat.querySelector('span').innerText = 'Tomar Chat';
    }

    // Dispositivo Badge en cabecera
    if (contact.modelo_dispositivo) {
        activeChatDeviceBadge.style.display = 'inline-block';
        activeChatDeviceBadge.innerText = `📱 ${contact.modelo_dispositivo}`;
    } else {
        activeChatDeviceBadge.style.display = 'none';
    }
}

// Cargar y pintar mensajes de la conversación
async function loadChatMessages(phone) {
    crmMessagesContainer.innerHTML = `
        <div style="text-align:center; padding:30px; color:var(--text-muted); font-size:13px;">
            <div class="crm-spinner"></div>
            Sincronizando mensajes cifrados...
        </div>
    `;

    try {
        const messages = await fetchChatMessages(phone);
        crmMessagesContainer.innerHTML = `
            <div class="date-divider-row">
                <span class="date-divider-pill">Historial Oficial Estilo Apple SJ</span>
            </div>
        `;

        if (messages.length === 0) {
            crmMessagesContainer.insertAdjacentHTML('beforeend', `
                <div style="text-align:center; padding:20px; color:var(--text-muted); font-size:13px;">
                    No hay mensajes en este chat. Envía un saludo o nota interna.
                </div>
            `);
            return;
        }

        messages.forEach(msg => appendMessageBubble(msg));
        scrollToBottom();
    } catch (err) {
        console.error('Error cargando mensajes:', err);
        crmMessagesContainer.innerHTML = `
            <div style="text-align:center; padding:20px; color:#E11D48; font-size:13px;">
                Error al cargar el historial.
            </div>
        `;
    }
}

// Dibujar una burbuja de mensaje individual
function appendMessageBubble(msg) {
    const isMine = !!msg.es_mio;
    const isNote = !!msg.es_nota_privada;
    const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const bubble = document.createElement('div');
    bubble.id = `msg_${msg.id || Date.now()}`;

    if (isNote) {
        bubble.className = 'msg-bubble private-note';
        bubble.innerHTML = `
            <div class="private-note-header">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
                <span>NOTA INTERNA DE ${escapeHtml(msg.remitente_nombre || 'OPERADOR')}</span>
            </div>
            <div class="msg-body">${formatMessageText(msg.contenido)}</div>
            <div class="msg-meta-row" style="color:#B45309;">
                <span>${time} (Solo visible internamente)</span>
            </div>
        `;
    } else {
        bubble.className = `msg-bubble ${isMine ? 'sent' : 'received'}`;
        
        let mediaHtml = '';
        if (msg.media_url) {
            mediaHtml = renderMediaContent(msg.media_url, msg.media_type);
        }

        const senderTag = isMine && msg.remitente_nombre 
            ? `<div class="msg-sender-tag">${escapeHtml(msg.remitente_nombre)}</div>` 
            : '';

        bubble.innerHTML = `
            ${senderTag}
            ${mediaHtml}
            ${msg.contenido ? `<div class="msg-body">${formatMessageText(msg.contenido)}</div>` : ''}
            <div class="msg-meta-row">
                <span>${time}</span>
                ${isMine ? renderTicks(msg.estado) : ''}
            </div>
        `;
    }

    crmMessagesContainer.appendChild(bubble);
}

function renderMediaContent(url, type) {
    if (!url) return '';
    const isImage = (type === 'image') || url.match(/\.(jpeg|jpg|gif|png|webp|bmp)$/i);
    const isAudio = (type === 'audio') || url.match(/\.(oga|ogg|mp3|wav|m4a)$/i);

    if (isImage) {
        return `
            <img src="${url}" class="msg-image-thumb" alt="Foto adjunta" onclick="window.crmShowLightbox('${url}')">
        `;
    } else if (isAudio) {
        return `
            <div class="msg-audio-player">
                <audio controls style="height: 36px; max-width: 220px;">
                    <source src="${url}">
                </audio>
                <button type="button" class="audio-speed-btn" onclick="window.crmToggleAudioSpeed(this)">1x</button>
            </div>
        `;
    } else {
        return `
            <a href="${url}" target="_blank" style="display:inline-flex; align-items:center; gap:6px; background:rgba(0,0,0,0.06); padding:6px 10px; border-radius:6px; color:inherit; text-decoration:none; margin-bottom:6px; font-size:12px;">
                📎 <span>Ver Archivo Adjunto</span>
            </a>
        `;
    }
}

function renderTicks(estado) {
    const isRead = estado === 'leido';
    return `
        <span style="display:inline-flex; margin-left:3px; color:${isRead ? '#38BDF8' : 'inherit'};">
            ✓✓
        </span>
    `;
}

function scrollToBottom() {
    crmMessagesContainer.scrollTop = crmMessagesContainer.scrollHeight;
}

// ============================================================================
// 7. ENVÍO DE MENSAJES & NOTAS PRIVADAS
// ============================================================================

async function handleSendMessage() {
    const text = messageTextInput.value.trim();
    if (!text || !activeChatPhone) return;

    const isNote = isPrivateNoteMode;
    messageTextInput.value = '';
    messageTextInput.style.height = 'auto';

    try {
        // Enviar vía CRM service
        const sentRecord = await sendCrmMessage({
            phone: activeChatPhone,
            content: text,
            senderName: activeSeller,
            isNote: isNote,
            platform: activeContact ? (activeContact.platform || 'whatsapp') : 'whatsapp'
        });

        // Pintar en UI de inmediato
        appendMessageBubble(sentRecord || {
            cliente_telefono: activeChatPhone,
            contenido: text,
            es_mio: true,
            es_nota_privada: isNote,
            remitente_nombre: activeSeller,
            created_at: new Date().toISOString(),
            estado: 'enviado'
        });
        scrollToBottom();

        // Actualizar último mensaje en mapa
        if (activeContact) {
            activeContact.last_message = (isNote ? '🔒 Nota: ' : '') + text;
            activeContact.last_message_time = new Date().toISOString();
            activeContact.last_message_is_mine = true;
            if (activeContact.contact_status === 'cerrado') {
                activeContact.contact_status = 'abierto';
                updateChatHeader(activeContact);
            }
            updateTabBadges();
            renderContactsList();
        }

        // Si era nota privada, desactivar el modo nota para el próximo mensaje
        if (isNote) {
            setPrivateNoteMode(false);
        }

        // Actualizar entendimiento del chat con IA automáticamente
        scheduleAutoAnalysis(activeChatPhone);
    } catch (err) {
        console.error('Error enviando mensaje:', err);
        alert('Error al enviar mensaje: ' + err.message);
    }
}

function setPrivateNoteMode(enable) {
    isPrivateNoteMode = enable;
    if (isPrivateNoteMode) {
        btnTogglePrivateNote.classList.add('active-note');
        privateNoteToggleLabel.innerText = 'Modo Nota: ON';
        privateNoteBanner.style.display = 'flex';
        textareaWrapper.classList.add('note-mode');
        btnSendMessage.classList.add('note-send');
        messageTextInput.placeholder = 'Escribe aquí la nota interna privada (invisible para el cliente)...';
    } else {
        btnTogglePrivateNote.classList.remove('active-note');
        privateNoteToggleLabel.innerText = 'Nota Interna';
        privateNoteBanner.style.display = 'none';
        textareaWrapper.classList.remove('note-mode');
        btnSendMessage.classList.remove('note-send');
        messageTextInput.placeholder = 'Escribe un mensaje aquí... (o presiona / para atajos)';
    }
}

// ============================================================================
// 8. RESPUESTAS RÁPIDAS (/atajo)
// ============================================================================

async function loadQuickReplies() {
    quickRepliesCatalog = await fetchQuickReplies();
}

function handleInputKeyupForQuickReplies(e) {
    const val = messageTextInput.value;
    if (val.startsWith('/')) {
        showQuickRepliesFlyout(val);
    } else {
        hideQuickRepliesFlyout();
    }
}

function showQuickRepliesFlyout(filter = '/') {
    const query = filter.replace('/', '').toLowerCase().trim();
    const matches = quickRepliesCatalog.filter(qr => 
        qr.shortcut.toLowerCase().includes(query) ||
        qr.title.toLowerCase().includes(query) ||
        qr.content.toLowerCase().includes(query)
    );

    if (matches.length === 0) {
        quickRepliesList.innerHTML = `<div style="padding:12px; font-size:11.5px; color:var(--text-muted); text-align:center;">No hay atajos con "${query}"</div>`;
    } else {
        quickRepliesList.innerHTML = matches.map((qr, idx) => `
            <div class="flyout-item ${idx === 0 ? 'selected' : ''}" data-content="${encodeURIComponent(qr.content)}">
                <span class="flyout-shortcut">${qr.shortcut}</span>
                <span class="flyout-title">${escapeHtml(qr.title)}</span>
                <span class="flyout-preview">${escapeHtml(qr.content)}</span>
            </div>
        `).join('');

        quickRepliesList.querySelectorAll('.flyout-item').forEach(item => {
            item.addEventListener('click', () => {
                const content = decodeURIComponent(item.getAttribute('data-content'));
                applyQuickReply(content);
            });
        });
    }

    quickRepliesFlyout.style.display = 'flex';
}

function hideQuickRepliesFlyout() {
    quickRepliesFlyout.style.display = 'none';
}

function applyQuickReply(content) {
    // Reemplazar variables dinámicas si existen
    const clientName = activeContact ? (activeContact.contact_name || '') : '';
    const sellerName = activeSeller;

    let parsed = content
        .replace(/\{nombre\}/gi, clientName)
        .replace(/\{vendedor\}/gi, sellerName);

    messageTextInput.value = parsed;
    messageTextInput.focus();
    hideQuickRepliesFlyout();
}

// ============================================================================
// 9. FICHA COMERCIAL CRM (COLUMNA 3)
// ============================================================================

function renderAvailableTags() {
    tagsSelectorGrid.innerHTML = DEFAULT_TAGS.map(tag => `
        <button type="button" class="tag-chip" data-tag="${tag}">
            #${tag}
        </button>
    `).join('');

    tagsSelectorGrid.querySelectorAll('.tag-chip').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.classList.toggle('active');
        });
    });
}

function populateCustomerCard(contact) {
    if (!contact) return;

    cardClientName.value = contact.contact_name || '';
    cardClientPhone.value = '+' + contact.phone;
    cardWhatsAppDirect.href = `https://wa.me/${contact.phone}`;
    cardClientEmail.value = contact.email || '';

    cardDeviceInterest.value = contact.modelo_dispositivo || contact.dispositivo_interes || '';
    cardDeviceCanje.value = contact.dispositivo_canje || '';
    cardCotizacion.value = contact.cotizacion_estimada || '';
    cardNotes.value = contact.notas || '';

    // Marcar tags seleccionados
    const selectedTags = Array.isArray(contact.etiquetas) ? contact.etiquetas : [];
    tagsSelectorGrid.querySelectorAll('.tag-chip').forEach(btn => {
        const tag = btn.getAttribute('data-tag');
        btn.classList.toggle('active', selectedTags.includes(tag));
    });
}

async function handleSaveCustomerCard() {
    if (!activeChatPhone) return;

    btnSaveCrmCard.disabled = true;
    crmSaveStatusMsg.innerText = 'Guardando...';

    // Obtener tags seleccionados
    const selectedTags = [];
    tagsSelectorGrid.querySelectorAll('.tag-chip.active').forEach(btn => {
        selectedTags.push(btn.getAttribute('data-tag'));
    });

    const cardData = {
        nombre: cardClientName.value.trim(),
        email: cardClientEmail.value.trim(),
        modelo_dispositivo: cardDeviceInterest.value.trim(),
        dispositivo_interes: cardDeviceInterest.value.trim(),
        dispositivo_canje: cardDeviceCanje.value.trim(),
        cotizacion_estimada: cardCotizacion.value.trim(),
        notas: cardNotes.value.trim(),
        etiquetas: selectedTags
    };

    try {
        await saveCustomerCard(activeChatPhone, cardData);

        // Actualizar en mapa local
        if (activeContact) {
            Object.assign(activeContact, cardData);
            activeContact.contact_name = cardData.nombre || activeContact.contact_name;
            updateChatHeader(activeContact);
            renderContactsList();
        }

        crmSaveStatusMsg.innerText = '✓ Guardado exitosamente';
        setTimeout(() => { crmSaveStatusMsg.innerText = ''; }, 3000);
    } catch (err) {
        console.error('Error guardando ficha CRM:', err);
        crmSaveStatusMsg.innerText = '❌ Error al guardar';
    } finally {
        btnSaveCrmCard.disabled = false;
    }
}

// ============================================================================
// 9b. INTELIGENCIA ARTIFICIAL: AUTOCOMPLETADO Y ENTENDIMIENTO DEL CHAT
// ============================================================================

let isAnalyzingChat = false;
let autoAnalyzeTimeout = null;

export function scheduleAutoAnalysis(phone) {
    if (!phone) return;
    if (autoAnalyzeTimeout) clearTimeout(autoAnalyzeTimeout);
    autoAnalyzeTimeout = setTimeout(() => {
        if (activeChatPhone === phone) {
            analyzeChatAndPopulateCard(phone, false);
        }
    }, 600);
}

export async function analyzeChatAndPopulateCard(phone, force = false) {
    if (!phone || isAnalyzingChat) return;

    const messages = await fetchChatMessages(phone);
    if (!messages || messages.length < 2) {
        if (force) {
            crmSaveStatusMsg.innerHTML = '<span style="color:#F59E0B; font-size:11px;">⚠️ Se necesitan al menos 2 mensajes para analizar.</span>';
            setTimeout(() => { crmSaveStatusMsg.innerText = ''; }, 3000);
        }
        return;
    }

    isAnalyzingChat = true;
    if (btnAiAutoFillCard) {
        btnAiAutoFillCard.disabled = true;
        if (aiAutoFillLabel) aiAutoFillLabel.innerText = 'Analizando...';
    }
    crmSaveStatusMsg.innerHTML = '<span style="color:#3B82F6; font-size:11.5px; font-weight:600;">✨ Analizando chat con IA...</span>';

    try {
        const extractedData = await extractCrmDataFromChat(messages);
        if (extractedData) {
            await applyAiExtractedData(extractedData, phone);
        } else {
            crmSaveStatusMsg.innerHTML = '<span style="color:#64748B; font-size:11.5px;">No se encontraron datos nuevos en el chat</span>';
            setTimeout(() => { crmSaveStatusMsg.innerText = ''; }, 3000);
        }
    } catch (err) {
        console.error('Error analizando chat con IA:', err);
        crmSaveStatusMsg.innerHTML = '<span style="color:#EF4444; font-size:11.5px;">❌ Error al analizar chat</span>';
        setTimeout(() => { crmSaveStatusMsg.innerText = ''; }, 3500);
    } finally {
        isAnalyzingChat = false;
        if (btnAiAutoFillCard) {
            btnAiAutoFillCard.disabled = false;
            if (aiAutoFillLabel) aiAutoFillLabel.innerText = 'Autocompletar IA';
        }
    }
}

async function extractCrmDataFromChat(messages) {
    const recent = messages.slice(-16);
    const transcript = recent.map(m => {
        const sender = m.es_mio ? (m.remitente_nombre || 'Asesor Estilo Apple') : 'Cliente';
        const text = m.contenido || (m.media_type ? `[${m.media_type}]` : '[archivo]');
        return `${sender}: ${text}`;
    }).join('\n');

    const systemPrompt = `Eres un asistente de inteligencia artificial para el CRM de Estilo Apple SJ (tienda y servicio técnico oficial Apple en San Juan, Argentina).
Tu objetivo es analizar la conversación entre un cliente y el asesor comercial/técnico y extraer estructuradamente la información para completar la Ficha del Cliente.

Debes responder ÚNICAMENTE un objeto JSON válido con los siguientes campos:
{
  "nombre": "Nombre del cliente si fue mencionado en el chat o en saludos (ej: 'Daiana')",
  "dispositivo_interes": "Dispositivo o servicio buscado por el cliente (ej: 'Reparación iPhone 13 - Parlante Auricular' o 'iPhone 15 Pro')",
  "dispositivo_canje": "Dispositivo actual que el cliente entrega para canje o para reparar en el laboratorio (ej: 'iPhone 13')",
  "cotizacion_estimada": "Valor cotizado, presupuesto, diagnóstico o seña acordada (ej: 'Diagnóstico $20.000 bonificable')",
  "etiquetas": ["Servicio Técnico", "Presupuestado", "Local Patio San Ignacio"], // Selecciona entre: "Plan Canje", "Venta Nueva", "Usado Seleccionado", "Servicio Técnico", "VIP", "Presupuestado", "Seña Recibida", "Local Patio San Ignacio"
  "notas": "Resumen conciso y profesional de 1 a 2 oraciones con el contexto del cliente, falla o equipo buscado y próximos pasos acordados."
}
No agregues explicaciones fuera del bloque JSON.`;

    const payload = {
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Analiza esta conversación de WhatsApp y extrae los datos de la ficha comercial:\n\n${transcript}` }
        ],
        temperature: 0.1
    };

    const res = await fetch('/api/growy-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        throw new Error(`Error en API: ${res.statusText}`);
    }

    const data = await res.json();
    const rawContent = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!rawContent) return null;

    const cleanJson = rawContent.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
}

async function applyAiExtractedData(data, phone) {
    if (!data || !phone) return;

    if (data.nombre) {
        cardClientName.value = data.nombre;
    }
    if (data.dispositivo_interes) {
        cardDeviceInterest.value = data.dispositivo_interes;
    }
    if (data.dispositivo_canje) {
        cardDeviceCanje.value = data.dispositivo_canje;
    }
    if (data.cotizacion_estimada) {
        cardCotizacion.value = data.cotizacion_estimada;
    }
    if (data.notas) {
        cardNotes.value = data.notas;
    }

    if (Array.isArray(data.etiquetas)) {
        tagsSelectorGrid.querySelectorAll('.tag-chip').forEach(btn => {
            const tag = btn.getAttribute('data-tag');
            const shouldBeActive = data.etiquetas.includes(tag);
            btn.classList.toggle('active', shouldBeActive);
        });
    }

    const selectedTags = [];
    tagsSelectorGrid.querySelectorAll('.tag-chip.active').forEach(btn => {
        selectedTags.push(btn.getAttribute('data-tag'));
    });

    const cardData = {
        nombre: cardClientName.value.trim(),
        modelo_dispositivo: cardDeviceInterest.value.trim() || cardDeviceCanje.value.trim(),
        dispositivo_interes: cardDeviceInterest.value.trim(),
        dispositivo_canje: cardDeviceCanje.value.trim(),
        cotizacion_estimada: cardCotizacion.value.trim(),
        notas: cardNotes.value.trim(),
        etiquetas: selectedTags
    };

    try {
        await saveCustomerCard(phone, cardData);
    } catch (saveErr) {
        console.warn('Advertencia guardando ficha con IA en Supabase:', saveErr);
    }

    if (activeContact && activeContact.phone === phone) {
        Object.assign(activeContact, cardData);
        if (data.nombre) activeContact.contact_name = data.nombre;
        updateChatHeader(activeContact);
    }
    const mapItem = conversationsMap.get(phone);
    if (mapItem) {
        Object.assign(mapItem, cardData);
        if (data.nombre) mapItem.contact_name = data.nombre;
    }

    renderContactsList();

    crmSaveStatusMsg.innerHTML = '<span style="color:#10B981; font-weight:700;">✨ Ficha autocompletada con éxito</span>';
    setTimeout(() => { crmSaveStatusMsg.innerText = ''; }, 4000);
}

// ============================================================================
// 9c. CONTROL DESPLEGABLE DE LA FICHA DEL CLIENTE (A LA IZQUIERDA DE TODO)
// ============================================================================

function setFichaCollapsedState(collapsed) {
    if (!crmDetailsSidebar) return;
    crmDetailsSidebar.classList.toggle('collapsed', collapsed);
    localStorage.setItem('estilo_crm_ficha_collapsed', collapsed ? 'true' : 'false');

    // Sincronizar estados visuales de los botones de apertura/pliegue
    if (btnToggleCrmCard) {
        btnToggleCrmCard.classList.toggle('active', !collapsed);
    }
    if (btnToggleFichaSidebar) {
        btnToggleFichaSidebar.classList.toggle('active', !collapsed);
        btnToggleFichaSidebar.title = collapsed ? 'Desplegar Ficha del Cliente (Ctrl+B)' : 'Plegar Ficha del Cliente (Ctrl+B)';
    }
}

function toggleFichaCollapsed() {
    if (!crmDetailsSidebar) return;
    const isCurrentlyCollapsed = crmDetailsSidebar.classList.contains('collapsed');
    setFichaCollapsedState(!isCurrentlyCollapsed);
}

function initFichaState() {
    const savedState = localStorage.getItem('estilo_crm_ficha_collapsed');
    // Por defecto visible (desplegada); si el usuario la plegó expresamente, respetar su preferencia
    if (savedState === 'true') {
        setFichaCollapsedState(true);
    } else {
        setFichaCollapsedState(false);
    }
}

// ============================================================================
// 10. TRANSFERENCIAS Y CIERRE DE CONVERSACIÓN
// ============================================================================

function openTransferModal() {
    transferNoteInput.value = '';
    transferModal.style.display = 'flex';
}

function closeTransferModal() {
    transferModal.style.display = 'none';
}

async function handleConfirmTransfer() {
    const selectedRadio = document.querySelector('input[name="targetSellerRadio"]:checked');
    if (!selectedRadio || !activeChatPhone) return;

    const targetSeller = selectedRadio.value;
    const note = transferNoteInput.value.trim();

    try {
        await transferChat({
            phone: activeChatPhone,
            targetSeller: targetSeller,
            note: note,
            currentSeller: activeSeller
        });

        if (activeContact) {
            activeContact.contact_seller = targetSeller;
            activeContact.contact_status = 'abierto';
            updateChatHeader(activeContact);
            updateTabBadges();
            renderContactsList();
        }

        // Recargar mensajes para mostrar la nota de transferencia
        await loadChatMessages(activeChatPhone);
        closeTransferModal();
    } catch (err) {
        alert('Error al transferir: ' + err.message);
    }
}

function openCloseModal() {
    // Si ya está cerrado, reabrirlo directamente
    if (activeContact && activeContact.contact_status === 'cerrado') {
        handleReopenChat();
        return;
    }
    closeChatModal.style.display = 'flex';
}

function closeCloseModal() {
    closeChatModal.style.display = 'none';
}

async function handleConfirmCloseChat() {
    if (!activeChatPhone) return;
    const reason = closeReasonSelect.value;

    try {
        await closeConversationWithReason({
            phone: activeChatPhone,
            reason: reason,
            currentSeller: activeSeller
        });

        if (activeContact) {
            activeContact.contact_status = 'cerrado';
            activeContact.motivo_cierre = reason;
            updateChatHeader(activeContact);
            updateTabBadges();
            renderContactsList();
        }

        await loadChatMessages(activeChatPhone);
        closeCloseModal();
    } catch (err) {
        alert('Error al cerrar chat: ' + err.message);
    }
}

async function handleReopenChat() {
    if (!activeChatPhone) return;
    try {
        await reopenConversation(activeChatPhone);
        if (activeContact) {
            activeContact.contact_status = 'abierto';
            activeContact.motivo_cierre = null;
            updateChatHeader(activeContact);
            updateTabBadges();
            renderContactsList();
        }
    } catch (err) {
        alert('Error al reabrir chat: ' + err.message);
    }
}

async function handleClaimChat() {
    if (!activeChatPhone) return;
    try {
        await assignSellerToChat(activeChatPhone, activeSeller);
        if (activeContact) {
            activeContact.contact_seller = activeSeller;
            activeContact.contact_status = 'abierto';
            updateChatHeader(activeContact);
            updateTabBadges();
            renderContactsList();
        }
    } catch (err) {
        alert('Error al asignar chat: ' + err.message);
    }
}

// ============================================================================
// 11. MANEJO DE EVENTOS EN TIEMPO REAL (REALTIME)
// ============================================================================

function handleRealtimeNewMessage(msg) {
    const phone = msg.cliente_telefono;
    if (!phone) return;

    // 1. Tocar campanilla sonora si es un mensaje de cliente y el sonido está activo
    if (!msg.es_mio && isSoundEnabled) {
        playCrmChime();
    }

    // 2. Actualizar conversación en el mapa
    let conv = conversationsMap.get(phone);
    if (!conv) {
        conv = {
            phone: phone,
            contact_name: msg.cliente_nombre || phone,
            last_message: msg.contenido,
            last_message_time: msg.created_at,
            last_message_is_mine: !!msg.es_mio,
            unread_count: (activeChatPhone === phone) ? 0 : 1,
            contact_status: 'abierto',
            contact_seller: null
        };
        conversationsMap.set(phone, conv);
    } else {
        conv.last_message = msg.contenido;
        conv.last_message_time = msg.created_at;
        conv.last_message_is_mine = !!msg.es_mio;
        if (activeChatPhone !== phone && !msg.es_mio) {
            conv.unread_count = (conv.unread_count || 0) + 1;
        }
        if (conv.contact_status === 'cerrado') {
            conv.contact_status = 'abierto';
        }
    }

    // 3. Si el chat está abierto en pantalla, pintar la burbuja y auto-analizar
    if (activeChatPhone === phone) {
        appendMessageBubble(msg);
        scrollToBottom();
        scheduleAutoAnalysis(phone);
    }

    // 4. Refrescar contadores y lista lateral
    updateTabBadges();
    renderContactsList();
}

function handleRealtimeContactUpdate(contactRecord) {
    const phone = contactRecord.telefono;
    if (!phone || !conversationsMap.has(phone)) return;

    const conv = conversationsMap.get(phone);
    conv.contact_name = contactRecord.nombre || conv.contact_name;
    conv.contact_seller = contactRecord.vendedor_asignado;
    conv.contact_status = contactRecord.estado;
    conv.motivo_cierre = contactRecord.motivo_cierre;
    conv.modelo_dispositivo = contactRecord.modelo_dispositivo;

    if (activeChatPhone === phone) {
        updateChatHeader(conv);
    }

    updateTabBadges();
    renderContactsList();
}

// ============================================================================
// 12. LISTENERS Y ENLACE DE EVENTOS DOM
// ============================================================================

function setupEventListeners() {
    // 1. Selector de Operador
    activeSellerSelect.addEventListener('change', (e) => {
        activeSeller = e.target.value;
        localStorage.setItem('estilo_crm_active_seller', activeSeller);
        setupOperatorProfile();
        updateTabBadges();
        renderContactsList();
        if (activeContact) updateChatHeader(activeContact);
    });

    // 2. Botón de Sonido
    chimeToggleBtn.addEventListener('click', () => {
        isSoundEnabled = !isSoundEnabled;
        localStorage.setItem('estilo_crm_sound', isSoundEnabled ? 'true' : 'false');
        updateSoundButtonUI();
        if (isSoundEnabled) playCrmChime();
    });

    // 3. Botón Refrescar
    refreshBtn.addEventListener('click', () => {
        loadConversations();
    });

    // 4. Buscador
    crmSearchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
        renderContactsList();
    });

    clearSearchBtn.addEventListener('click', () => {
        crmSearchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        renderContactsList();
    });

    // Atajo de teclado global Ctrl+K para buscar
    window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            crmSearchInput.focus();
        }
    });

    // 5. Pestañas de Bandejas
    crmTabsBar.querySelectorAll('.crm-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            crmTabsBar.querySelectorAll('.crm-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            activeTab = tab.getAttribute('data-tab');
            renderContactsList();
        });
    });

    // 6. Subfiltros de Canal
    document.querySelectorAll('.subfilter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.subfilter-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            activeChannel = chip.getAttribute('data-channel');
            renderContactsList();
        });
    });

    // 7. Acciones de Cabecera del Chat y Ficha Desplegable
    btnClaimChat.addEventListener('click', handleClaimChat);
    btnTransferChat.addEventListener('click', openTransferModal);
    btnCloseChat.addEventListener('click', openCloseModal);

    // Desplegar / Plegar Ficha desde botón en la cabecera del Chat
    if (btnToggleCrmCard) {
        btnToggleCrmCard.addEventListener('click', toggleFichaCollapsed);
    }

    // Desplegar / Plegar Ficha desde botón en la cabecera de la Bandeja de Chats
    if (btnToggleFichaSidebar) {
        btnToggleFichaSidebar.addEventListener('click', toggleFichaCollapsed);
    }

    // Botón Plegar dentro de la propia Ficha
    if (btnFoldDetailsSidebar) {
        btnFoldDetailsSidebar.addEventListener('click', () => setFichaCollapsedState(true));
    }

    // Botón Cerrar (x) dentro de la Ficha
    if (btnCloseDetailsSidebar) {
        btnCloseDetailsSidebar.addEventListener('click', () => setFichaCollapsedState(true));
    }

    // Atajo de teclado global Ctrl+B / Cmd+B para desplegar/plegar la Ficha del Cliente
    window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
            if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
            e.preventDefault();
            toggleFichaCollapsed();
        }
    });

    // 7b. Botón Autocompletar con IA
    if (btnAiAutoFillCard) {
        btnAiAutoFillCard.addEventListener('click', () => {
            if (activeChatPhone) {
                analyzeChatAndPopulateCard(activeChatPhone, true);
            }
        });
    }

    if (btnToggleSidebarDock) {
        btnToggleSidebarDock.addEventListener('click', toggleFichaCollapsed);
    }

    // Botón Volver Móvil
    mobileBackBtn.addEventListener('click', () => {
        document.getElementById('crmChatPane').classList.remove('mobile-open');
    });

    // 8. Mensajería e Input
    btnSendMessage.addEventListener('click', handleSendMessage);

    messageTextInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            // Si el flyout de atajos está abierto y hay un seleccionado
            if (quickRepliesFlyout.style.display === 'flex') {
                const selected = quickRepliesList.querySelector('.flyout-item.selected') || quickRepliesList.querySelector('.flyout-item');
                if (selected) {
                    const content = decodeURIComponent(selected.getAttribute('data-content'));
                    applyQuickReply(content);
                    return;
                }
            }
            handleSendMessage();
        }
    });

    messageTextInput.addEventListener('keyup', handleInputKeyupForQuickReplies);

    // Auto-expandir textarea
    messageTextInput.addEventListener('input', () => {
        messageTextInput.style.height = 'auto';
        messageTextInput.style.height = Math.min(messageTextInput.scrollHeight, 120) + 'px';
    });

    // Alternar Nota Interna Privada
    btnTogglePrivateNote.addEventListener('click', () => {
        setPrivateNoteMode(!isPrivateNoteMode);
    });

    // Desplegar atajos manualmente
    btnQuickRepliesTrigger.addEventListener('click', () => {
        if (quickRepliesFlyout.style.display === 'none') {
            showQuickRepliesFlyout('/');
        } else {
            hideQuickRepliesFlyout();
        }
    });

    // Emoji Picker
    emojiBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        emojiPickerContainer.style.display = emojiPickerContainer.style.display === 'none' ? 'block' : 'none';
    });

    if (emojiPicker) {
        emojiPicker.addEventListener('emoji-click', (event) => {
            messageTextInput.value += event.detail.unicode;
            messageTextInput.focus();
        });
    }

    document.addEventListener('click', (e) => {
        if (!quickRepliesFlyout.contains(e.target) && e.target !== btnQuickRepliesTrigger) {
            hideQuickRepliesFlyout();
        }
        if (emojiPickerContainer && !emojiPickerContainer.contains(e.target) && e.target !== emojiBtn) {
            emojiPickerContainer.style.display = 'none';
        }
    });

    // 9. Guardar Ficha CRM
    btnSaveCrmCard.addEventListener('click', handleSaveCustomerCard);

    // 10. Modales
    btnCloseTransferModal.addEventListener('click', closeTransferModal);
    btnCancelTransfer.addEventListener('click', closeTransferModal);
    btnConfirmTransfer.addEventListener('click', handleConfirmTransfer);

    btnCloseCloseModal.addEventListener('click', closeCloseModal);
    btnCancelCloseModal.addEventListener('click', closeCloseModal);
    btnConfirmCloseChat.addEventListener('click', handleConfirmCloseChat);

    btnCloseLightbox.addEventListener('click', () => {
        imageLightboxModal.style.display = 'none';
    });
}

// Helpers globales para llamadas inline en HTML generado
window.crmShowLightbox = (imgUrl) => {
    lightboxImg.src = imgUrl;
    imageLightboxModal.style.display = 'flex';
};

window.crmToggleAudioSpeed = (btn) => {
    const audio = btn.parentElement.querySelector('audio');
    if (!audio) return;
    if (audio.playbackRate === 1) {
        audio.playbackRate = 1.5;
        btn.innerText = '1.5x';
    } else if (audio.playbackRate === 1.5) {
        audio.playbackRate = 2;
        btn.innerText = '2x';
    } else {
        audio.playbackRate = 1;
        btn.innerText = '1x';
    }
};

// ============================================================================
// 12. GESTIÓN DE AUDITORÍA, MÉTRICAS MENSUALES & COSTOS META
// ============================================================================

const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

function setupMetricsModal() {
    populateMonthSelector();

    if (btnMetricsModal) {
        btnMetricsModal.addEventListener('click', openMetricsModal);
    }
    if (btnOpenMetricsFromChat) {
        btnOpenMetricsFromChat.addEventListener('click', openMetricsModal);
    }
    if (btnCloseMetricsModal) {
        btnCloseMetricsModal.addEventListener('click', closeMetricsModal);
    }
    if (btnCloseMetricsFooter) {
        btnCloseMetricsFooter.addEventListener('click', closeMetricsModal);
    }
    if (btnRefreshMetrics) {
        btnRefreshMetrics.addEventListener('click', () => {
            const [y, m] = (metricsMonthSelect?.value || '').split('-').map(Number);
            if (y && m) loadAndRenderMetrics(y, m);
        });
    }
    if (metricsMonthSelect) {
        metricsMonthSelect.addEventListener('change', () => {
            const [y, m] = metricsMonthSelect.value.split('-').map(Number);
            if (y && m) loadAndRenderMetrics(y, m);
        });
    }

    // Cerrar al clickear el backdrop
    if (metricsModal) {
        metricsModal.addEventListener('click', (e) => {
            if (e.target === metricsModal) closeMetricsModal();
        });
    }
}

function populateMonthSelector() {
    if (!metricsMonthSelect) return;
    metricsMonthSelect.innerHTML = '';
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1; // 1-12

    // Generar opciones para los últimos 6 meses
    for (let i = 0; i < 6; i++) {
        let y = curYear;
        let m = curMonth - i;
        while (m <= 0) {
            m += 12;
            y -= 1;
        }
        const opt = document.createElement('option');
        opt.value = `${y}-${m}`;
        opt.textContent = `${MONTH_NAMES[m - 1]} ${y}`;
        if (i === 0) opt.selected = true;
        metricsMonthSelect.appendChild(opt);
    }
}

function openMetricsModal() {
    if (!metricsModal) return;
    metricsModal.style.display = 'flex';
    const [y, m] = (metricsMonthSelect?.value || '').split('-').map(Number);
    loadAndRenderMetrics(y || new Date().getFullYear(), m || (new Date().getMonth() + 1));
}

function closeMetricsModal() {
    if (metricsModal) {
        metricsModal.style.display = 'none';
    }
}

async function loadAndRenderMetrics(year, month) {
    if (!metricsLoadingState || !metricsMainContent) return;

    metricsLoadingState.style.display = 'flex';
    metricsMainContent.style.display = 'none';

    try {
        const metrics = await fetchMonthlyMetrics(year, month);
        renderMetricsData(metrics);
        metricsLoadingState.style.display = 'none';
        metricsMainContent.style.display = 'block';
    } catch (err) {
        console.error('Error cargando métricas mensuales:', err);
        metricsLoadingState.innerHTML = `
            <div style="color:#E11D48; font-weight:700;">❌ Error al calcular métricas</div>
            <p style="font-size:12px; color:#64748B;">${err.message || 'Verifica la conexión con Supabase'}</p>
            <button class="btn-modal-cancel" id="btnRetryMetrics" style="margin-top:10px;">Reintentar</button>
        `;
        document.getElementById('btnRetryMetrics')?.addEventListener('click', () => {
            loadAndRenderMetrics(year, month);
        });
    }
}

function renderMetricsData(m) {
    const monthName = MONTH_NAMES[m.month - 1];
    if (metricCardPeriod1) {
        metricCardPeriod1.textContent = m.isCurrentMonth ? `${monthName} (en curso)` : monthName;
    }

    // Mensajes Totales
    if (metricTotalMessages) metricTotalMessages.textContent = m.totalMessages.toLocaleString('es-AR');
    if (metricTotalSent) metricTotalSent.textContent = m.totalSent.toLocaleString('es-AR');
    if (metricSentPercent) metricSentPercent.textContent = `${m.sentPercentage}%`;
    if (metricTotalReceived) metricTotalReceived.textContent = m.totalReceived.toLocaleString('es-AR');
    if (metricReceivedPercent) metricReceivedPercent.textContent = `${m.receivedPercentage}%`;

    // Ratio Bar
    if (ratioBarSent) ratioBarSent.style.width = `${m.sentPercentage}%`;
    if (ratioBarReceived) ratioBarReceived.style.width = `${m.receivedPercentage}%`;

    // Sesiones 24hs Meta
    if (metricBusinessInitiated) metricBusinessInitiated.textContent = m.businessInitiated.toLocaleString('es-AR');
    if (metricBusinessPercent) metricBusinessPercent.textContent = `${m.businessPercentage}%`;
    if (metricUserInitiated) metricUserInitiated.textContent = m.userInitiated.toLocaleString('es-AR');
    if (metricUserPercent) metricUserPercent.textContent = `${m.userPercentage}%`;

    // Costos Proyectados
    if (metricProjectedCostUsd) metricProjectedCostUsd.textContent = `$${m.projectedCostUsd.toFixed(2)} USD`;
    if (metricProjectedCostArs) metricProjectedCostArs.textContent = `≈ $${m.projectedCostArs.toLocaleString('es-AR')} ARS`;
    if (metricActualCostUsd) metricActualCostUsd.textContent = `$${m.actualCostUsd.toFixed(2)} USD`;
    if (metricActualCostArs) metricActualCostArs.textContent = `≈ $${m.actualCostArs.toLocaleString('es-AR')} ARS`;
    if (metricProjectedSent) metricProjectedSent.textContent = `${m.projectedSentMessages.toLocaleString('es-AR')} mensajes`;

    // Gráfico de Barras Diarias
    renderDailyBars(m.dailyStats, m.currentDay, m.daysInMonth);
}

function renderDailyBars(dailyStats, currentDay, daysInMonth) {
    if (!dailyBarsContainer) return;
    dailyBarsContainer.innerHTML = '';

    const maxDayTotal = Math.max(...dailyStats.map(d => d.sent + d.received), 1);

    dailyStats.forEach(ds => {
        const total = ds.sent + ds.received;
        const col = document.createElement('div');
        col.className = 'daily-bar-column';

        const heightPercent = total > 0 ? Math.max(8, Math.round((total / maxDayTotal) * 100)) : 0;
        const sentHeightPercent = total > 0 ? Math.round((ds.sent / total) * 100) : 0;
        const receivedHeightPercent = 100 - sentHeightPercent;

        col.setAttribute('data-tooltip', `Día ${ds.day}\nEnviados: ${ds.sent.toLocaleString('es-AR')}\nRecibidos: ${ds.received.toLocaleString('es-AR')}\nCosto: $${ds.costUsd.toFixed(2)} USD`);

        const track = document.createElement('div');
        track.className = 'daily-bar-track';
        track.style.height = `${heightPercent}%`;

        if (total > 0) {
            const sentFill = document.createElement('div');
            sentFill.className = 'bar-sent-fill';
            sentFill.style.height = `${sentHeightPercent}%`;

            const recvFill = document.createElement('div');
            recvFill.className = 'bar-received-fill';
            recvFill.style.height = `${receivedHeightPercent}%`;

            track.appendChild(sentFill);
            track.appendChild(recvFill);
        } else {
            track.style.background = '#E2E8F0';
            track.style.height = '4px';
            track.style.borderRadius = '2px';
        }

        const label = document.createElement('span');
        label.className = 'daily-bar-label';
        label.textContent = ds.day;
        if (ds.day === currentDay) {
            label.style.color = 'var(--brand-primary)';
            label.style.fontWeight = '800';
        }

        col.appendChild(track);
        col.appendChild(label);
        dailyBarsContainer.appendChild(col);
    });
}

// ============================================================================
// 13. HELPERS DE FORMATO
// ============================================================================

function formatRelativeTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    const isToday = date.getDate() === now.getDate() && 
                    date.getMonth() === now.getMonth() && 
                    date.getFullYear() === now.getFullYear();

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `${diffMins}m`;
    if (isToday) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffHours < 48) return 'Ayer';
    return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
}

function formatPhoneNumber(phone) {
    if (!phone) return '';
    const p = phone.toString();
    if (p.startsWith('549')) {
        return `+54 9 ${p.slice(3, 6)} ${p.slice(6)}`;
    }
    return '+' + p;
}

function getAvatarColor(str = '') {
    const colors = ['#5C2E2E', '#1E3A5F', '#0F766E', '#B45309', '#4338CA', '#701A75'];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatMessageText(text) {
    if (!text) return '';
    let escaped = escapeHtml(text);
    // Negrita tipo WhatsApp *texto*
    escaped = escaped.replace(/\*(.*?)\*/g, '<strong>$1</strong>');
    return escaped;
}

// Iniciar aplicación
document.addEventListener('DOMContentLoaded', () => {
    initConsole();
});
