/**
 * Servicio de Turnos - SuperCopias
 * Catálogo dinámico de turnos y asignación semanal por empleado.
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, Turno, TurnoDia } from '../shared/interfaces';
import { environment } from '../../environments/environment';

export interface TurnoHistorial {
  id: number;
  empleado_id: number;
  dia_semana: number;
  turno_id: number | null;
  turno_nombre: string | null;
  accion: 'asignado' | 'modificado' | 'eliminado' | 'migracion_inicial';
  usuario_id?: number;
  usuario_nombre?: string;
  fecha_cambio: string;
}

export const DIAS_SEMANA_LABELS: { [dia: number]: string } = {
  1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado', 7: 'Domingo'
};

@Injectable({ providedIn: 'root' })
export class TurnosService {
  private baseUrl = `${environment.apiUrl}/empleados`;

  constructor(private http: HttpClient) {}

  // Catálogo de turnos
  listar(includeInactive = false): Observable<ApiResponse<Turno[]>> {
    return this.http.get<ApiResponse<Turno[]>>(`${this.baseUrl}/turnos`, {
      params: includeInactive ? { includeInactive: 'true' } : {}
    });
  }

  crear(turno: { nombre: string; horaEntrada: string; horaSalida: string }): Observable<ApiResponse<Turno>> {
    return this.http.post<ApiResponse<Turno>>(`${this.baseUrl}/turnos`, turno);
  }

  actualizar(id: number, turno: { nombre?: string; horaEntrada?: string; horaSalida?: string; activo?: boolean }): Observable<ApiResponse<Turno>> {
    return this.http.put<ApiResponse<Turno>>(`${this.baseUrl}/turnos/${id}`, turno);
  }

  toggleEstado(id: number): Observable<ApiResponse<{ id: number; activo: boolean }>> {
    return this.http.patch<ApiResponse<{ id: number; activo: boolean }>>(`${this.baseUrl}/turnos/${id}/toggle-estado`, {});
  }

  // Asignación semanal por empleado
  getTurnosDias(empleadoId: number): Observable<ApiResponse<TurnoDia[]>> {
    return this.http.get<ApiResponse<TurnoDia[]>>(`${this.baseUrl}/${empleadoId}/turnos-dias`);
  }

  setTurnosDias(empleadoId: number, dias: { diaSemana: number; turnoId: number | null }[]): Observable<ApiResponse<TurnoDia[]>> {
    return this.http.put<ApiResponse<TurnoDia[]>>(`${this.baseUrl}/${empleadoId}/turnos-dias`, { dias });
  }

  getHistorial(empleadoId: number): Observable<ApiResponse<TurnoHistorial[]>> {
    return this.http.get<ApiResponse<TurnoHistorial[]>>(`${this.baseUrl}/${empleadoId}/turnos-historial`);
  }
}
