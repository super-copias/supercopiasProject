import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * Servicio global para manejo de cancelación de requests HTTP
 * Permite cancelar requests pendientes al navegar entre módulos
 */
@Injectable({
  providedIn: 'root'
})
export class RequestCancellationService {
  private globalCancelSubject = new Subject<void>();
  
  // Observable global para cancelar todos los requests
  public globalCancel$ = this.globalCancelSubject.asObservable();
  
  /**
   * Cancela todos los requests pendientes
   * Se debe llamar al cambiar de ruta/módulo
   */
  cancelAllRequests(): void {
    this.globalCancelSubject.next();
  }
  
  /**
   * Crea un Subject específico para un componente
   * @returns Subject para cancelación específica
   */
  createComponentCancellation(): Subject<void> {
    return new Subject<void>();
  }
}