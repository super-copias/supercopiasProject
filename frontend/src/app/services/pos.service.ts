import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { TabuladorFila } from './inventarios.service';

export { TabuladorFila };

// ── Interfaces ─────────────────────────────────────────────────────────────

export interface CatalogoItem {
  id: number;
  nombre: string;
  descripcion?: string;
  tipo: 'venta' | 'insumo' | 'generico';
  es_servicio: boolean;
  sku?: string;
  precio_venta: number;
  existencia_actual: number;
  unidad_medida?: string;
  foto_url?: string;
  departamento_nombre?: string;
  departamento_color?: string;
  departamento_id?: number;
  nivel_stock: 'ok' | 'bajo' | 'critico' | 'sin_stock' | 'servicio';
  veces_vendido?: number;
  tabulador_activo?: boolean;
  tabulador?: TabuladorFila[];
}

export interface LineaCarrito {
  // Si es producto de inventario
  inventario_id?: number;
  // Datos del item
  nombre_producto: string;
  sku?: string;
  es_servicio: boolean;
  es_item_libre: boolean;
  cantidad: number;
  precio_unitario: number;
  descuento_linea_pct: number;
  descuento_linea_monto: number;
  subtotal_linea: number;
  // Para UI (no se envía al backend)
  _foto_url?: string;
  _nivel_stock?: string;
  _existencia_actual?: number;
  _id_ui?: string;
  _precio_base?: number;          // precio_venta original antes del tabulador
  _tabulador?: TabuladorFila[];   // filas del tabulador para recalcular al cambiar cantidad
  _tabulador_activo?: boolean;
}

export interface VentaPayload {
  cliente_id?: number | null;
  items: Omit<LineaCarrito, '_foto_url' | '_nivel_stock' | '_existencia_actual' | '_id_ui' | '_precio_base' | '_tabulador' | '_tabulador_activo'>[];
  metodo_pago_codigo: string;
  metodo_pago_descripcion?: string;
  monto_recibido?: number | null;
  descuento_pct?: number;
  descuento_config_id?: number | null;
  descuento_autorizado_por?: string | null;
  notas?: string;
  requiere_factura?: boolean;
}

export interface VentaDetalle {
  id: number;
  folio: string;
  fecha_venta: string;
  cliente_id?: number;
  cliente_nombre: string;
  cliente_nombre_comercial?: string;
  cliente_rfc?: string;
  cliente_email?: string;
  vendedor_nombre: string;
  subtotal: number;
  descuento_pct: number;
  descuento_monto: number;
  total: number;
  monto_recibido?: number;
  cambio: number;
  metodo_pago_codigo: string;
  metodo_pago_descripcion?: string;
  estatus: 'completada' | 'cancelada' | 'devuelta';
  notas?: string;
  ticket_generado: boolean;
  fecha_modificacion: string;
  detalle: LineaDetalle[];
  puntos_cliente?: PuntosCliente;
}

export interface LineaDetalle {
  id: number;
  venta_id: number;
  inventario_id?: number;
  nombre_producto: string;
  sku?: string;
  es_servicio: boolean;
  es_item_libre: boolean;
  cantidad: number;
  precio_unitario: number;
  descuento_linea_pct: number;
  descuento_linea_monto: number;
  subtotal_linea: number;
  tabulador_aplicado?: boolean;
}

export interface PuntosCliente {
  puntos_acumulados: number;
  puntos_disponibles: number;
  nivel_cliente: 'estandar' | 'frecuente' | 'vip';
  total_comprado: number;
  fecha_ultima_compra?: string;
}

export interface ClientePuntos {
  cliente: {
    id: number;
    nombre: string;
    email?: string;
    telefono?: string;
  };
  puntos: PuntosCliente;
  ultimas_compras: {
    id: number;
    folio: string;
    fecha_venta: string;
    total: number;
    estatus: string;
  }[];
}

export interface Descuento {
  id: number;
  nombre: string;
  descripcion?: string;
  tipo: 'porcentaje_global' | 'monto_fijo' | 'vip_automatico' | 'cupon';
  valor: number;
  requiere_autorizacion: boolean;
  limite_porcentaje_cajero: number;
  activo: boolean;
}

