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
    let query = supabase
        .from('conversaciones')
        .select(`
      *,
      clientes (*)
    `)
        .order('created_at', { ascending: false });

    if (clienteId) {
        query = query.eq('cliente_id', clienteId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
}

export async function obtenerConversacionPorId(conversacionId) {
    const { data, error } = await supabase
        .from('conversaciones')
        .select(`
      *,
      clientes (*)
    `)
        .eq('id', conversacionId)
        .single();

    if (error) throw error;
    return data;
}

export async function actualizarConversacion(conversacionId, updates) {
    const { data, error } = await supabase
        .from('conversaciones')
        .update(updates)
        .eq('id', conversacionId)
        .select();

    if (error) throw error;
    return data;
}

export async function eliminarConversacion(conversacionId) {
    const { error } = await supabase
        .from('conversaciones')
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
// Funciones de Embudo de Ventas
// ============================================

export async function obtenerEmbudo() {
    const { data, error } = await supabase
        .from('embudo_ventas')
        .select(`
      *,
      clientes (*)
    `)
        .order('fecha_proximo_mensaje', { ascending: true });

    if (error) throw error;
    return data;
}

export async function programarSeguimiento(clienteId, intencion, fechaProgramada) {
    const { data, error } = await supabase
        .from('embudo_ventas')
        .insert([{
            cliente_id: clienteId,
            etapa: intencion,
            fecha_proximo_mensaje: fechaProgramada,
            mensaje_enviado: false
        }])
        .select(`
            *,
            clientes (*)
        `)
        .single();

    if (error) throw error;
    return data;
}

export async function eliminarSeguimiento(id) {
    const { error } = await supabase
        .from('embudo_ventas')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// ============================================
// Funciones de Productos
// ============================================

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

export default supabase;
