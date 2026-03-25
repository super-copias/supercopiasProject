import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// ── Interfaces ──────────────────────────────────────────────────────────────

export interface TabuladorFila {
  id?: number;
  cantidad_desde: number;
  precio: number;
  orden?: number;
}

export interface Departamento {
  id?: number;
  nombre: string;
  descripcion?: string;
  color?: string;
  orden?: number;
  activo?: boolean;
  total_articulos?: number;
  costo_total?: number;
}

export interface Articulo {
  id?: number;
  nombre: string;
  descripcion?: string;
  tipo: 'venta' | 'insumo' | 'generico';
  es_servicio?: boolean;
  departamento_id?: number;
  departamento_nombre?: string;
  departamento_color?: string;
  codigo_sku?: string;
  marca?: string;
  modelo?: string;
  proveedor_id?: number;
  unidad_medida?: string;
  existencia_actual?: number;
  stock_minimo?: number;
  stock_maximo?: number;
  costo_compra?: number;
  precio_venta?: number;
  disponible_en_pos?: boolean;
  tabulador_activo?: boolean;
  tabulador?: TabuladorFila[];
  ubicacion_fisica?: string;
  archivado?: boolean;
  nivel_stock?: 'ok' | 'bajo' | 'critico' | 'sin_stock' | 'servicio';
  created_at?: string;
  updated_at?: string;
}

export interface DepartamentoConArticulos extends Departamento {
  articulos: Articulo[];
}

export interface Movimiento {
  id?: number;
  inventario_id: number;
  tipo_movimiento: 'entrada' | 'salida' | 'ajuste' | 'transferencia';
  concepto: string;
  cantidad: number;
  existencia_antes?: number;
  existencia_despues?: number;
  costo_unitario?: number;
  referencia?: string;
  notas?: string;
  usuario_nombre?: string;
  created_at?: string;
}

export interface EstadisticasInventario {
  total_articulos: number;
  total_servicios?: number;
  alertas_criticas: number;
  alertas_bajas: number;
  valor_total_inventario: number;
  articulos_sin_departamento?: number;
  total_departamentos?: number;
}

// Legacy (para compatibilidad con componentes no migrados aún)
export interface Inventario extends Articulo {
  caracteristicas?: any;
}
export interface Categoria { id?: number; nombre: string; descripcion?: string; }

@Injectable({ providedIn: 'root' })
export class InventariosService {

  private baseUrl = `${environment.apiUrl}/inventarios`;

  constructor(private http: HttpClient) {}

  // ── Departamentos ──────────────────────────────────────────────────────────

