import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: any;
}

export interface Inventario {
  id?: number;
  tipo: string; // 'venta', 'insumo', 'generico'
  nombre: string;
  categoria: string;
  marca?: string;
  modelo?: string;
  codigo_sku?: string;
  proveedor_id?: number;
  proveedor_nombre?: string;
  estatus?: string; // 'activo', 'inactivo'
  existencia_actual?: number;
  unidad_medida: string;
  stock_minimo?: number;
  stock_maximo?: number;
  ubicacion_fisica?: string;
  costo_compra?: number;
  precio_venta?: number;
  costo_promedio?: number;
  observaciones?: string;
  foto_url?: string;
  caracteristicas?: any;
  fecha_alta?: Date;
  fecha_modificacion?: Date;
  activo?: boolean;
  nivel_stock?: string; // 'critico', 'bajo', 'normal'
}

export interface Movimiento {
  id?: number;
  inventario_id?: number;
  tipo_movimiento: string; // 'entrada', 'salida', 'ajuste'
  concepto: string; // 'compra', 'venta', 'uso_operativo', etc.
  cantidad: number;
  saldo_anterior?: number;
  saldo_nuevo?: number;
  usuario_nombre?: string;
  area_servicio?: string;
  notas?: string;
  evidencia_url?: string;
  fecha_movimiento?: Date;
}

export interface Categoria {
  id?: number;
  tipo: string;
  nombre: string;
  descripcion?: string;
  campos_requeridos?: any[];
  activo?: boolean;
  orden?: number;
}

export interface ReglasStock {
  id?: number;
  inventario_id: number;
  nivel_critico_porcentaje: number;
  nivel_bajo_porcentaje: number;
  nivel_normal_porcentaje: number;
  usar_stock_maximo: boolean;
  alerta_critico_activa: boolean;
  alerta_bajo_activa: boolean;
  alerta_sobrestock_activa: boolean;
  umbral_sobrestock_porcentaje: number;
  notificar_usuarios?: any;
  observaciones?: string;
  activo?: boolean;
  fecha_creacion?: Date;
  fecha_modificacion?: Date;
  tiene_reglas_personalizadas?: boolean;
  stock_minimo?: number;
  stock_maximo?: number;
}

export interface EstadisticasInventario {
  total_articulos: number;
  total_venta: number;
  total_insumos: number;
  total_genericos: number;
  alertas_criticas: number;
  alertas_bajas: number;
  valor_total_inventario: number;
}

@Injectable({
  providedIn: 'root'
})
export class InventariosService {
  private apiUrl: string;
  private baseUrl: string;

  constructor(
    private http: HttpClient,
    private configService: ConfigService
  ) {
    this.baseUrl = this.configService.apiUrl;
    this.apiUrl = `${this.baseUrl}/inventarios`;
  }

  // =====================================================
  // CRUD básico de inventarios
  // =====================================================

