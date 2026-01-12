// ============================================
// SERVICIO: Cliente de Supabase
// ============================================

import CONFIG from '../config.js';

// Inicializar cliente de Supabase
const supabase = window.supabase.createClient(
    CONFIG.supabase.url,
    CONFIG.supabase.anonKey
);

// ============================================
// Funciones de Clientes
// ============================================

export async function obtenerClientes(filtros = {}) {
    let query = supabase
        .from('clientes')
        .select('*')
        .order('ultima_interaccion', { ascending: false });

    if (filtros.plataforma) {
        query = query.eq('plataforma', filtros.plataforma);
    }

    if (filtros.intencion) {
        query = query.eq('intencion', filtros.intencion);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
}

export async function obtenerClientePorId(clienteId) {
    const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', clienteId)
        .single();

    if (error) throw error;
    return data;
}

// ============================================
// Funciones de Conversaciones
// ============================================

export async function obtenerConversaciones(clienteId = null) {
    // NUEVA LOGICA: Usar 'clientes' como fuente de verdad
    let query = supabase
        .from('clientes')
        .select('*')
        .order('ultima_interaccion', { ascending: false });

    // Filtrado opcional
    if (clienteId) {
        query = query.eq('id', clienteId);
    }

    const { data: clientes, error } = await query;

    if (error) throw error;

    // Adaptador: Convertir clientes a objetos 'conversacion' para la UI
    return clientes.map(c => ({
        id: c.id,
        created_at: c.ultima_interaccion || c.created_at,
        cliente_id: c.id,
        clientes: c, // El objeto cliente completo
        // Campos que antes estaban en 'conversaciones', ahora intentamos leerlos del cliente
        // o proveemos fallbacks
        resumen_breve: c.resumen || c.notas_ia || "...",
        intencion_detectada: c.intencion || "Consulta",
        crm_stage: c.crm_stage || 'consulta',
        vendedor_asignado: c.vendedor_asignado,
        // Flags para UI
        no_leido: false
    }));
}

export async function obtenerConversacionPorId(conversacionId) {
    // Ahora 'conversacionId' es realmente el 'clienteId'
    const { data: cliente, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', conversacionId)
        .single();

    if (error) throw error;

    return {
        id: cliente.id,
        created_at: cliente.ultima_interaccion,
        clientes: cliente,
        resumen_breve: cliente.resumen,
        resumen_detallado: cliente.resumen_ia || cliente.resumen,
        intencion_detectada: cliente.intencion || "General",
        historial_completo: [] // La UI ya carga los mensajes de la tabla 'mensajes'
    };
}

export async function actualizarConversacion(conversacionId, updates) {
    // Actualizamos el CLIENTE
    const { data, error } = await supabase
        .from('clientes')
        .update(updates)
        .eq('id', conversacionId)
        .select();

    if (error) throw error;
    return data;
}

// ============================================
// Funciones de Historial de Chat
// ============================================

export async function obtenerHistorialMensajes(telefono) {
    // 1. Normalizar telefono para búsqueda exacta
    const telLimpio = telefono.replace(/\D/g, '');

    // Consulta a la tabla REAL de mensajes
    const { data, error } = await supabase
        .from('mensajes')
        .select('*')
        .eq('cliente_telefono', telLimpio)
        .order('created_at', { ascending: true });

    if (error) {
        console.warn("Error obteniendo historial de tabla 'mensajes':", error);
        return [];
    }
    return data;
}

// Relacionado con Conversaciones (recuperar resumen e intencion)
export async function eliminarConversacion(conversacionId) {
    // Eliminar (o ocultar) el cliente
    // ATENCION: Esto elimina al cliente de la base de datos.
    const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', conversacionId);

    if (error) throw error;
    return true;
}

// ============================================
// Funciones de Mensajes Automáticos
// ============================================

export async function obtenerMensajesAutomaticos() {
    const { data, error } = await supabase
        .from('mensajes_automaticos')
        .select('*')
        .order('intencion');

    if (error) throw error;
    return data;
}

export async function crearMensajeAutomatico(mensaje) {
    const { data, error } = await supabase
        .from('mensajes_automaticos')
        .insert(mensaje)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function actualizarMensajeAutomatico(id, cambios) {
    const { data, error } = await supabase
        .from('mensajes_automaticos')
        .update(cambios)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function eliminarMensajeAutomatico(id) {
    const { error } = await supabase
        .from('mensajes_automaticos')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// ============================================
// Funciones de Mensajes Programados (Persistencia Real)
// ============================================

export async function obtenerMensajesProgramados() {
    const { data, error } = await supabase
        .from('mensajes_programados')
        .select(`
            *,
            clientes (*),
            mensajes_automaticos:plantilla_id (*)
        `)
        .eq('enviado', false)
        .order('fecha_envio', { ascending: true });

    if (error) throw error;
    return data;
}

export async function programarNuevoMensaje(clienteId, plantillaId, tipoPlantilla, fechaEnvio) {
    const { data, error } = await supabase
        .from('mensajes_programados')
        .insert([{
            cliente_id: clienteId,
            plantilla_id: plantillaId,
            tipo_plantilla: tipoPlantilla,
            fecha_envio: fechaEnvio,
            enviado: false
        }])
        .select(`
            *,
            clientes (*)
        `)
        .single();

    if (error) throw error;
    return data;
}

export async function eliminarMensajeProgramado(id) {
    const { error } = await supabase
        .from('mensajes_programados')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// ============================================
// ============================================
// Funciones de Productos
// ============================================

export async function subirImagenProducto(file) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `fotos/${fileName}`;

    const { data, error } = await supabase.storage
        .from('productos')
        .upload(filePath, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
        .from('productos')
        .getPublicUrl(filePath);

    return publicUrl;
}

export async function eliminarImagenProducto(url) {
    if (!url) return;
    try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');
        const fileName = pathParts[pathParts.length - 1];

        await supabase.storage
            .from('productos')
            .remove([`fotos/${fileName}`]);
    } catch (e) {
        console.warn('No se pudo eliminar la imagen del storage:', e);
    }
}

export async function obtenerProductos(filtros = {}) {
    let query = supabase
        .from('productos')
        .select('*')
        .eq('activo', true)
        .order('modelo', { ascending: true });

    if (filtros.busqueda) {
        query = query.ilike('modelo', `%${filtros.busqueda}%`);
    }

    if (filtros.almacenamiento) {
        query = query.eq('almacenamiento', filtros.almacenamiento);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
}

export async function obtenerProductoPorId(productoId) {
    const { data, error } = await supabase
        .from('productos')
        .select('*')
        .eq('id', productoId)
        .single();

    if (error) throw error;
    return data;
}

export async function crearProducto(producto) {
    // Obtener cotización actual del dólar
    const cotizacion = await obtenerCotizacionDolar();
    const cotizacionDolar = cotizacion.valor;

    const precio_ars = producto.precio_usd * cotizacionDolar;
    const cuotas_3 = Math.round((precio_ars * 1.22) / 3 / 1000) * 1000;
    const cuotas_6 = Math.round((precio_ars * 1.33) / 6 / 1000) * 1000;
    const cuotas_12 = Math.round((precio_ars * 1.6) / 12);

    const productoCompleto = {
        ...producto,
        precio_ars,
        cuotas_3,
        cuotas_6,
        cuotas_12,
        cuotas_12,
        activo: true
    };

    const { data, error } = await supabase
        .from('productos')
        .insert([productoCompleto])
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function actualizarProducto(productoId, producto) {
    // Recalcular precios si cambió el precio USD
    if (producto.precio_usd) {
        const cotizacion = await obtenerCotizacionDolar();
        const cotizacionDolar = cotizacion.valor;

        const precio_ars = producto.precio_usd * cotizacionDolar;
        producto.precio_ars = precio_ars;
        producto.cuotas_3 = Math.round((precio_ars * 1.22) / 3 / 1000) * 1000;
        producto.cuotas_6 = Math.round((precio_ars * 1.33) / 6 / 1000) * 1000;
        producto.cuotas_12 = Math.round((precio_ars * 1.6) / 12);
    }

    const { data, error } = await supabase
        .from('productos')
        .update(producto)
        .eq('id', productoId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function eliminarProducto(productoId) {
    // Marcar como inactivo en lugar de eliminar
    const { data, error } = await supabase
        .from('productos')
        .update({ activo: false })
        .eq('id', productoId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

// ============================================
// Funciones de Cotización del Dólar
// ============================================

export async function obtenerCotizacionDolar() {
    const { data, error } = await supabase
        .from('cotizacion_dolar')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error) {
        // Si no hay cotización, retornar valor por defecto
        console.warn('No se encontró cotización del dólar, usando valor por defecto');
        return { valor: 1485.00, fuente: 'default' };
    }
    return data;
}

export async function actualizarCotizacionDolar(valor, fuente = 'manual', notas = null) {
    const { data, error } = await supabase
        .from('cotizacion_dolar')
        .insert([{
            valor: parseFloat(valor),
            fuente,
            notas
        }])
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function obtenerHistorialCotizacion(limite = 10) {
    const { data, error } = await supabase
        .from('cotizacion_dolar')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limite);

    if (error) throw error;
    return data;
}

export async function actualizarDolarAutomatico() {
    const { data, error } = await supabase.functions.invoke('actualizar-dolar');
    if (error) throw error;
    return data;
}

// ============================================
// Suscripciones en Tiempo Real
// ============================================

export function suscribirseAConversaciones(callback) {
    return supabase
        .channel('conversaciones-channel')
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'conversaciones' },
            callback
        )
        .subscribe();
}

export function suscribirseAClientes(callback) {
    return supabase
        .channel('clientes-channel')
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'clientes' },
            callback
        )
        .subscribe();
}

// ============================================
// Funciones de ERP & FINANZAS
// ============================================

export async function obtenerUltimasTransacciones(filtros = {}, page = 1, pageSize = 50) {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
        .from('transactions')
        .select(`
            *,
            transaction_categories (name, type),
            payment_methods (name)
        `, { count: 'exact' })
        .order('date', { ascending: false });

    if (filtros.fechaInicio) {
        query = query.gte('date', filtros.fechaInicio);
    }
    if (filtros.fechaFin) {
        query = query.lte('date', filtros.fechaFin);
    }

    const { data, compute, count, error } = await query.range(from, to);

    if (error) throw error;
    return { data, total: count };
}

export async function obtenerTransaccionPorId(id) {
    const { data, error } = await supabase
        .from('transactions')
        .select(`
            *,
            transaction_categories (name, type)
        `)
        .eq('id', id)
        .single();

    if (error) throw error;
    return data;
}

export async function actualizarTransaccion(id, cambios) {
    const { data, error } = await supabase
        .from('transactions')
        .update(cambios)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function crearTransaccion(transaccion) {
    // 1. Obtener cotización si no viene definida (o usar la del dia)
    if (!transaccion.exchange_rate) {
        const cotizacion = await obtenerCotizacionDolar();
        transaccion.exchange_rate = cotizacion.valor;
    }

    const { data, error } = await supabase
        .from('transactions')
        .insert([transaccion])
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function eliminarTransaccion(id) {
    const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

    if (error) throw error;
    return true;
}

export async function obtenerResumenFinanciero(fechaInicio, fechaFin) {
    // Esta función idealmente usaría una RPC en Supabase, pero por ahora sumamos en cliente
    // Traemos todas las transacciones del rango (cuidado con volumen alto)
    const { data, error } = await supabase
        .from('transactions')
        .select('amount, type, currency, exchange_rate, category_id, transaction_categories(type)')
        .gte('date', fechaInicio)
        .lte('date', fechaFin);

    if (error) throw error;
    return data;
}

export async function registrarMovimientoInventario(movimiento) {
    const { data, error } = await supabase
        .from('inventory_movements')
        .insert([movimiento])
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function obtenerCategoriasTransaccion() {
    // Cachear esto sería buena idea
    const { data, error } = await supabase
        .from('transaction_categories')
        .select('*')
        .order('name');

    if (error) throw error;
    return data;
}

export async function analizarHistorialIA(mensajes) {
    try {
        if (!mensajes || mensajes.length === 0) return null;

        // Formatear chat para la IA
        // Tomamos los últimos N mensajes para no exceder tokens
        const ultimosMensajes = mensajes.slice(-50);

        const chatLog = ultimosMensajes.map(m => {
            const role = m.es_mio ? 'Vendedor' : 'Cliente';
            // Manejo de contenido multimeda
            const texto = m.contenido || (m.media_url ? '[Imagen/Archivo]' : '[Mensaje vacío]');
            return `${role}: ${texto}`;
        }).join('\n');

        const { data, error } = await supabase.functions.invoke('analizar-historial', {
            body: { chatLog }
        });

        if (error) throw error;
        return data; // { resumen_breve, intencion, bullets, ... }
    } catch (e) {
        console.error("Error analizando historial con IA:", e);
        return null; // Fail gracefully
    }
}

export default supabase;
