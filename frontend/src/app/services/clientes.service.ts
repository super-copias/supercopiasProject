import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ClientesService {
  // Mock in-memory store for development
  private store: any[] = [];
  private idSeq = 1;

  constructor() {
    // seed with a few records
    this.create({ nombre: 'Juan Pérez', telefono: '555-1234', email: 'juan@example.com', direccion: 'Calle Falsa 123' }).subscribe();
    this.create({ nombre: 'María López', telefono: '555-5678', email: 'maria@example.com', direccion: 'Av. Siempre Viva 742' }).subscribe();
  }

  list(q = '', page = 1, limit = 10): Observable<any> {
    const filtered = this.store.filter(c => {
      if (!q) return true;
      const qq = q.toLowerCase();
      return (c.nombre || '').toLowerCase().includes(qq) || (c.telefono || '').toLowerCase().includes(qq) || String(c.id) === q;
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
