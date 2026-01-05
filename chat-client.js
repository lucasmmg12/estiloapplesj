
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
let contactsMap = new Map(); // phone -> { lastMessage, timestamp, unreadCount, avatar, name, isFavorite }

// DOM Elements
const contactsListEl = document.getElementById('contactsList');
const chatAreaEl = document.getElementById('chatArea');
const emptyStateEl = document.getElementById('emptyState');
const activeChatEl = document.getElementById('activeChat');
const messagesContainerEl = document.getElementById('messagesContainer');
const chatHeaderNameEl = document.getElementById('chatHeaderName');
const chatHeaderStatusEl = document.getElementById('chatHeaderStatus');
const chatHeaderAvatarEl = document.getElementById('chatHeaderAvatar');
const messageInputEl = document.getElementById('messageInput');
const btnSendEl = document.getElementById('btnSend');
const searchInputEl = document.getElementById('searchInput');
const emojiBtn = document.getElementById('emojiBtn');
const emojiPickerContainer = document.getElementById('emojiPickerContainer');
const emojiPicker = document.querySelector('emoji-picker');

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
            <p style="color:var(--text-dim); margin-top:10px;">Iniciando sistema...</p>
        </div>
    `;

    try {
        // 1. Obtener mensajes recientes (agrupación simulada por orden)
        const { data: messages, error: msgError } = await supabase
            .from('mensajes')
            .select('*')
            .order('created_at', { ascending: false });

        if (msgError) throw msgError;

        // 2. Obtener metadatos de contactos (nombres, favoritos)
        const { data: contactsData, error: contactsError } = await supabase
            .from('contactos')
            .select('*');

        // Si la tabla no existe aún, ignoramos el error silenciosamente o usamos array vacío
        const savedContacts = contactsData || [];

        contactsMap.clear();

        // Agrupar por teléfono
        messages.forEach(msg => {
            if (!contactsMap.has(msg.cliente_telefono)) {
                // Buscar si existe info guardada
                const saved = savedContacts.find(c => c.telefono === msg.cliente_telefono);

                contactsMap.set(msg.cliente_telefono, {
                    phone: msg.cliente_telefono,
                    lastMessage: (msg.es_mio ? 'Tú: ' : '') + (msg.contenido || 'Archivo multimedia'),
                    timestamp: new Date(msg.created_at),
                    unreadCount: 0,
                    avatar: saved ? (saved.avatar_url || 'public/logogrow.png') : 'public/logogrow.png',
                    name: saved ? saved.nombre : null,
                    isFavorite: saved ? saved.es_favorito : false,
                    email: saved ? saved.email : null,
                    device: saved ? saved.modelo_dispositivo : null,
                    interest: saved ? saved.interes : null,
                    notes: saved ? saved.notas : null,
                    seller: saved ? saved.vendedor_asignado : null
                });
            }
        });

        renderContacts();

    } catch (err) {
        console.error('Error cargando contactos:', err);
        // Fallback si falla la carga de contactos (ej. tabla no creada)
        renderContacts();
    }
}

function renderContacts() {
    let sortedContacts = Array.from(contactsMap.values());

    // Filtrar / Ordenar
    // Prioridad: Favoritos primero, luego fecha descendente
    sortedContacts.sort((a, b) => {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        return b.timestamp - a.timestamp;
    });

    contactsListEl.innerHTML = '';

    if (sortedContacts.length === 0) {
        contactsListEl.innerHTML = `<p style="padding:20px; color:var(--text-secondary); text-align:center;">No hay mensajes aún.</p>`;
        return;
    }

    sortedContacts.forEach(contact => {
        const isActive = activeChatPhone === contact.phone ? 'active' : '';
        const timeStr = formatTime(contact.timestamp);
        const displayName = contact.name || contact.phone;
        const favIcon = contact.isFavorite ? '⭐' : '';

        // Determinar qué avatar mostrar
        const avatarHtml = getAvatarHtml(contact);

        const html = `
            <div class="contact-item ${isActive}" onclick="window.openChat('${contact.phone}')">
                <div class="contact-avatar">
                   ${avatarHtml}
                </div>
                <div class="contact-info">
                    <div class="contact-top-row">
                        <span class="contact-name">
                            ${favIcon} ${displayName}
                        </span>
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

function getAvatarHtml(contact) {
    if (contact.avatar && contact.avatar !== 'public/logogrow.png' && contact.avatar.startsWith('http')) {
        return `<img src="${contact.avatar}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover;">`;
    }

    // Generar avatar por iniciales
    const name = contact.name || contact.phone || '?';
    const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const bgColor = getRandomColor(contact.phone || 'root');

    return `
        <div style="
            width: 100%; 
            height: 100%; 
            background: ${bgColor}; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            color: #fff; 
            font-family: 'Montserrat', sans-serif; 
            font-size: 14px; 
            font-weight: 700;
            letter-spacing: -0.5px;
        ">
            ${initials}
        </div>
    `;
}

