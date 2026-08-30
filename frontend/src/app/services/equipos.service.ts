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

export interface Equipo {
  id?: number;
  tipo_equipo: string;
  marca?: string;
  modelo?: string;
  numero_serie?: string;
  nombre_equipo?: string;
  area_ubicacion?: string;
  cliente_nombre?: string;
  estatus?: string;
  responsable_nombre?: string;
  observaciones?: string;
  foto_url?: string;
  mantenimiento_intervalo_dias?: number;
  mantenimiento_fecha_inicio?: string;
  mantenimiento_dias_alerta?: number;
  caracteristicas?: any;
  fecha_alta?: Date;
  fecha_modificacion?: Date;
  activo?: boolean;
  // Datos calculados de joins
  ultimo_contador?: number;
  ultimo_mantenimiento?: Date;
}

export interface HistorialContador {
  id?: number;
  equipo_id: number;
  fecha_lectura: Date;
  contador_actual: number;
  tecnico_nombre?: string;
  observaciones?: string;
}

export interface Mantenimiento {
  id?: number;
  equipo_id: number;
  fecha_servicio: Date;
  contador_servicio?: number;
  descripcion: string;
  costo?: number;
  tecnico_nombre?: string;
  proveedor_nombre?: string;
  observaciones?: string;
}

export interface Consumible {
  id?: number;
  equipo_id: number;
  tipo_consumible: string;
  fecha_instalacion: Date;
  rendimiento_estimado?: number;
  contador_instalacion?: number;
  contador_proximo_cambio?: number;
  observaciones?: string;
}

@Injectable({
  providedIn: 'root'
})
export class EquiposService {
  private apiUrl: string;
  private baseUrl: string;

  constructor(
    private http: HttpClient,
    private configService: ConfigService
  ) {
    this.baseUrl = this.configService.apiUrl;
    this.apiUrl = `${this.baseUrl}/equipos`;
  }

  // CRUD básico de equipos
  getEquipos(filters?: any): Observable<any> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.q) params = params.set('q', filters.q);
      if (filters.tipo) params = params.set('tipo', filters.tipo);
      if (filters.estatus) params = params.set('estatus', filters.estatus);
      if (filters.page) params = params.set('page', filters.page.toString());
      if (filters.limit) params = params.set('limit', filters.limit.toString());
    }
    
    return this.http.get<any>(this.apiUrl, { params });
  }

  getEquipoById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  createEquipo(equipo: Equipo): Observable<any> {
    return this.http.post<any>(this.apiUrl, equipo);
  }

  updateEquipo(id: number, equipo: Partial<Equipo>): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, equipo);
  }

  deleteEquipo(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  // Historial de contadores
  addContador(equipoId: number, contador: Partial<HistorialContador>): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${equipoId}/contador`, contador);
  }

  getHistorialContador(equipoId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${equipoId}/contador`);
  }

  updateContador(equipoId: number, registroId: number, data: Partial<HistorialContador>): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${equipoId}/contador/${registroId}`, data);
  }

  deleteContador(equipoId: number, registroId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${equipoId}/contador/${registroId}`);
  }

  // Mantenimientos
  addMantenimiento(equipoId: number, mantenimiento: Partial<Mantenimiento>): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${equipoId}/mantenimiento`, mantenimiento);
  }

  getHistorialMantenimiento(equipoId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${equipoId}/mantenimiento`);
  }

  updateMantenimiento(equipoId: number, registroId: number, data: Partial<Mantenimiento>): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${equipoId}/mantenimiento/${registroId}`, data);
  }

  deleteMantenimiento(equipoId: number, registroId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${equipoId}/mantenimiento/${registroId}`);
  }

  // Consumibles
  addConsumible(equipoId: number, consumible: Partial<Consumible>): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${equipoId}/consumibles`, consumible);
  }

  getConsumibles(equipoId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${equipoId}/consumibles`);
  }

  updateConsumible(equipoId: number, registroId: number, data: Partial<Consumible>): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${equipoId}/consumibles/${registroId}`, data);
  }

  deleteConsumible(equipoId: number, registroId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${equipoId}/consumibles/${registroId}`);
  }

  // Estadísticas
  getStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/stats`);
  }

  // =====================================================
  // Mantenimiento Preventivo
  // =====================================================

  configurarMantenimientoPreventivo(equipoId: number, config: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${equipoId}/mantenimiento-preventivo`, config);
  }

  getAlertasMantenimiento(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/alertas-mantenimiento`);
  }

  // =====================================================
  // Catálogos
  // =====================================================

  getTiposEquipo(incluirInactivos = false): Observable<ApiResponse<any[]>> {
    const qs = incluirInactivos ? '?incluir_inactivos=true' : '';
    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/catalogos-equipos/tipos${qs}`);
  }

  getEstatusEquipo(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/catalogos-equipos/estatus`);
  }

  getMarcasEquipo(incluirInactivos = false): Observable<ApiResponse<any[]>> {
    const qs = incluirInactivos ? '?incluir_inactivos=true' : '';
    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/catalogos-equipos/marcas${qs}`);
  }

  getCatalogosCompletos(): Observable<ApiResponse<{ tipos: any[], estatus: any[], marcas: any[] }>> {
    return this.http.get<ApiResponse<{ tipos: any[], estatus: any[], marcas: any[] }>>(`${this.baseUrl}/catalogos-equipos/completos`);
  }

  // ----- Catálogo de marcas (administración) -----
  createMarca(nombre: string, descripcion?: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/catalogos-equipos/marcas`, { nombre, descripcion });
  }

  updateMarca(id: number, data: { nombre?: string; descripcion?: string; activo?: boolean; orden?: number }): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.baseUrl}/catalogos-equipos/marcas/${id}`, data);
  }

  deleteMarca(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/catalogos-equipos/marcas/${id}`);
  }

  // ----- Catálogo de tipos de equipo (administración) -----
  createTipo(nombre: string, descripcion?: string, requiere_contador?: boolean): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/catalogos-equipos/tipos`, { nombre, descripcion, requiere_contador });
  }

  updateTipo(id: number, data: { nombre?: string; descripcion?: string; requiere_contador?: boolean; activo?: boolean; orden?: number }): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.baseUrl}/catalogos-equipos/tipos/${id}`, data);
  }

  deleteTipo(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/catalogos-equipos/tipos/${id}`);
  }
}
