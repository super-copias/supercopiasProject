/**
 * Servicio de Reportes - SuperCopias
 *
 * Proporciona métodos para:
 *  - Obtener preview JSON de cada reporte
 *  - Descargar PDF o Excel de cada reporte
 *
 * Los métodos de descarga reciben los mismos parámetros que el preview
 * más el formato ('pdf' | 'xlsx') y devuelven un Observable<Blob>.
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type FormatoReporte = 'pdf' | 'xlsx';

export interface FiltrosVentas {
  desde?: string;
  hasta?: string;
  vendedor_id?: number | null;
  cliente_id?: number | null;
  metodo_pago?: string;
  estatus?: string;
}

export interface FiltrosCorteCaja {
  fecha?: string;
  vendedor_id?: number | null;
}

export interface FiltrosProductos {
  desde?: string;
  hasta?: string;
  top?: number;
}

export interface FiltrosClientes {
  desde?: string;
  hasta?: string;
  cliente_id?: number | null;
}

export interface FiltrosInventario {
  departamento_id?: number | null;
  nivel_stock?: string;
}

export interface FiltrosMovimientos {
  desde?: string;
  hasta?: string;
  tipo_movimiento?: string;
  inventario_id?: number | null;
}

export interface FiltrosBitacora {
  desde?: string;
  hasta?: string;
  modulo?: string;
  accion?: string;
  usuario_id?: number | null;
  resultado?: string;
}

export interface FiltrosVendedores {
  desde?: string;
  hasta?: string;
}

export interface FiltrosAuditoria {
  desde?: string;
  hasta?: string;
  tabla?: string;
  operacion?: string;
  usuario_id?: number | null;
}

@Injectable({ providedIn: 'root' })
export class ReportesService {
  private base = `${environment.apiUrl}/reportes`;

  constructor(private http: HttpClient) {}

  // ── Helpers ──────────────────────────────────────────────────

  private buildParams(filters: Record<string, any>, formato?: FormatoReporte): HttpParams {
    let params = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') {
        params = params.set(k, String(v));
      }
    });
    if (formato) params = params.set('formato', formato);
    return params;
  }

  /**
   * Descarga un archivo (PDF o Excel) como Blob.
   * Úsalo con saveBlob() en el componente para disparar la descarga.
   */
  private getBlob(url: string, params: HttpParams): Observable<HttpResponse<Blob>> {
    return this.http.get(url, {
      params,
      responseType: 'blob',
      observe: 'response'
    });
  }

  // ── Ventas ────────────────────────────────────────────────────

  previewVentas(f: FiltrosVentas): Observable<any> {
    return this.http.get(`${this.base}/ventas`, { params: this.buildParams(f) });
  }

  downloadVentas(f: FiltrosVentas, formato: FormatoReporte): Observable<HttpResponse<Blob>> {
    return this.getBlob(`${this.base}/ventas`, this.buildParams(f, formato));
  }

  // ── Corte de caja ─────────────────────────────────────────────

  previewCorteCaja(f: FiltrosCorteCaja): Observable<any> {
    return this.http.get(`${this.base}/corte-caja`, { params: this.buildParams(f) });
  }

  downloadCorteCaja(f: FiltrosCorteCaja, formato: FormatoReporte): Observable<HttpResponse<Blob>> {
    return this.getBlob(`${this.base}/corte-caja`, this.buildParams(f, formato));
  }

  // ── Productos más vendidos ────────────────────────────────────

  previewProductos(f: FiltrosProductos): Observable<any> {
    return this.http.get(`${this.base}/productos`, { params: this.buildParams(f) });
  }

  downloadProductos(f: FiltrosProductos, formato: FormatoReporte): Observable<HttpResponse<Blob>> {
    return this.getBlob(`${this.base}/productos`, this.buildParams(f, formato));
  }

  // ── Compras por cliente ───────────────────────────────────────

  previewClientes(f: FiltrosClientes): Observable<any> {
    return this.http.get(`${this.base}/clientes`, { params: this.buildParams(f) });
  }

  downloadClientes(f: FiltrosClientes, formato: FormatoReporte): Observable<HttpResponse<Blob>> {
    return this.getBlob(`${this.base}/clientes`, this.buildParams(f, formato));
  }

  // ── Inventario actual ─────────────────────────────────────────

  previewInventario(f: FiltrosInventario): Observable<any> {
    return this.http.get(`${this.base}/inventario`, { params: this.buildParams(f) });
  }

  downloadInventario(f: FiltrosInventario, formato: FormatoReporte): Observable<HttpResponse<Blob>> {
    return this.getBlob(`${this.base}/inventario`, this.buildParams(f, formato));
  }

  // ── Movimientos de inventario ─────────────────────────────────

  previewMovimientos(f: FiltrosMovimientos): Observable<any> {
    return this.http.get(`${this.base}/movimientos`, { params: this.buildParams(f) });
  }

  downloadMovimientos(f: FiltrosMovimientos, formato: FormatoReporte): Observable<HttpResponse<Blob>> {
    return this.getBlob(`${this.base}/movimientos`, this.buildParams(f, formato));
  }

  // ── Ventas por vendedor ──────────────────────────────────────

  previewVendedores(f: FiltrosVendedores): Observable<any> {
    return this.http.get(`${this.base}/vendedores`, { params: this.buildParams(f) });
  }

  downloadVendedores(f: FiltrosVendedores, formato: FormatoReporte): Observable<HttpResponse<Blob>> {
    return this.getBlob(`${this.base}/vendedores`, this.buildParams(f, formato));
  }

  // ── Bitácora ──────────────────────────────────────────────────

  previewBitacora(f: FiltrosBitacora): Observable<any> {
    return this.http.get(`${this.base}/bitacora`, { params: this.buildParams(f) });
  }

  downloadBitacora(f: FiltrosBitacora, formato: FormatoReporte): Observable<HttpResponse<Blob>> {
    return this.getBlob(`${this.base}/bitacora`, this.buildParams(f, formato));
  }
  // ── Auditoría (triggers BD) ───────────────────────

  previewAuditoria(f: FiltrosAuditoria): Observable<any> {
    return this.http.get(`${this.base}/auditoria`, { params: this.buildParams(f) });
  }

  downloadAuditoria(f: FiltrosAuditoria, formato: FormatoReporte): Observable<HttpResponse<Blob>> {
    return this.getBlob(`${this.base}/auditoria`, this.buildParams(f, formato));
  }}
