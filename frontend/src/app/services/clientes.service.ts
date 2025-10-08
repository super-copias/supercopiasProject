/**
 * Servicio de Clientes
 * Gestiona todas las operaciones CRUD para clientes y operaciones relacionadas
 * Incluye datos mock para desarrollo y llamadas al backend
 */

import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class ClientesService {
  // Store local para desarrollo (datos mock)
  private store: any[] = [];
  private idSeq = 1;
  private baseUrl = '/api/clientes';

  constructor(private http: HttpClient) {
    // Constructor limpio - ya no crea datos mock automáticamente
  }

  /**
   * Obtener lista de clientes con búsqueda y paginación
   * Intenta obtener del backend, si falla usa datos mock
   * 
   * @param q - Término de búsqueda
   * @param page - Número de página
   * @param limit - Elementos por página
   * @returns Observable con datos paginados
   */
  list(q = '', page = 1, limit = 10): Observable<any> {
    const params = new URLSearchParams();
    if (q) params.append('q', q);
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    return this.http.get<any>(`${this.baseUrl}?${params.toString()}`).pipe(
      catchError(() => {
        // Fallback a datos mock si el backend no está disponible
        const normalize = (s: string) => s ? s.normalize ? s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase() : s.toLowerCase() : '';
        const qnorm = normalize(q || '');
        
        const filtered = this.store.filter(c => {
          if (!qnorm) return true;
          return Object.values(c).some(v => normalize((v || '').toString()).includes(qnorm)) || String(c.id) === q;
        });
        
        const start = (page - 1) * limit;
        const data = filtered.slice(start, start + limit);
        return of({ data, total: filtered.length });
      })
    );
  }

  /**
   * Crear un nuevo cliente
   * Intenta crear en el backend, si falla usa datos mock
   * 
   * @param data - Datos del cliente
   * @returns Observable con el cliente creado
   */
  create(data: any): Observable<any> {
    return this.http.post<any>(this.baseUrl, data).pipe(
      catchError(() => {
        // Fallback a datos mock si el backend no está disponible
        const item = { id: this.idSeq++, ...data };
        this.store.push(item);
        return of(item);
      })
    );
  }

  /**
   * Crear múltiples clientes
   * Usado para inicializar datos de desarrollo
   * 
   * @param arr - Array de clientes
   * @returns Observable con resultado de la operación
   */
  createMany(arr: any[]): Observable<any> {
    const created = arr.map(a => ({ id: this.idSeq++, ...a }));
    this.store.push(...created);
    return of({ createdCount: created.length, created });
  }

  /**
   * Obtener un cliente por ID
   * Intenta obtener del backend, si falla usa datos mock
   * 
   * @param id - ID del cliente
   * @returns Observable con el cliente o null
   */
  getById(id: string | number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${id}`).pipe(
      catchError(() => {
        // Fallback a datos mock si el backend no está disponible
        const cliente = this.store.find(c => c.id == id);
        return cliente ? of(cliente) : of(null);
      })
    );
  }

  /**
   * Actualizar un cliente existente
   * Intenta actualizar en el backend, si falla usa datos mock
   * 
   * @param id - ID del cliente
   * @param data - Datos a actualizar
   * @returns Observable con el cliente actualizado o null
   */
  update(id: string | number, data: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${id}`, data).pipe(
      catchError(() => {
        // Fallback a datos mock si el backend no está disponible
        const index = this.store.findIndex(c => c.id == id);
        if (index === -1) return of(null);
        this.store[index] = { ...this.store[index], ...data };
        return of(this.store[index]);
      })
    );
  }

  /**
   * Eliminar un cliente
   * Intenta eliminar del backend, si falla usa datos mock
   * 
   * @param id - ID del cliente
   * @returns Observable con resultado booleano
   */
  delete(id: string | number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${id}`).pipe(
      catchError(() => {
        // Fallback a datos mock si el backend no está disponible
        const index = this.store.findIndex(c => c.id == id);
        if (index === -1) return of(false);
        this.store.splice(index, 1);
        return of(true);
      })
    );
  }

  /**
   * Obtener catálogo de Usos CFDI de México
   * Endpoint: GET /api/clientes/usos-cfdi
   * Incluye fallback con datos locales si el backend no está disponible
   * 
   * @returns Observable con array de códigos CFDI
   */
  getUsosCFDI(): Observable<any[]> {
    // Intentar obtener del backend primero, si falla usar datos locales
    return this.http.get<any[]>(`${this.baseUrl}/usos-cfdi`).pipe(
      catchError(() => {
        // Catálogo completo de Usos CFDI vigentes en México (fallback)
        const usosCFDI = [
          { codigo: 'G01', descripcion: 'Adquisición de mercancías' },
          { codigo: 'G02', descripcion: 'Devoluciones, descuentos o bonificaciones' },
          { codigo: 'G03', descripcion: 'Gastos en general' },
          { codigo: 'I01', descripcion: 'Construcciones' },
          { codigo: 'I02', descripcion: 'Mobilario y equipo de oficina por inversiones' },
          { codigo: 'I03', descripcion: 'Equipo de transporte' },
          { codigo: 'I04', descripcion: 'Equipo de cómputo y accesorios' },
          { codigo: 'I05', descripcion: 'Dados, troqueles, moldes, matrices y herramental' },
          { codigo: 'I06', descripcion: 'Comunicaciones telefónicas' },
          { codigo: 'I07', descripcion: 'Comunicaciones satelitales' },
          { codigo: 'I08', descripcion: 'Otra maquinaria y equipo' },
          { codigo: 'D01', descripcion: 'Honorarios médicos, dentales y gastos hospitalarios' },
          { codigo: 'D02', descripcion: 'Gastos médicos por incapacidad o discapacidad' },
          { codigo: 'D03', descripcion: 'Gastos funerales' },
          { codigo: 'D04', descripcion: 'Donativos' },
          { codigo: 'D05', descripcion: 'Intereses reales efectivamente pagados por créditos hipotecarios (casa habitación)' },
          { codigo: 'D06', descripcion: 'Aportaciones voluntarias al SAR' },
          { codigo: 'D07', descripcion: 'Primas por seguros de gastos médicos' },
          { codigo: 'D08', descripcion: 'Gastos de transportación escolar obligatoria' },
          { codigo: 'D09', descripcion: 'Depósitos en cuentas para el ahorro, primas que tengan como base planes de pensiones' },
          { codigo: 'D10', descripcion: 'Pagos por servicios educativos (colegiaturas)' },
          { codigo: 'S01', descripcion: 'Sin efectos fiscales' },
          { codigo: 'CP01', descripcion: 'Pagos' },
          { codigo: 'CN01', descripcion: 'Nómina' }
        ];
        
        return of(usosCFDI);
      })
    );
  }

  /**
   * Subir archivo Excel para carga masiva de clientes
   * Envía el archivo al backend para procesamiento y validación
   * 
   * @param file - Archivo Excel (.xlsx o .xls)
   * @returns Observable con el resultado del procesamiento
   */
  uploadExcel(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('excel', file);
    
    return this.http.post(`${this.baseUrl}/upload-excel`, formData).pipe(
      catchError((error) => {
        console.error('Error uploading Excel:', error);
        throw error;
      })
    );
  }
}
