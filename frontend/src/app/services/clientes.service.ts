import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ClientesService {
  base = '/api/clientes';
  constructor(private http: HttpClient) { }
  list(q = '', page = 1, limit = 10): Observable<any> {
    let params = new HttpParams().set('q', q).set('page', String(page)).set('limit', String(limit));
    return this.http.get(this.base, { params });
  }
  create(data: any) { return this.http.post(this.base, data); }
}
