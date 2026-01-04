
import CONFIG from './config.js';
import { enviarMensajeWhatsApp } from './services/builderbot-api.js';

// ============================================
// INITIALIZATION
// ============================================

// Initialize Supabase from global window object (loaded via CDN)
const supabase = window.supabase.createClient(
    CONFIG.supabase.url,
    CONFIG.supabase.anonKey
);

// State
let activeChatPhone = null;
let contactsMap = new Map(); // phone -> { lastMessage, timestamp, unreadCount, avatar }

// DOM Elements
const contactsListEl = document.getElementById('contactsList');
const chatAreaEl = document.getElementById('chatArea');
const emptyStateEl = document.getElementById('emptyState');
const activeChatEl = document.getElementById('activeChat');
const messagesContainerEl = document.getElementById('messagesContainer');
const chatHeaderNameEl = document.getElementById('chatHeaderName');
const chatHeaderAvatarEl = document.getElementById('chatHeaderAvatar');
const messageInputEl = document.getElementById('messageInput');
const btnSendEl = document.getElementById('btnSend');
const searchInputEl = document.getElementById('searchInput');

// ============================================
// MAIN LOGIC
// ============================================

async function init() {
    console.log('🚀 Iniciando Live Chat...');

    // 1. Initial Load
    await loadContacts();

    // 2. Realtime Subscription
    subscribeToMessages();

    // 3. Event Listeners
    setupEventListeners();
}

// ============================================
// DATA LOADING & RENDERING
// ============================================

async function loadContacts() {
    contactsListEl.innerHTML = `
        <div class="loading-contacts">
            <div class="spinner"></div>
            <p style="color:var(--text-secondary); margin-top:10px;">Cargando chats...</p>
        </div>
    `;

    try {
        // Obtenemos todos los mensajes para agrupar (en producción idealmente tendríamos una tabla 'contactos_live')
        // ordenados por fecha descendente para tener lo más reciente primero
        const { data, error } = await supabase
            .from('mensajes')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        contactsMap.clear();

        // Agrupar por teléfono
        data.forEach(msg => {
            if (!contactsMap.has(msg.cliente_telefono)) {
                contactsMap.set(msg.cliente_telefono, {
                    phone: msg.cliente_telefono,
                    lastMessage: msg.contenido || 'Archivo multimedia',
                    timestamp: new Date(msg.created_at),
                    unreadCount: 0, // Por ahora no persistimos el estado de lectura, todo "leído" visualmente al inicio
                    avatar: getRandomColor(msg.cliente_telefono)
                });
            }
        });

        renderContacts();

    } catch (err) {
        console.error('Error cargando contactos:', err);
        contactsListEl.innerHTML = `<p style="color:red; padding:20px;">Error cargando chats. Recarga la página.</p>`;
    }
}

function renderContacts() {
    const sortedContacts = Array.from(contactsMap.values())
        .sort((a, b) => b.timestamp - a.timestamp);

    contactsListEl.innerHTML = '';

    if (sortedContacts.length === 0) {
        contactsListEl.innerHTML = `<p style="padding:20px; color:var(--text-secondary); text-align:center;">No hay mensajes aún.</p>`;
        return;
    }

    sortedContacts.forEach(contact => {
        const isActive = activeChatPhone === contact.phone ? 'active' : '';
        const timeStr = formatTime(contact.timestamp);

        const html = `
            <div class="contact-item ${isActive}" onclick="window.openChat('${contact.phone}')">
                <div class="contact-avatar" style="background-color: ${contact.avatar}">
                    ${contact.phone.slice(-2)}
                </div>
                <div class="contact-info">
                    <div class="contact-top-row">
                        <span class="contact-name">${contact.phone}</span>
                        <span class="contact-time">${timeStr}</span>
                    </div>
                    <div class="contact-bottom-row">
                        <span class="last-message">${contact.lastMessage}</span>
                        ${contact.unreadCount > 0 ? `<span class="unread-badge">${contact.unreadCount}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
        contactsListEl.insertAdjacentHTML('beforeend', html);
    });
}

// Function attached to window for HTML access
window.openChat = async (phone) => {
    activeChatPhone = phone;

    // Update UI active state
    document.querySelectorAll('.contact-item').forEach(el => el.classList.remove('active'));
    // Find the clicked element (re-rendering is easier but lets try to be efficient eventually)
    renderContacts();

    // Show Chat Area
    emptyStateEl.style.display = 'none';
    activeChatEl.style.display = 'flex';

    // Header Info
    chatHeaderNameEl.textContent = phone;
    const contact = contactsMap.get(phone);
    if (contact) {
        chatHeaderAvatarEl.innerHTML = `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:${contact.avatar}; color:white; font-weight:bold;">${phone.slice(-2)}</div>`;
    }

    // Load Messages
    messagesContainerEl.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-secondary);">Cargando historial...</div>';

    try {
        const { data, error } = await supabase
            .from('mensajes')
            .select('*')
            .eq('cliente_telefono', phone)
            .order('created_at', { ascending: true });

        if (error) throw error;

        messagesContainerEl.innerHTML = '<div class="date-divider"><span>Historial Completo</span></div>';

        data.forEach(msg => appendMessageToUI(msg));
        scrollToBottom();

        // Mark as read locally
        if (contactsMap.has(phone)) {
            contactsMap.get(phone).unreadCount = 0;
            renderContacts();
        }

    } catch (err) {
        console.error('Error cargando chat:', err);
    }
}

