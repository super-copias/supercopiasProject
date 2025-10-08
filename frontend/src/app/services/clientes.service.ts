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
    // Datos de muestra para desarrollo - coinciden con el backend
    const seeds = [
      { nombre: 'Imprenta Central', telefono: '55-1010-2020', segundoTelefono: '55-1010-2021', email: 'contacto@imprentacentral.com', direccion: 'Calle 10 #100', rfc: 'IMP123456T1', razon: 'Imprenta Central S.A. de C.V.', regimen: 'General de Ley', cp: '06700', cfdi: 'G01 - Adquisición de mercancías' },
      { nombre: 'Copias Express', telefono: '55-2020-3030', segundoTelefono: '55-2020-3031', email: 'ventas@copiasexpress.mx', direccion: 'Av. Reforma 200', rfc: 'COP987654A2', razon: 'Copias Express S.A.', regimen: 'General de Ley', cp: '11000', cfdi: 'G03 - Gastos en general' },
      { nombre: 'Oficina & Más', telefono: '55-3030-4040', segundoTelefono: '55-3030-4041', email: 'info@oficinaymas.com', direccion: 'Boulevard Central 45', rfc: 'OFI564738B3', razon: 'Oficina & Más S.C.', regimen: 'Simplificado de Confianza', cp: '03100', cfdi: 'G01 - Adquisición de mercancías' },
      { nombre: 'Gráficos Rápidos', telefono: '55-4040-5050', segundoTelefono: '55-4040-5051', email: 'contacto@graficosrapidos.com', direccion: 'Calle 7 #77', rfc: 'GRA112233C4', razon: 'Gráficos Rápidos S.A. de C.V.', regimen: 'General de Ley', cp: '07300', cfdi: 'G02 - Devoluciones, descuentos o bonificaciones' },
      { nombre: 'Servicios Imprime', telefono: '55-5050-6060', segundoTelefono: '55-5050-6061', email: 'hola@serviciosimprime.mx', direccion: 'Av. Libertad 88', rfc: 'SER445566D5', razon: 'Servicios Imprime S.A.', regimen: 'General de Ley', cp: '01000', cfdi: 'G01 - Adquisición de mercancías' },
      { nombre: 'Documentos YA', telefono: '55-6060-7070', segundoTelefono: '55-6060-7071', email: 'soporte@documentosya.com', direccion: 'Plaza Central Local 3', rfc: 'DOC778899E6', razon: 'Documentos YA S.C.', regimen: 'Simplificado de Confianza', cp: '08100', cfdi: 'G03 - Gastos en general' },
      { nombre: 'Papelería El Siglo', telefono: '55-7070-8080', segundoTelefono: '55-7070-8081', email: 'ventas@papsiglo.com', direccion: 'Calle Independencia 12', rfc: 'PAP334455F7', razon: 'Papelería El Siglo S.A. de C.V.', regimen: 'General de Ley', cp: '06000', cfdi: 'G01 - Adquisición de mercancías' },
      { nombre: 'Copy & Print', telefono: '55-8080-9090', segundoTelefono: '55-8080-9091', email: 'contacto@copyandprint.mx', direccion: 'Av. Reforma 900', rfc: 'COP556677G8', razon: 'Copy & Print S.A.', regimen: 'General de Ley', cp: '11550', cfdi: 'G02 - Devoluciones, descuentos o bonificaciones' },
      { nombre: 'Rápido Impreso', telefono: '55-9090-0000', segundoTelefono: '55-9090-0001', email: 'rapido@impreso.com', direccion: 'Calle 3 #5', rfc: 'RAP990011H9', razon: 'Rápido Impreso S.C.', regimen: 'Simplificado de Confianza', cp: '09000', cfdi: 'G01 - Adquisición de mercancías' },
      { nombre: 'Servicios de Copiado S.A.', telefono: '55-0000-1111', segundoTelefono: '55-0000-1112', email: 'contacto@serviciosdecopiado.mx', direccion: 'Av. Industrial 10', rfc: 'SER223344I0', razon: 'Servicios de Copiado S.A. de C.V.', regimen: 'General de Ley', cp: '02000', cfdi: 'G03 - Gastos en general' }
    ];
    seeds.forEach(s => this.create(s).subscribe());
  }

  /**
   * Obtener lista de clientes con búsqueda y paginación
   * Usar datos mock para desarrollo
   * 
   * @param q - Término de búsqueda
   * @param page - Número de página
   * @param limit - Elementos por página
   * @returns Observable con datos paginados
   */
  list(q = '', page = 1, limit = 10): Observable<any> {
    const normalize = (s: string) => s ? s.normalize ? s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase() : s.toLowerCase() : '';
    const qnorm = normalize(q || '');
    
    const filtered = this.store.filter(c => {
      if (!qnorm) return true;
      return Object.values(c).some(v => normalize((v || '').toString()).includes(qnorm)) || String(c.id) === q;
    });
    
    const start = (page - 1) * limit;
    const data = filtered.slice(start, start + limit);
    return of({ data, total: filtered.length });
  }

  /**
   * Crear un nuevo cliente
   * Usa datos mock para desarrollo
   * 
   * @param data - Datos del cliente
   * @returns Observable con el cliente creado
   */
  create(data: any): Observable<any> {
    const item = { id: this.idSeq++, ...data };
    this.store.push(item);
    return of(item);
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
   * 
   * @param id - ID del cliente
   * @returns Observable con el cliente o null
   */
  getById(id: string | number): Observable<any> {
    const cliente = this.store.find(c => c.id == id);
    return cliente ? of(cliente) : of(null);
  }

  /**
   * Actualizar un cliente existente
   * 
   * @param id - ID del cliente
   * @param data - Datos a actualizar
   * @returns Observable con el cliente actualizado o null
   */
  update(id: string | number, data: any): Observable<any> {
    const index = this.store.findIndex(c => c.id == id);
    if (index === -1) return of(null);
    this.store[index] = { ...this.store[index], ...data };
    return of(this.store[index]);
  }

  /**
   * Eliminar un cliente
   * 
   * @param id - ID del cliente
   * @returns Observable con resultado booleano
   */
  delete(id: string | number): Observable<any> {
    const index = this.store.findIndex(c => c.id == id);
    if (index === -1) return of(false);
    this.store.splice(index, 1);
    return of(true);
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
}
