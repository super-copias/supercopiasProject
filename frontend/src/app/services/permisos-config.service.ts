/**
 * Servicio de Configuración de Permisos - SuperCopias
 * Límite diario global (informativo) de permisos entre todos los empleados.
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../shared/interfaces';
import { environment } from '../../environments/environment';

export interface ConfigPermisos {
  id: number;
  limite_diario: number;
  fecha_modificacion?: string;
  modificado_por?: number;
}

@Injectable({ providedIn: 'root' })
export class PermisosConfigService {
  private baseUrl = `${environment.apiUrl}/empleados/permisos-config`;

  constructor(private http: HttpClient) {}

  obtener(): Observable<ApiResponse<ConfigPermisos>> {
    return this.http.get<ApiResponse<ConfigPermisos>>(this.baseUrl);
  }

  actualizar(limiteDiario: number): Observable<ApiResponse<ConfigPermisos>> {
    return this.http.put<ApiResponse<ConfigPermisos>>(this.baseUrl, { limiteDiario });
  }
}
