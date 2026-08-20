/**
 * Servicio de Sueldos - SuperCopias
 * Historial de sueldos por empleado (edición y eliminación definitiva permitidas).
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, SueldoHistorial } from '../shared/interfaces';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SueldosService {
  private baseUrl = `${environment.apiUrl}/empleados`;

  constructor(private http: HttpClient) {}

  listar(empleadoId: number): Observable<ApiResponse<SueldoHistorial[]>> {
    return this.http.get<ApiResponse<SueldoHistorial[]>>(`${this.baseUrl}/${empleadoId}/sueldos`);
  }

  crear(empleadoId: number, datos: { monto: number; fechaAsignacion: string; observaciones?: string }): Observable<ApiResponse<SueldoHistorial>> {
    return this.http.post<ApiResponse<SueldoHistorial>>(`${this.baseUrl}/${empleadoId}/sueldos`, datos);
  }

  actualizar(empleadoId: number, id: number, datos: { monto: number; fechaAsignacion: string; observaciones?: string }): Observable<ApiResponse<SueldoHistorial>> {
    return this.http.put<ApiResponse<SueldoHistorial>>(`${this.baseUrl}/${empleadoId}/sueldos/${id}`, datos);
  }

  eliminar(empleadoId: number, id: number): Observable<ApiResponse<{ id: number; salario_vigente: number | null }>> {
    return this.http.delete<ApiResponse<{ id: number; salario_vigente: number | null }>>(`${this.baseUrl}/${empleadoId}/sueldos/${id}`);
  }
}
