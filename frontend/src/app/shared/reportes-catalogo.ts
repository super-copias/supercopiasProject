/**
 * Catálogo de reportes del módulo de Reportes - SuperCopias
 * Los ids deben coincidir con backend/utils/reportesCatalogo.js
 */

export interface ReporteCatalogo {
  id: string;
  titulo: string;
  descripcion: string;
  categoria: string;
  icono: string;
}

export const REPORTES: ReporteCatalogo[] = [
  { id: 'ventas',      titulo: 'Ventas por Período',          descripcion: 'Lista de ventas con filtros de fecha, vendedor, cliente y método de pago.', categoria: 'Ventas',     icono: 'fas fa-cash-register' },
  { id: 'corte-caja',  titulo: 'Corte de Caja',               descripcion: 'Dinero cobrado por método de pago para cuadrar caja, por rango de fechas y turno.', categoria: 'Ventas',     icono: 'fas fa-coins' },
  { id: 'productos',   titulo: 'Productos Más Vendidos',       descripcion: 'Ranking de productos, servicios e ítems libres por cantidad vendida y monto generado, filtrable por departamento.', categoria: 'Ventas',     icono: 'fas fa-star' },
  { id: 'vendedores',  titulo: 'Ventas por Vendedor',          descripcion: 'Ranking de usuarios con total de ventas, ingresos, clientes atendidos y producto top.', categoria: 'Ventas', icono: 'fas fa-user-tie' },
  { id: 'clientes',    titulo: 'Compras por Cliente',          descripcion: 'Top de clientes por dinero comprado, número de compras o puntos, con totales del periodo.', categoria: 'Clientes',   icono: 'fas fa-users' },
  { id: 'inventario',  titulo: 'Inventario Actual',            descripcion: 'Stock actual con nivel de riesgo, costos y precios de venta.', categoria: 'Inventario', icono: 'fas fa-boxes' },
  { id: 'movimientos', titulo: 'Movimientos de Inventario',    descripcion: 'Entradas, salidas y ajustes de stock por período.', categoria: 'Inventario', icono: 'fas fa-exchange-alt' },
  { id: 'bitacora',    titulo: 'Bitácora del Sistema',         descripcion: 'Registro de todas las acciones críticas del sistema.', categoria: 'Auditoría', icono: 'fas fa-history' },
  { id: 'auditoria',   titulo: 'Bitácora de Auditoría',       descripcion: 'Log de cambios en BD: inserciones, actualizaciones y eliminaciones por tabla.', categoria: 'Auditoría', icono: 'fas fa-database' },
];
