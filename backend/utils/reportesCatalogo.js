/**
 * Catálogo de reportes del módulo de Reportes - SuperCopias
 * Los ids deben coincidir con los del frontend (shared/reportes-catalogo.ts)
 * y con las rutas de /api/reportes.
 */

const REPORTES_CATALOGO = [
  { id: 'ventas',      titulo: 'Ventas por Período',        categoria: 'Ventas' },
  { id: 'corte-caja',  titulo: 'Corte de Caja',             categoria: 'Ventas' },
  { id: 'productos',   titulo: 'Productos Más Vendidos',    categoria: 'Ventas' },
  { id: 'vendedores',  titulo: 'Ventas por Vendedor',       categoria: 'Ventas' },
  { id: 'clientes',    titulo: 'Compras por Cliente',       categoria: 'Clientes' },
  { id: 'inventario',  titulo: 'Inventario Actual',         categoria: 'Inventario' },
  { id: 'movimientos', titulo: 'Movimientos de Inventario', categoria: 'Inventario' },
  { id: 'bitacora',    titulo: 'Bitácora del Sistema',      categoria: 'Auditoría' },
  { id: 'auditoria',   titulo: 'Bitácora de Auditoría',     categoria: 'Auditoría' },
];

const REPORTES_IDS = REPORTES_CATALOGO.map(r => r.id);

/**
 * Normaliza la selección de reportes recibida del frontend.
 * - undefined/null → null (todos los reportes)
 * - Si incluye todos los reportes → null (así los reportes nuevos quedan habilitados)
 * Lanza Error con mensaje para el usuario si la selección es inválida.
 */
function normalizarReportesPermitidos(reportes) {
  if (reportes === undefined || reportes === null) return null;
  if (!Array.isArray(reportes)) {
    throw new Error('El formato de los reportes permitidos es inválido');
  }
  const unicos = [...new Set(reportes.map(r => String(r)))];
  const invalidos = unicos.filter(r => !REPORTES_IDS.includes(r));
  if (invalidos.length > 0) {
    throw new Error(`Reportes no válidos: ${invalidos.join(', ')}`);
  }
  if (unicos.length === 0) {
    throw new Error('Debe seleccionar al menos un reporte para el empleado');
  }
  if (REPORTES_IDS.every(id => unicos.includes(id))) return null;
  return unicos;
}

module.exports = { REPORTES_CATALOGO, REPORTES_IDS, normalizarReportesPermitidos };