// ============================================
// REALTIME
// ============================================

function subscribeToMessages() {
    supabase
        .channel('live-chat-channel')
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'mensajes' },
            (payload) => {
                const newMsg = payload.new;
                handleIncomingMessage(newMsg);
            }
        )
        .subscribe((status) => {
            console.log('Estado Realtime:', status);
        });
}

function handleIncomingMessage(msg) {
    // 1. Update Contact List
    let contact = contactsMap.get(msg.cliente_telefono);
    if (!contact) {
        contact = {
            phone: msg.cliente_telefono,
            avatar: getRandomColor(msg.cliente_telefono),
            unreadCount: 0
        };
        contactsMap.set(msg.cliente_telefono, contact);
    }

    contact.lastMessage = msg.contenido;
    contact.timestamp = new Date(msg.created_at);

    // If chat is NOT open, increment unread
    if (activeChatPhone !== msg.cliente_telefono) {
        contact.unreadCount++;
        playSoundNotification();
    } else {
        // Chat IS open, append directly
        appendMessageToUI(msg);
        scrollToBottom();
    }

    // Refresh Sidebar
    renderContacts();
}

// ============================================
// MESSAGING LOGIC
// ============================================

async function sendMessage() {
    const text = messageInputEl.value.trim();
    if (!text || !activeChatPhone) return;

    messageInputEl.value = '';

    // 1. Optimistic UI Update (Show immediately)
    const optimisticMsg = {
        id: 'temp-' + Date.now(),
        contenido: text,
        es_mio: true,
        created_at: new Date().toISOString(),
        estado: 'enviando'
    };
    appendMessageToUI(optimisticMsg);
    scrollToBottom();

    try {
        // 2. Send via WhatsApp API (Builderbot)
        await enviarMensajeWhatsApp(activeChatPhone, text);

        // 3. Save to Supabase (Database)
        // Note: The UI will receive this via Realtime again, so we need to deduplicate or just ignore 'es_mio' from realtime if we already showed it.
        // ACTUALLY: Let's simpler approach. Save to DB. Realtime picks it up. 
        // We will insert into DB.

        const { error } = await supabase
            .from('mensajes')
            .insert({
                cliente_telefono: activeChatPhone,
                contenido: text,
                es_mio: true,
                estado: 'enviado'
            });

        if (error) throw error;

        // Note: We might get a duplicate bubble because of Optimistic + Realtime.
        // A simple fix for now is: Don't do optimistic UI if reliance on Realtime is fast enough (<500ms).
        // OR: remove the temp bubble when realtime arrives.
        // OR: Make handleIncomingMessage smart enough to skip if ID exists.

        // For this version (MVP), let's remove the optimistic bubble and let Realtime handle it to ensure consistency.
        const tempBubble = document.getElementById(optimisticMsg.id);
        if (tempBubble) tempBubble.remove();

    } catch (err) {
        console.error('Error enviando mensaje:', err);
        alert('Error enviando mensaje. Revisa la consola.');
    }
}

// ============================================
// HELPERS & UTILS
// ============================================

function appendMessageToUI(msg) {
    // Prevent rendering if not active chat
    // (This function is called by openChat and handleIncomingMessage, guarded there)

    // Check duplication (simple) - if ID exists, don't add.
    if (document.getElementById(msg.id)) return;

    const isMine = msg.es_mio;
    const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const div = document.createElement('div');
    div.id = msg.id; // Set ID to prevent duplicates
    div.className = `message ${isMine ? 'outgoing' : 'incoming'}`;

    const checkIcon = isMine ? `
        <span class="msg-ticks ${msg.estado === 'leido' ? 'ticks-blue' : 'ticks-grey'}">
            <svg viewBox="0 0 16 15" width="16" height="15"><path fill="currentColor" d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-7.674a.418.418 0 0 0-.056-.586zm-4.74 3.398l-.478-.372a.365.365 0 0 0-.51.063L4.566 12.35a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.418.418 0 0 0 .006.586l2.885 5.186c.143.14.361.125.484-.033l2.844-4.24a.418.418 0 0 0-.062-.575z"></path></svg>
        </span>
    ` : '';

    div.innerHTML = `
        <div class="msg-content">${msg.contenido}</div>
        <div class="msg-meta">
            ${time}
            ${checkIcon}
        </div>
    `;

    messagesContainerEl.appendChild(div);
}

function scrollToBottom() {
    messagesContainerEl.scrollTop = messagesContainerEl.scrollHeight;
}

function setupEventListeners() {
    // Search
    searchInputEl.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase();
        // Simple filtering (Visual only for now)
        document.querySelectorAll('.contact-item').forEach(el => {
            const name = el.querySelector('.contact-name').textContent.toLowerCase();
            el.style.display = name.includes(val) ? 'flex' : 'none';
        });
    });

    // Send Input Keys
    messageInputEl.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    btnSendEl.addEventListener('click', sendMessage);
}

function formatTime(date) {
    // If today, show time. If yesterday, show 'Ayer'. Else date.
    const now = new Date();
    const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();

    if (isToday) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
}

function getRandomColor(str) {
    const list = ['#00a884', '#1f7aec', '#d4493a', '#792e86', '#cc9c00', '#007a5a'];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return list[Math.abs(hash) % list.length];
}

function playSoundNotification() {
    // Optional: Add a simple beep
}

// Start
init();