  /**
   * Obtener lista de inventarios con filtros y paginación
   * @param filters - Filtros opcionales: q, tipo, categoria, estatus, stockNivel, page, limit
   */
  getInventarios(filters?: any): Observable<any> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.q) params = params.set('q', filters.q);
      if (filters.tipo) params = params.set('tipo', filters.tipo);
      if (filters.categoria) params = params.set('categoria', filters.categoria);
      if (filters.estatus) params = params.set('estatus', filters.estatus);
      if (filters.stockNivel) params = params.set('stockNivel', filters.stockNivel);
      if (filters.incluirArchivados !== undefined) params = params.set('incluirArchivados', filters.incluirArchivados.toString());
      if (filters.page) params = params.set('page', filters.page.toString());
      if (filters.limit) params = params.set('limit', filters.limit.toString());
    }
    
    return this.http.get<any>(this.apiUrl, { params });
  }

  /**
   * Obtener un artículo por ID
   */
  getInventarioById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  /**
   * Crear nuevo artículo en inventario
   */
  createInventario(inventario: Inventario): Observable<any> {
    return this.http.post<any>(this.apiUrl, inventario);
  }

  /**
   * Actualizar artículo existente
   */
  updateInventario(id: number, inventario: Partial<Inventario>): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, inventario);
  }

  /**
   * Eliminar artículo (hard delete - solo si no tiene movimientos)
   */
  deleteInventario(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  /**
   * Archivar/desarchivar artículo (soft delete usando campo activo)
   */
  archivarInventario(id: number, archivar: boolean = true): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}/archivar`, { archivar });
  }

  // =====================================================
  // Movimientos de inventario
  // =====================================================

  /**
   * Registrar movimiento de inventario (entrada/salida/ajuste)
   */
  addMovimiento(inventarioId: number, movimiento: Partial<Movimiento>): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${inventarioId}/movimientos`, movimiento);
  }

  /**
   * Obtener historial de movimientos de un artículo
   */
  getHistorialMovimientos(inventarioId: number, page?: number, limit?: number): Observable<any> {
    let params = new HttpParams();
    if (page) params = params.set('page', page.toString());
    if (limit) params = params.set('limit', limit.toString());
    
    return this.http.get<any>(`${this.apiUrl}/${inventarioId}/movimientos`, { params });
  }

  // =====================================================
  // Alertas y estadísticas
  // =====================================================

  /**
   * Obtener alertas de stock bajo o crítico
   */
  getAlertas(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/alertas`);
  }

  /**
   * Obtener estadísticas generales del inventario
   */
  getStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/stats`);
  }

  // =====================================================
  // Catálogos
  // =====================================================

  /**
   * Obtener catálogo de categorías
   * @param tipo - Filtrar por tipo: 'venta', 'insumo', 'generico'
   */
  getCategorias(tipo?: string): Observable<any> {
    let params = new HttpParams();
    if (tipo) params = params.set('tipo', tipo);
    
    return this.http.get<any>(`${this.apiUrl}/categorias`, { params });
  }

  /**
   * Crear nueva categoría
   */
  createCategoria(categoria: Partial<Categoria>): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/categorias`, categoria);
  }

  /**
   * Actualizar categoría existente
   */
  updateCategoriaById(id: number, categoria: Partial<Categoria>): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/categorias/${id}`, categoria);
  }

  /**
   * Eliminar categoría
   */
  deleteCategoria(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/categorias/${id}`);
  }

  // =====================================================
  // Reglas de Stock Personalizadas
  // =====================================================

  /**
   * Obtener reglas de stock de un artículo
   */
  getReglasStock(inventarioId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${inventarioId}/reglas-stock`);
  }

  /**
   * Crear reglas de stock personalizadas
   */
  createReglasStock(inventarioId: number, reglas: Partial<ReglasStock>): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${inventarioId}/reglas-stock`, reglas);
  }

  /**
   * Actualizar reglas de stock existentes
   */
  updateReglasStock(inventarioId: number, reglas: Partial<ReglasStock>): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${inventarioId}/reglas-stock`, reglas);
  }

  /**
   * Eliminar reglas personalizadas (volver a usar reglas por defecto)
   */
  deleteReglasStock(inventarioId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${inventarioId}/reglas-stock`);
  }

  // =====================================================
  // Métodos auxiliares
  // =====================================================

  /**
   * Obtener opciones de unidades de medida
   */
  getUnidadesMedida(): string[] {
    return [
      'Pieza',
      'Caja',
      'Resma',
      'Paquete',
      'Kit',
      'Millar',
      'Rollo',
      'Juego',
      'Par',
      'Litro',
      'Metro',
      'Kilogramo',
      'Gramo',
      'Unidad',
      'Otro'
    ];
  }

  /**
   * Obtener opciones de tipo de movimiento
   */
  getTiposMovimiento(): any[] {
    return [
      { value: 'entrada', label: 'Entrada' },
      { value: 'salida', label: 'Salida' },
      { value: 'ajuste', label: 'Ajuste' }
    ];
  }

  /**
   * Obtener opciones de concepto según tipo de movimiento
   */
  getConceptosPorTipo(tipoMovimiento: string): any[] {
    const conceptos: any = {
      'entrada': [
        { value: 'compra', label: 'Compra' },
        { value: 'devolucion', label: 'Devolución de cliente' },
        { value: 'ajuste_entrada', label: 'Ajuste de inventario' },
        { value: 'transferencia', label: 'Transferencia entrante' }
      ],
      'salida': [
        { value: 'venta', label: 'Venta' },
        { value: 'uso_operativo', label: 'Uso operativo (servicio)' },
        { value: 'servicio_tecnico', label: 'Servicio técnico' },
        { value: 'merma', label: 'Merma / Pérdida' },
        { value: 'ajuste_salida', label: 'Ajuste de inventario' },
        { value: 'transferencia', label: 'Transferencia saliente' }
      ],
      'ajuste': [
        { value: 'ajuste_entrada', label: 'Ajuste por conteo' },
        { value: 'ajuste_salida', label: 'Corrección' }
      ]
    };
    
    return conceptos[tipoMovimiento] || [];
  }

  /**
   * Obtener badge de color según nivel de stock
   */
  getStockBadgeClass(nivelStock: string): string {
    const badgeClasses: any = {
      'critico': 'badge bg-danger',
      'bajo': 'badge bg-warning text-dark',
      'normal': 'badge bg-success'
    };
    
    return badgeClasses[nivelStock] || 'badge bg-secondary';
  }

  /**
   * Obtener etiqueta de nivel de stock
   */
  getStockLabel(nivelStock: string): string {
    const labels: any = {
      'critico': 'Stock Crítico',
      'bajo': 'Stock Bajo',
      'normal': 'Stock Normal'
    };
    
    return labels[nivelStock] || 'Desconocido';
  }

  /**
   * Obtener icono según tipo de inventario
   */
  getTipoIcon(tipo: string): string {
    const icons: any = {
      'venta': 'fas fa-shopping-cart',
      'insumo': 'fas fa-tools',
      'generico': 'fas fa-box'
    };
    
    return icons[tipo] || 'fas fa-box';
  }
}
