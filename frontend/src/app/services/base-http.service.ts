import { Injectable, OnDestroy } from '@angular/core';
import { Subject, Observable, of, throwError } from 'rxjs';
import { takeUntil, switchMap, debounceTime, finalize, catchError } from 'rxjs/operators';

/**
 * Servicio base para manejo de requests HTTP con protección contra timeouts
 * Proporciona métodos reutilizables para todos los módulos
 */
@Injectable({
  providedIn: 'root'
})
export class BaseHttpService {
  
  /**
   * Ejecuta un request HTTP con cancelación automática al destruir componente
   * @param request$ Observable del request HTTP
   * @param destroy$ Subject para cancelación al destruir componente
   * @param loadingCallback Callback opcional para manejo de loading state
   * @returns Observable con el resultado - sin modificaciones de timeout
   */
  executeRequest<T>(
    request$: Observable<T>, 
    destroy$: Subject<void>,
    loadingCallback?: (loading: boolean) => void
  ): Observable<T> {
    if (loadingCallback) loadingCallback(true);
    
    return request$.pipe(
      takeUntil(destroy$),
      finalize(() => {
        if (loadingCallback) loadingCallback(false);
      })
    );
  }

  /**
   * Crea un Subject para búsqueda con debounce y protección contra timeouts
   * @param searchSubject Subject para emitir términos de búsqueda
   * @param destroy$ Subject para cancelación
   * @param searchFn Función que ejecuta la búsqueda
   * @param debounceMs Tiempo de debounce (default: 250ms - rápido pero controlado)
   * @returns Observable para suscribirse
   */
  createSearchHandler<T>(
    searchSubject: Subject<string>,
    destroy$: Subject<void>,
    searchFn: (term: string) => Observable<T>,
    debounceMs: number = 250
  ): Observable<T> {
    return searchSubject.pipe(
      debounceTime(debounceMs),
      switchMap(term => this.executeRequest(searchFn(term), destroy$)),
      takeUntil(destroy$)
    );
  }

  /**
   * Crea un Subject para paginación con protección contra timeouts
   * @param pageSubject Subject para emitir números de página
   * @param destroy$ Subject para cancelación
   * @param pageFn Función que ejecuta el cambio de página
   * @param debounceMs Tiempo de debounce (default: 100ms - muy responsivo)
   * @returns Observable para suscribirse
   */
  createPaginationHandler<T>(
    pageSubject: Subject<number>,
    destroy$: Subject<void>,
    pageFn: (page: number) => Observable<T>,
    debounceMs: number = 100
  ): Observable<T> {
    return pageSubject.pipe(
      debounceTime(debounceMs),
      switchMap(page => this.executeRequest(pageFn(page), destroy$)),
      takeUntil(destroy$)
    );
  }
}