  getDepartamentos(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/departamentos`);
  }

  createDepartamento(data: Partial<Departamento>): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/departamentos`, data);
  }

  updateDepartamento(id: number, data: Partial<Departamento>): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/departamentos/${id}`, data);
  }

  deleteDepartamento(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/departamentos/${id}`);
  }

  // ── Artículos por departamento (acordeón) ──────────────────────────────────

  getInventariosPorDepartamento(params?: any): Observable<any> {
    let p = new HttpParams();
    if (params) Object.keys(params).forEach(k => { if (params[k] !== undefined && params[k] !== '') p = p.set(k, params[k]); });
    return this.http.get<any>(`${this.baseUrl}/por-departamento`, { params: p });
  }

  // ── Artículos (lista / búsqueda) ───────────────────────────────────────────

  getInventarios(params?: any): Observable<any> {
    let p = new HttpParams();
    if (params) Object.keys(params).forEach(k => { if (params[k] !== undefined && params[k] !== '') p = p.set(k, params[k]); });
    return this.http.get<any>(this.baseUrl, { params: p });
  }

  getInventarioById(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${id}`);
  }

  createInventario(data: Partial<Articulo>): Observable<any> {
    return this.http.post<any>(this.baseUrl, data);
  }

  updateInventario(id: number, data: Partial<Articulo>): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${id}`, data);
  }

  deleteInventario(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${id}`);
  }

  archivarInventario(id: number, archivado: boolean): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${id}/archivar`, { archivado });
  }

  // ── Tabulador de precios por volumen ────────────────────────────────────────

  getTabulador(inventarioId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${inventarioId}/tabulador`);
  }

  saveTabulador(inventarioId: number, filas: TabuladorFila[]): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/${inventarioId}/tabulador`, { filas });
  }

  // ── Movimientos ────────────────────────────────────────────────────────────

  addMovimiento(inventarioId: number, data: Partial<Movimiento>): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/${inventarioId}/movimientos`, data);
  }

  getMovimientos(inventarioId: number, params?: any): Observable<any> {
    let p = new HttpParams();
    if (params) Object.keys(params).forEach(k => { if (params[k] !== undefined && params[k] !== '') p = p.set(k, params[k]); });
    return this.http.get<any>(`${this.baseUrl}/${inventarioId}/movimientos`, { params: p });
  }

  getHistorialGlobal(params?: any): Observable<any> {
    let p = new HttpParams();
    if (params) Object.keys(params).forEach(k => { if (params[k] !== undefined && params[k] !== '') p = p.set(k, params[k]); });
    return this.http.get<any>(`${this.baseUrl}/movimientos/historial`, { params: p });
  }

  // ── Stats y alertas ────────────────────────────────────────────────────────

  getEstadisticas(): Observable<any> { return this.http.get<any>(`${this.baseUrl}/stats`); }
  getAlertas(): Observable<any> { return this.http.get<any>(`${this.baseUrl}/alertas`); }
  getCatalogoPos(): Observable<any> { return this.http.get<any>(`${this.baseUrl}/catalogo-pos`); }

  // Alias para compatibilidad
  getStats(): Observable<any> { return this.getEstadisticas(); }

  // ── Helpers de presentación ────────────────────────────────────────────────

  getTiposArticulo() {
    return [
      { value: 'venta',    label: 'Producto venta',  icon: 'fa-tag',           color: '#0d6efd', desc: 'Se vende al público. Lleva precio de venta.' },
      { value: 'insumo',   label: 'Insumo',          icon: 'fa-tools',         color: '#fd7e14', desc: 'Material de trabajo. No se vende directamente.' },
      { value: 'generico', label: 'Genérico',        icon: 'fa-cube',          color: '#6c757d', desc: 'Uso interno sin venta. Para control de existencias.' },
      { value: 'servicio', label: 'Servicio',        icon: 'fa-concierge-bell',color: '#0dcaf0', desc: 'Servicio que se cobra pero no consume stock físico.' },
    ];
  }

  getTipoIcon(art: any): string {
    if (art?.es_servicio) return 'fas fa-concierge-bell';
    const icons: Record<string, string> = { venta: 'fas fa-tag', insumo: 'fas fa-tools', generico: 'fas fa-cube' };
    return icons[art?.tipo] || 'fas fa-cube';
  }

  getBadgeClass(nivel: string): string {
    const map: Record<string, string> = {
      critico: 'badge bg-danger', bajo: 'badge bg-warning text-dark',
      ok: 'badge bg-success', sin_stock: 'badge bg-danger', servicio: 'badge bg-info'
    };
    return map[nivel] || 'badge bg-secondary';
  }

  getStockBadgeClass(nivel: string): string { return this.getBadgeClass(nivel); }

  getStockLabel(art: any): string {
    if (art?.es_servicio || art?.nivel_stock === 'servicio') return 'Servicio';
    const n = art?.nivel_stock ?? art;
    if (typeof n === 'string') {
      if (n === 'sin_stock') return 'Sin stock';
      if (n === 'critico') return 'Crítico';
      if (n === 'bajo') return 'Bajo';
      if (n === 'ok') return 'OK';
    }
    return String(art?.existencia_actual ?? '—');
  }

  getConceptosPorTipo(tipo: string): string[] {
    if (tipo === 'entrada')  return ['Compra a proveedor', 'Devolución de cliente', 'Ajuste positivo', 'Donación', 'Otro ingreso'];
    if (tipo === 'salida')   return ['Venta', 'Uso en servicio', 'Ajuste negativo', 'Merma', 'Devolución a proveedor', 'Otro egreso'];
    if (tipo === 'ajuste')   return ['Inventario físico', 'Corrección', 'Otro ajuste'];
    return [];
  }

  getUnidadesMedida(): string[] {
    return ['Pieza', 'Caja', 'Resma', 'Paquete', 'Kit', 'Millar', 'Rollo', 'Juego', 'Par', 'Litro', 'Metro', 'Kilogramo', 'Gramo', 'Unidad', 'Otro'];
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value || 0);
  }
}
