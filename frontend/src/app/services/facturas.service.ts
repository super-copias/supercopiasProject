import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// ── Interfaces ───────────────────────────────────────────────────────────────

export interface ImpuestoTasa {
  id: number;
  nombre: string;
  tipo: 'iva' | 'isr_retencion';
  porcentaje: number;
  activo: boolean;
  fecha_modificacion: string;
}

export interface CalculoImpuestos {
  subtotal: number;
  iva_pct: number;
  iva_monto: number;
  isr_pct: number;
  isr_monto: number;
  total: number;
}

export interface FacturaResumen {
  id: number;
  folio: string;
  estatus: 'pendiente' | 'generada' | 'cancelada';
  tipo_origen: 'venta' | 'pedido' | 'cotizacion';
  venta_id?: number;
  pedido_id?: number;
  cotizacion_id?: number;
  cliente_id: number;
  cliente_nombre: string;
  cliente_rfc: string;
  cliente_razon_social: string;
  subtotal: number;
  iva_pct: number;
  iva_monto: number;
  isr_pct: number;
  isr_monto: number;
  total_factura: number;
  uuid_cfdi?: string;
  pdf_url?: string;
  fecha_timbrado?: string;
  creado_por_nombre: string;
  notas?: string;
  fecha_creacion: string;
}

export interface FacturaDetalle extends FacturaResumen {
  cliente_regimen?: string;
  cliente_uso_cfdi?: string;
  cliente_cp?: string;
  xml_cfdi?: string;
  motivo_cancelacion?: string;
  venta_folio?: string;
  pedido_folio?: string;
  cotizacion_folio?: string;
}

export interface FiltrosFacturas {
  estatus?: string;
  tipo_origen?: string;
  cliente_id?: number;
  folio?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  page?: number;
  limit?: number;
}

export interface CreateFacturaPayload {
  tipo_origen: 'venta' | 'pedido' | 'cotizacion';
  venta_id?: number;
  pedido_id?: number;
  cotizacion_id?: number;
  cliente_id: number;
  subtotal: number;
  notas?: string;
}

// ── Servicio ─────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class FacturasService {

  private baseUrl = `${environment.apiUrl}/facturas`;

  constructor(private http: HttpClient) {}

  // ── Impuestos ──────────────────────────────────────────────────────────────

  getTasas(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/impuestos`);
  }

  calcularImpuestos(subtotal: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/calcular`, {
      params: new HttpParams().set('subtotal', subtotal.toString()),
    });
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────

  listFacturas(filtros?: FiltrosFacturas): Observable<any> {
    let p = new HttpParams();
    if (filtros?.estatus)      p = p.set('estatus',      filtros.estatus);
    if (filtros?.tipo_origen)  p = p.set('tipo_origen',  filtros.tipo_origen);
    if (filtros?.cliente_id)   p = p.set('cliente_id',   filtros.cliente_id.toString());
    if (filtros?.folio)        p = p.set('folio',        filtros.folio);
    if (filtros?.fecha_inicio) p = p.set('fecha_inicio', filtros.fecha_inicio);
    if (filtros?.fecha_fin)    p = p.set('fecha_fin',    filtros.fecha_fin);
    if (filtros?.page)         p = p.set('page',         filtros.page.toString());
    if (filtros?.limit)        p = p.set('limit',        filtros.limit.toString());
    return this.http.get<any>(this.baseUrl, { params: p });
  }

  getFactura(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${id}`);
  }

  createFactura(payload: CreateFacturaPayload): Observable<any> {
    return this.http.post<any>(this.baseUrl, payload);
  }

  marcarGenerada(id: number): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/${id}/generar`, {});
  }

  cancelarFactura(id: number, motivo: string): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/${id}/cancelar`, { motivo });
  }
}