// Function attached to window for HTML access
window.openChat = async (phone) => {
    activeChatPhone = phone;

    // Update UI active state
    document.querySelectorAll('.contact-item').forEach(el => el.classList.remove('active'));
    renderContacts();

    // Show Chat Area
    emptyStateEl.style.display = 'none';
    activeChatEl.style.display = 'flex';

    const contact = contactsMap.get(phone);
    const displayName = contact ? (contact.name || contact.phone) : phone;

    // Header Info
    chatHeaderNameEl.innerText = displayName;
    chatHeaderStatusEl.innerText = 'en línea';

    // Avatar Dinámico
    chatHeaderAvatarEl.innerHTML = getAvatarHtml(contact);

    // Header Actions Update
    const actionsContainer = document.querySelector('.chat-header .header-actions');
    const isFav = contact && contact.isFavorite;

    actionsContainer.innerHTML = `
        <button class="icon-btn" title="${isFav ? 'Quitar Favorito' : 'Marcar Favorito'}" onclick="toggleFavorite('${phone}')">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="${isFav ? 'var(--primary-green)' : 'currentColor'}">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
            </svg>
        </button>
        <button class="icon-btn" title="Opciones" onclick="openEditModal('${phone}')">
             <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
            </svg>
        </button>
    `;

    // Load Messages
    messagesContainerEl.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-dim);">Sincronizando mensajes...</div>';

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
// CONTACT ACTIONS (Edit Name, Favorite)
// ============================================

window.openEditModal = (phone) => {
    const contact = contactsMap.get(phone);
    if (!contact) return;

    // Populate Form
    document.getElementById('editPhone').value = phone;
    document.getElementById('editName').value = contact.name || '';

    // Si tenemos datos extra guardados en la map (implementar esto en loadContacts si es necesario), los cargamos.
    // Como loadContacts hace select * deberiamos tenerlos si existen en el objeto contact.
    // Vamos a asegurar que loadContacts mapee estos campos nuevos.
    document.getElementById('editEmail').value = contact.email || '';
    document.getElementById('editDevice').value = contact.device || '';
    document.getElementById('editInterest').value = contact.interest || '';
    document.getElementById('editNotes').value = contact.notes || '';
    const seller = contact.seller || 'Sin Asignar';
    document.getElementById('editSeller').value = seller;

    // Highlight active seller button
    document.querySelectorAll('.seller-btn').forEach(btn => {
        if (btn.dataset.seller === seller) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    document.getElementById('editAvatar').value = contact.avatar && contact.avatar !== 'public/logogrow.png' ? contact.avatar : '';

    // Show Modal
    document.getElementById('editClientModal').style.display = 'flex';
};

window.closeEditModal = () => {
    document.getElementById('editClientModal').style.display = 'none';
};

// Handle Form Submit
const editClientForm = document.getElementById('editClientForm');
if (editClientForm) { // Check if exists (it should now)
    editClientForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const phone = document.getElementById('editPhone').value;
        const name = document.getElementById('editName').value;
        const email = document.getElementById('editEmail').value;
        const device = document.getElementById('editDevice').value;
        const interest = document.getElementById('editInterest').value;
        const notes = document.getElementById('editNotes').value;
        const seller = document.getElementById('editSeller').value;
        const avatar = document.getElementById('editAvatar').value;

        // 1. Update Map (Optimistic)
        const contact = contactsMap.get(phone);
        if (contact) {
            contact.name = name;
            contact.email = email;
            contact.device = device;
            contact.interest = interest;
            contact.notes = notes;
            contact.seller = seller;
            contact.avatar = avatar || 'public/logogrow.png';
        }

        renderContacts();
        if (activeChatPhone === phone) {
            chatHeaderNameEl.innerText = name || phone;
            chatHeaderAvatarEl.innerHTML = getAvatarHtml(contact);
        }

        closeEditModal();

        // 2. Save to Supabase
        await saveContactMetadata(phone, {
            nombre: name,
            email: email,
            modelo_dispositivo: device,
            interes: interest,
            notas: notes,
            vendedor_asignado: seller,
            avatar_url: avatar
        });
    });
}

window.toggleFavorite = async (phone) => {
    const contact = contactsMap.get(phone);
    if (!contact) return;

    // Optimistic
    contact.isFavorite = !contact.isFavorite;
    renderContacts(); // Re-sorts list automatically

    // Update active chat header icon
    if (activeChatPhone === phone) {
        window.openChat(phone); // Reload header mainly
    }

    // Save
    await saveContactMetadata(phone, { es_favorito: contact.isFavorite });
};

async function saveContactMetadata(phone, updates) {
    try {
        console.log('Intentando guardar metadatos para:', phone, updates);

        const { error } = await supabase
            .from('contactos')
            .upsert({
                telefono: phone,
                ...updates
            }, { onConflict: 'telefono' });

        if (error) {
            console.error('Error detallado de Supabase:', error);
            throw error;
        }

        console.log('Contacto actualizado exitosamente:', phone);

    } catch (err) {
        console.error('Error excepcional guardando contacto:', err);
        alert('Error al guardar en base de datos: ' + (err.message || 'Error desconocido') + '. Revisa si las columnas nuevas existen en Supabase.');
    }
}

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
    div.className = `message ${isMine ? 'sent' : 'received'}`;

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

    // Emoji Picker Logic
    if (emojiBtn && emojiPickerContainer) {
        emojiBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = emojiPickerContainer.style.display === 'none';
            emojiPickerContainer.style.display = isHidden ? 'block' : 'none';
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!emojiPickerContainer.contains(e.target) && e.target !== emojiBtn) {
                emojiPickerContainer.style.display = 'none';
            }
        });
    }

    if (emojiPicker) {
        emojiPicker.addEventListener('emoji-click', (event) => {
            const emoji = event.detail.unicode;
            messageInputEl.value += emoji;
            messageInputEl.focus();
        });
    }

    // Seller Buttons Logic
    document.querySelectorAll('.seller-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.seller-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('editSeller').value = btn.dataset.seller;
        });
    });
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