export interface StatsHoy {
  total_ventas: number;
  total_ingresos: number;
  ticket_promedio: number;
  ventas_canceladas: number;
  pagos_efectivo: number;
  pagos_tarjeta: number;
  pagos_transferencia: number;
}

export interface CotizacionPayload {
  cliente_id?: number | null;
  items: Omit<LineaCarrito, '_foto_url' | '_nivel_stock' | '_existencia_actual' | '_id_ui'>[];
  descuento_pct?: number;
  notas?: string;
  fecha_vencimiento?: string | null;
  requiere_factura?: boolean;
}

export interface CotizacionLinea {
  id: number;
  cotizacion_id: number;
  inventario_id?: number;
  nombre_producto: string;
  sku?: string;
  es_servicio: boolean;
  es_item_libre: boolean;
  cantidad: number;
  precio_unitario: number;
  descuento_linea_pct: number;
  descuento_linea_monto: number;
  subtotal_linea: number;
}

export interface CotizacionDetalle {
  id: number;
  folio: string;
  estatus: 'pendiente' | 'aceptada' | 'rechazada' | 'vencida';
  cliente_id?: number;
  cliente_nombre: string;
  cliente_nombre_comercial?: string;
  vendedor_nombre?: string;
  subtotal: number;
  descuento_pct: number;
  descuento_monto: number;
  total: number;
  notas?: string;
  fecha_vencimiento?: string;
  venta_id?: number;
  fecha_creacion: string;
  fecha_modificacion: string;
  detalle: CotizacionLinea[];
}

export interface FiltrosCotizaciones {
  folio?: string;
  cliente_id?: number;
  estatus?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  page?: number;
  limit?: number;
}

export interface FiltrosVentas {
  fecha_inicio?: string;
  fecha_fin?: string;
  cliente_id?: number;
  vendedor_id?: number;
  estatus?: string;
  folio?: string;
  page?: number;
  limit?: number;
  pagina?: number;
  por_pagina?: number;
}

// ── Pedidos ─────────────────────────────────────────────────

export interface PedidoPayload {
  cliente_id?: number | null;
  cliente_nombre?: string;
  cliente_telefono?: string;
  via_whatsapp?: boolean;
  requiere_factura?: boolean;
  items: Omit<LineaCarrito, '_foto_url' | '_nivel_stock' | '_existencia_actual' | '_id_ui' | '_precio_base' | '_tabulador' | '_tabulador_activo'>[];
  descuento_pct?: number;
  descuento_config_id?: number | null;
  descuento_autorizado_por?: string | null;
  anticipo?: number;
  metodo_pago_anticipo?: string;
  fecha_acordada?: string | null;
  notas?: string;
}

export interface HistorialPedido {
  id: number;
  pedido_id: number;
  estatus_anterior: string | null;
  estatus_nuevo: string;
  usuario_id: number | null;
  usuario_nombre: string;
  notas: string | null;
  fecha: string;
}

export interface PedidoDetalle {
  id: number;
  folio: string;
  estatus: 'pendiente' | 'en_proceso' | 'terminado' | 'finalizado' | 'cancelado';
  cliente_id?: number;
  cliente_nombre: string;
  cliente_telefono?: string;
  via_whatsapp: boolean;
  requiere_factura: boolean;
  subtotal: number;
  descuento_pct: number;
  descuento_monto: number;
  total: number;
  anticipo: number;
  saldo_pendiente: number;
  metodo_pago_anticipo?: string;
  metodo_pago_saldo?: string;
  fecha_acordada?: string;
  notas?: string;
  creado_por_id?: number;
  creado_por_nombre: string;
  fecha_creacion: string;
  tomado_por_id?: number;
  tomado_por_nombre?: string;
  fecha_tomado?: string;
  terminado_por_id?: number;
  terminado_por_nombre?: string;
  fecha_terminado?: string;
  entregado_por_id?: number;
  entregado_por_nombre?: string;
  fecha_entregado?: string;
  motivo_cancelacion?: string;
  venta_id?: number;
  detalle: any[];
  historial: HistorialPedido[];
}

export interface FiltrosPedidos {
  estatus?: string;
  solo_activos?: boolean;
  busqueda?: string;
  cliente_id?: number;
  creado_por_id?: number;
  tomado_por_id?: number;
  folio?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  page?: number;
  limit?: number;
}

