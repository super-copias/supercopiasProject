import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  
  get apiUrl(): string {
    return environment.apiUrl;
  }
  
  get isProduction(): boolean {
    return environment.production;
  }
  
  get environmentName(): string {
    return environment.name;
  }
  
  /**
   * Construye URL completa para endpoint de API
   */
  buildApiUrl(endpoint: string): string {
    // Remover slash inicial si existe para evitar doble slash
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
    return `${this.apiUrl}/${cleanEndpoint}`;
  }
}