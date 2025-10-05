import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ClientesService {
  // Mock in-memory store for development
  private store: any[] = [];
  private idSeq = 1;

  constructor() {
    // seed with 10 records matching backend sample data
    const seeds = [
      { nombre: 'Imprenta Central', telefono: '55-1010-2020', email: 'contacto@imprentacentral.com', direccion: 'Calle 10 #100', rfc: 'IMP123456T1', entrega: 'Recoge' },
      { nombre: 'Copias Express', telefono: '55-2020-3030', email: 'ventas@copiasexpress.mx', direccion: 'Av. Reforma 200', rfc: 'COP987654A2', entrega: 'Envio' },
      { nombre: 'Oficina & Más', telefono: '55-3030-4040', email: 'info@oficinaymas.com', direccion: 'Boulevard Central 45', rfc: 'OFI564738B3', entrega: 'Recoge' },
      { nombre: 'Gráficos Rápidos', telefono: '55-4040-5050', email: 'contacto@graficosrapidos.com', direccion: 'Calle 7 #77', rfc: 'GRA112233C4', entrega: 'Envio' },
      { nombre: 'Servicios Imprime', telefono: '55-5050-6060', email: 'hola@serviciosimprime.mx', direccion: 'Av. Libertad 88', rfc: 'SER445566D5', entrega: 'Recoge' },
      { nombre: 'Documentos YA', telefono: '55-6060-7070', email: 'soporte@documentosya.com', direccion: 'Plaza Central Local 3', rfc: 'DOC778899E6', entrega: 'Envio' },
      { nombre: 'Papelería El Siglo', telefono: '55-7070-8080', email: 'ventas@papsiglo.com', direccion: 'Calle Independencia 12', rfc: 'PAP334455F7', entrega: 'Recoge' },
      { nombre: 'Copy & Print', telefono: '55-8080-9090', email: 'contacto@copyandprint.mx', direccion: 'Av. Reforma 900', rfc: 'COP556677G8', entrega: 'Envio' },
      { nombre: 'Rápido Impreso', telefono: '55-9090-0000', email: 'rapido@impreso.com', direccion: 'Calle 3 #5', rfc: 'RAP990011H9', entrega: 'Recoge' },
      { nombre: 'Servicios de Copiado S.A.', telefono: '55-0000-1111', email: 'contacto@serviciosdecopiado.mx', direccion: 'Av. Industrial 10', rfc: 'SER223344I0', entrega: 'Envio' }
    ];
    seeds.forEach(s => this.create(s).subscribe());
  }

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

  create(data: any): Observable<any> {
    const item = { id: this.idSeq++, ...data };
    this.store.push(item);
    return of(item);
  }

  createMany(arr: any[]): Observable<any> {
    const created = arr.map(a => ({ id: this.idSeq++, ...a }));
    this.store.push(...created);
    return of({ createdCount: created.length, created });
  }
}
