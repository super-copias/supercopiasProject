import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  base = '/api/auth';
  constructor(private http: HttpClient) { }
  login(identifier: string, password: string): Observable<any> {
    return this.http.post(`${this.base}/login`, { identifier, password });
  }
}