// ── Servicio ────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class PosService {

  private baseUrl = `${environment.apiUrl}/pos`;

  // ── Estado persistente del carrito (sobrevive navegación entre módulos) ──
  _carritoGuardado: LineaCarrito[] = [];
  _clienteGuardado: any = null;
  _descuentoPctGuardado = 0;
  _descuentoConfigIdGuardado: number | null = null;
  _descuentoAutorizadoPorGuardado: string | null = null;

  constructor(private http: HttpClient) {}

  // ── Catálogo ──────────────────────────────────────────────────

  getCatalogo(params?: { q?: string; departamento_id?: number }): Observable<any> {
    let httpParams = new HttpParams();
    if (params?.q)              httpParams = httpParams.set('q', params.q);
    if (params?.departamento_id) httpParams = httpParams.set('departamento_id', params.departamento_id.toString());
    return this.http.get<any>(`${this.baseUrl}/catalogo`, { params: httpParams });
  }

  // ── Descuentos ────────────────────────────────────────────────

  getDescuentos(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/descuentos`);
  }

  // ── Ventas ────────────────────────────────────────────────────

  createVenta(payload: VentaPayload): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/ventas`, payload);
  }

  listVentas(filtros?: FiltrosVentas): Observable<any> {
    let httpParams = new HttpParams();
    if (filtros?.fecha_inicio) httpParams = httpParams.set('fecha_inicio', filtros.fecha_inicio);
    if (filtros?.fecha_fin)    httpParams = httpParams.set('fecha_fin', filtros.fecha_fin);
    if (filtros?.cliente_id)   httpParams = httpParams.set('cliente_id', filtros.cliente_id.toString());
    if (filtros?.vendedor_id)  httpParams = httpParams.set('vendedor_id', filtros.vendedor_id.toString());
    if (filtros?.estatus)      httpParams = httpParams.set('estatus', filtros.estatus);
    if (filtros?.folio)        httpParams = httpParams.set('folio', filtros.folio);
    const page  = filtros?.page  ?? filtros?.pagina;
    const limit = filtros?.limit ?? filtros?.por_pagina;
    if (page)  httpParams = httpParams.set('page',  page.toString());
    if (limit) httpParams = httpParams.set('limit', limit.toString());
    return this.http.get<any>(`${this.baseUrl}/ventas`, { params: httpParams });
  }

  getVentaById(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/ventas/${id}`);
  }

  cancelarVenta(id: number, motivo: string): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/ventas/${id}/cancelar`, { motivo });
  }

  marcarTicketGenerado(id: number): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/ventas/${id}/ticket`, {});
  }

  // ── Estadísticas ──────────────────────────────────────────────

  getStatsHoy(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/stats/hoy`);
  }

  // ── Puntos Cliente ────────────────────────────────────────────

  getPuntosByCliente(clienteId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/clientes/${clienteId}/puntos`);
  }

  // ── Cotizaciones ──────────────────────────────────────────────

  createCotizacion(payload: CotizacionPayload): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/cotizaciones`, payload);
  }

  listCotizaciones(filtros?: FiltrosCotizaciones): Observable<any> {
    let p = new HttpParams();
    if (filtros?.folio)        p = p.set('folio', filtros.folio);
    if (filtros?.cliente_id)   p = p.set('cliente_id', filtros.cliente_id.toString());
    if (filtros?.estatus)      p = p.set('estatus', filtros.estatus);
    if (filtros?.fecha_inicio) p = p.set('fecha_inicio', filtros.fecha_inicio);
    if (filtros?.fecha_fin)    p = p.set('fecha_fin', filtros.fecha_fin);
    if (filtros?.page)         p = p.set('page', filtros.page.toString());
    if (filtros?.limit)        p = p.set('limit', filtros.limit.toString());
    return this.http.get<any>(`${this.baseUrl}/cotizaciones`, { params: p });
  }

  getCotizacionById(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/cotizaciones/${id}`);
  }

  updateEstatusCotizacion(id: number, estatus: 'rechazada' | 'vencida'): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/cotizaciones/${id}/estatus`, { estatus });
  }

  convertirCotizacion(id: number, metodoPago: string, metodoPagoDesc?: string, montoRecibido?: number | null, notas?: string, requiereFactura?: boolean, clienteFacturaId?: number | null): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/cotizaciones/${id}/convertir`, {
      metodo_pago_codigo: metodoPago,
      metodo_pago_descripcion: metodoPagoDesc || metodoPago,
      monto_recibido: montoRecibido || null,
      notas,
      requiere_factura: requiereFactura ?? false,
      cliente_factura_id: clienteFacturaId || null,
    });
  }

  // ── Helpers locales ───────────────────────────────────────────

  /**
   * Devuelve el precio efectivo según el tabulador dado una cantidad.
   * Si no hay tabulador activo o no aplica ningún tramo, devuelve precioBase.
   */
  resolverPrecioTabulador(cantidad: number, precioBase: number, tabulador: TabuladorFila[]): number {
    if (!tabulador || tabulador.length === 0) return precioBase;
    const ordenado = [...tabulador].sort((a, b) => a.cantidad_desde - b.cantidad_desde);
    let precioEfectivo = precioBase;
    for (const fila of ordenado) {
      if (cantidad >= fila.cantidad_desde) {
        precioEfectivo = fila.precio;
      } else {
        break;
      }
    }
    return precioEfectivo;
  }

  calcularSubtotalLinea(linea: Partial<LineaCarrito>): number {
    const base = (linea.cantidad || 0) * (linea.precio_unitario || 0);
    const desc = base * ((linea.descuento_linea_pct || 0) / 100);
    return parseFloat((base - desc).toFixed(2));
  }

  calcularTotalesCarrito(items: LineaCarrito[], descuentoGlobalPct: number): {
    subtotal: number; descuentoMonto: number; total: number;
  } {
    const subtotal     = parseFloat(items.reduce((s, i) => s + i.subtotal_linea, 0).toFixed(2));
    const descuentoMonto = parseFloat((subtotal * descuentoGlobalPct / 100).toFixed(2));
    const total        = parseFloat((subtotal - descuentoMonto).toFixed(2));
    return { subtotal, descuentoMonto, total };
  }

  formatFolio(folio: string): string {
    return folio || '';
  }

  // ── Pedidos ───────────────────────────────────────────────────

  createPedido(payload: PedidoPayload): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/pedidos`, payload);
  }

  listPedidos(filtros?: FiltrosPedidos): Observable<any> {
    let p = new HttpParams();
    if (filtros?.estatus)       p = p.set('estatus', filtros.estatus);
    if (filtros?.solo_activos)  p = p.set('solo_activos', 'true');
    if (filtros?.busqueda)      p = p.set('busqueda', filtros.busqueda);
    if (filtros?.cliente_id)    p = p.set('cliente_id', filtros.cliente_id.toString());
    if (filtros?.creado_por_id) p = p.set('creado_por_id', filtros.creado_por_id.toString());
    if (filtros?.tomado_por_id) p = p.set('tomado_por_id', filtros.tomado_por_id.toString());
    if (filtros?.folio)         p = p.set('folio', filtros.folio);
    if (filtros?.fecha_inicio)  p = p.set('fecha_inicio', filtros.fecha_inicio);
    if (filtros?.fecha_fin)     p = p.set('fecha_fin', filtros.fecha_fin);
    if (filtros?.page)          p = p.set('page', filtros.page.toString());
    if (filtros?.limit)         p = p.set('limit', filtros.limit.toString());
    return this.http.get<any>(`${this.baseUrl}/pedidos`, { params: p });
  }

  getPedidoById(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/pedidos/${id}`);
  }

  tomarPedido(id: number): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/pedidos/${id}/tomar`, {});
  }

  terminarPedido(id: number, notas?: string): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/pedidos/${id}/terminar`, { notas });
  }

  entregarPedido(id: number, metodoPagoSaldo: string, montoRecibidoSaldo?: number | null, notas?: string, requiereFactura?: boolean, clienteFacturaId?: number | null): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/pedidos/${id}/entregar`, {
      metodo_pago_saldo: metodoPagoSaldo,
      monto_recibido_saldo: montoRecibidoSaldo || null,
      notas,
      requiere_factura: requiereFactura || false,
      cliente_factura_id: clienteFacturaId || null,
    });
  }

  cancelarPedido(id: number, motivo?: string): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/pedidos/${id}/cancelar`, { motivo });
  }

  getStatsPedidos(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/pedidos/stats`);
  }
}
