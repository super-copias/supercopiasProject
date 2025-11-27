/**
 * Servicio de Eventos de Personal
 * Gestiona vacaciones, faltas, permisos y otros eventos de empleados
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';

export interface EventoPersonal {
  id?: number;
  empleado_id: number;
  tipo: 'vacaciones' | 'falta' | 'permiso' | 'otro';
  fecha_inicio: string;
  fecha_fin?: string;
  hora_inicio?: string;
  hora_fin?: string;
  horas_totales?: number;
  dias_totales?: number;
  subtipo?: string;
  estado: 'pendiente' | 'aprobado' | 'rechazado';
  justificada?: boolean;
  con_goce_sueldo?: boolean;
  motivo?: string;
  observaciones?: string;
  documento_url?: string;
  registrado_por?: number;
  aprobado_por?: number;
  fecha_registro?: string;
  fecha_aprobacion?: string;
  created_at?: string;
  updated_at?: string;
  // Datos de joins
  registrado_por_nombre?: string;
  aprobado_por_nombre?: string;
}

export interface ResumenVacaciones {
  empleado_id: number;
  nombre: string;
  dias_vacaciones_sugeridos: number;
  dias_tomados: number;
  dias_restantes: number;
  dias_pendientes: number;
  anio: number;
  excede_sugeridos: boolean;
  dias_excedentes: number;
}

export interface EstadisticasEventos {
  anio: number;
  eventos: Array<{
    tipo: string;
    cantidad: number;
    total_dias: number;
    total_horas: number;
  }>;
  resumen: {
    total_eventos: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class EventosPersonalService {
  
  private apiUrl: string;

  constructor(
    private http: HttpClient,
    private config: ConfigService
  ) {
    this.apiUrl = this.config.apiUrl;
  }
  
  /**
   * Listar eventos de un empleado
   */
  listar(empleadoId: number, filtros?: { tipo?: string; anio?: number }): Observable<any> {
    let url = `${this.apiUrl}/empleados/${empleadoId}/eventos`;
    
    let params = new HttpParams();
    if (filtros?.tipo) params = params.set('tipo', filtros.tipo);
    if (filtros?.anio) params = params.set('anio', filtros.anio.toString());
    
    return this.http.get(url, { params });
  }

  /**
   * Obtener resumen de vacaciones de un empleado
   */
  getResumenVacaciones(empleadoId: number, anio?: number): Observable<any> {
    let params = new HttpParams();
    if (anio) params = params.set('anio', anio.toString());
    
    return this.http.get(`${this.apiUrl}/empleados/${empleadoId}/eventos/resumen-vacaciones`, { params });
  }

  /**
   * Obtener estadísticas de eventos de un empleado
   */
  getEstadisticas(empleadoId: number, anio?: number): Observable<any> {
    let params = new HttpParams();
    if (anio) params = params.set('anio', anio.toString());
    
    return this.http.get(`${this.apiUrl}/empleados/${empleadoId}/eventos/estadisticas`, { params });
  }

  /**
   * Crear un nuevo evento
   */
  crear(empleadoId: number, evento: Partial<EventoPersonal>): Observable<any> {
    return this.http.post(`${this.apiUrl}/empleados/${empleadoId}/eventos`, evento);
  }

  /**
   * Actualizar un evento existente
   */
  actualizar(empleadoId: number, eventoId: number, evento: Partial<EventoPersonal>): Observable<any> {
    return this.http.put(`${this.apiUrl}/empleados/${empleadoId}/eventos/${eventoId}`, evento);
  }

  /**
   * Eliminar un evento
   */
  eliminar(empleadoId: number, eventoId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/empleados/${empleadoId}/eventos/${eventoId}`);
  }

  /**
   * Calcular días entre dos fechas
   */
  calcularDias(fechaInicio: string, fechaFin?: string): number {
    if (!fechaFin) return 1;
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    const diff = Math.abs(fin.getTime() - inicio.getTime());
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  }

  /**
   * Calcular horas entre dos tiempos
   */
  calcularHoras(horaInicio: string, horaFin: string): number {
    const [horaInicioH, horaInicioM] = horaInicio.split(':').map(Number);
    const [horaFinH, horaFinM] = horaFin.split(':').map(Number);
    const minutosInicio = horaInicioH * 60 + horaInicioM;
    const minutosFin = horaFinH * 60 + horaFinM;
    return (minutosFin - minutosInicio) / 60;
  }

  /**
   * Obtener icono según tipo de evento
   */
  getIconoTipo(tipo: string): string {
    const iconos: any = {
      'vacaciones': 'fa-umbrella-beach',
      'falta': 'fa-times-circle',
      'permiso': 'fa-file-signature',
      'otro': 'fa-calendar-check'
    };
    return iconos[tipo] || 'fa-calendar';
  }

  /**
   * Obtener color según tipo de evento
   */
  getColorTipo(tipo: string): string {
    const colores: any = {
      'vacaciones': 'primary',
      'falta': 'danger',
      'permiso': 'warning',
      'otro': 'info'
    };
    return colores[tipo] || 'secondary';
  }

  /**
   * Obtener color según estado
   */
  getColorEstado(estado: string): string {
    const colores: any = {
      'aprobado': 'success',
      'pendiente': 'warning',
      'rechazado': 'danger'
    };
    return colores[estado] || 'secondary';
  }

  /**
   * Formatear tipo para mostrar
   */
  formatearTipo(tipo: string): string {
    const tipos: any = {
      'vacaciones': 'Vacaciones',
      'falta': 'Falta',
      'permiso': 'Permiso',
      'otro': 'Otro'
    };
    return tipos[tipo] || tipo;
  }

  /**
   * Formatear estado para mostrar
   */
  formatearEstado(estado: string): string {
    const estados: any = {
      'aprobado': 'Aprobado',
      'pendiente': 'Pendiente',
      'rechazado': 'Rechazado'
    };
    return estados[estado] || estado;
  }
}
