import { Component, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * Componente base para manejo de lifecycle y cleanup automático
 * Proporciona funcionalidad común para todos los componentes
 */
@Component({
  template: ''
})
export abstract class BaseComponent implements OnDestroy {
  
  /**
   * Subject para manejo de unsubscribe automático
   * Usar con takeUntil(this.destroy$) en todos los observables
   */
  protected destroy$ = new Subject<void>();

  /**
   * Estado de loading común
   */
  protected loading = false;

  /**
   * Método para actualizar el estado de loading
   * @param loading Estado de loading
   */
  setLoading(loading: boolean): void {
    this.loading = loading;
  }

  /**
   * Cleanup automático al destruir el componente
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Método helper para manejo seguro de errores
   * @param error Error capturado
   * @param context Contexto donde ocurrió el error
   */
  protected handleError(error: any, context: string = 'Operation'): void {
    this.setLoading(false);
  }
}