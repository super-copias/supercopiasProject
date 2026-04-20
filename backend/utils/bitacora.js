/**
 * Utilidad: Bitácora de Negocio
 * Inserta eventos semánticos en `bitacora_negocio` de forma no bloqueante.
 * Se llama desde los controladores después de confirmar cada operación.
 *
 * Módulos y acciones definidos:
 *   auth       : LOGIN_EXITOSO, LOGIN_FALLIDO, CUENTA_DESACTIVADA, LOGOUT
 *   pos        : VENTA_COMPLETADA, VENTA_CANCELADA, PRECIO_MANIPULADO
 *   pedidos    : PEDIDO_CREADO, PEDIDO_TOMADO, PEDIDO_TERMINADO,
 *                PEDIDO_ENTREGADO, PEDIDO_CANCELADO
 *   inventarios: AJUSTE_STOCK, ENTRADA_STOCK, SALIDA_STOCK, ARTICULO_CREADO,
 *                ARTICULO_ARCHIVADO
 *   clientes   : NIVEL_ASCENDIDO, PUNTOS_CANJEADOS
 */

const { pool: getPool } = require('../config/database');

/**
 * @param {object} params
 * @param {string}  params.modulo       - 'pos' | 'pedidos' | 'inventarios' | 'auth' | ...
 * @param {string}  params.accion       - Código de acción en UPPER_SNAKE_CASE
 * @param {string}  [params.entidad]    - Nombre de la tabla afectada
 * @param {string}  [params.entidadId]  - ID o folio del registro
 * @param {number}  [params.usuarioId]  - ID del usuario que ejecutó la acción
 * @param {string}  [params.usuarioNombre]
 * @param {string}  [params.ip]         - IP del cliente
 * @param {object}  [params.detalle]    - JSON con contexto adicional
 * @param {string}  [params.resultado]  - 'exito' (default) | 'error' | 'bloqueado'
 */
function registrarBitacora({
  modulo,
  accion,
  entidad    = null,
  entidadId  = null,
  usuarioId  = null,
  usuarioNombre = null,
  ip         = null,
  detalle    = null,
  resultado  = 'exito',
}) {
  // No bloqueante: los errores se loguean pero nunca rompen la operación principal
  getPool().query(
    `INSERT INTO bitacora_negocio
       (modulo, accion, entidad, entidad_id, usuario_id, usuario_nombre, ip_address, detalle, resultado)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      modulo,
      accion,
      entidad   || null,
      entidadId !== null && entidadId !== undefined ? String(entidadId) : null,
      usuarioId || null,
      usuarioNombre || null,
      ip        || null,
      detalle   ? JSON.stringify(detalle) : null,
      resultado,
    ]
  ).catch(err => console.error('[Bitácora] Error al registrar evento:', err.message));
}

/**
 * Extrae la IP del request con soporte para proxies
 */
function getIp(req) {
  return (req?.headers?.['x-forwarded-for'] || '').split(',')[0].trim()
    || req?.socket?.remoteAddress
    || null;
}

module.exports = { registrarBitacora, getIp };
