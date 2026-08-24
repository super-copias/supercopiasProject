import { Injectable } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

/**
 * Recuerda la posición de scroll de una vista antes de navegar a otra
 * (detalle/editar/nuevo) y la restaura al volver.
 *
 * Por qué no basta con `scrollPositionRestoration: 'enabled'` del Router:
 * ese mecanismo restaura el scroll apenas termina la navegación (NavigationEnd),
 * pero el contenido de listas/detalles se carga después vía HTTP. Restaura
 * contra una página aún vacía/corta y luego el contenido crece sin corregirse,
 * dando la sensación de que "siempre vuelve al inicio". Este servicio se
 * invoca manualmente después de que los datos ya están en el DOM.
 *
 * Por qué no usa `router.getCurrentNavigation()`: esa API solo es fiable
 * dentro de guards/resolvers/constructor del componente — para cuando el
 * componente llega a ngOnInit muchas veces ya devuelve null (timing conocido
 * de Angular), así que la detección de "volví con Atrás" fallaba en
 * silencio. En vez de eso, este servicio escucha `NavigationStart` (el
 * primer evento de cualquier navegación, disparado antes de instanciar el
 * componente) y guarda su trigger; los componentes lo leen en su propio
 * constructor, que corre de forma síncrona justo después.
 *
 * Además del offset en píxeles, `save()` acepta el id del elemento sobre el
 * que se hizo click (marcado en el template con `data-scroll-id`). Si al
 * restaurar ese elemento sigue en el DOM y visible, se hace scrollIntoView
 * sobre él en vez de saltar a un pixel — igual de preciso que el flujo de
 * "guardar y enfocar" que ya usan las vistas de acordeón, pero aplicado de
 * forma genérica a cualquier "Cancelar"/"Volver" (que ya pasa por aquí vía
 * Location.back()), sin tener que duplicar esa lógica en cada componente.
 */
@Injectable({ providedIn: 'root' })
export class ScrollMemoryService {
  private positions = new Map<string, { y: number; elementId?: string }>();
  private lastTrigger: 'imperative' | 'popstate' | 'hashchange' | null = null;

  constructor(router: Router) {
    router.events
      .pipe(filter((e): e is NavigationStart => e instanceof NavigationStart))
      .subscribe(e => { this.lastTrigger = e.navigationTrigger; });
  }

  /**
   * Guarda el scroll actual bajo `key`, justo antes de navegar fuera de la
   * vista. `elementId` (opcional) es el valor de `data-scroll-id` del
   * elemento sobre el que se hizo click, para poder re-enfocarlo exactamente
   * al volver en vez de solo restaurar el offset en píxeles.
   */
  save(key: string, elementId?: string): void {
    this.positions.set(key, { y: window.scrollY, elementId });
  }

  /** true si la navegación que está creando el componente actual vino de "Atrás". */
  isBackNavigation(): boolean {
    return this.lastTrigger === 'popstate';
  }

  /**
   * Restaura, una sola vez, el scroll guardado para `key` — solo si `isBack`
   * es true (se volvió por Location.back()/botón "Atrás", no una entrada
   * nueva a la vista). Debe llamarse después de que el contenido async ya
   * esté renderizado; usa doble requestAnimationFrame para esperar el pintado.
   */
  restore(key: string, isBack: boolean): void {
    const target = this.positions.get(key);
    this.positions.delete(key);
    if (!isBack || !target) return;

    requestAnimationFrame(() => requestAnimationFrame(() => {
      const el = target.elementId ? this.findVisible(target.elementId) : null;
      if (el) el.scrollIntoView({ block: 'center' });
      else window.scrollTo(0, target.y);
    }));
  }

  /**
   * Busca por `data-scroll-id` y devuelve el primer match visible. Algunas
   * vistas (p. ej. tabla de escritorio + tarjetas de móvil) renderizan el
   * mismo ítem dos veces y ocultan una copia por CSS, así que no basta con
   * el primer match del DOM.
   */
  private findVisible(elementId: string): HTMLElement | null {
    const matches = document.querySelectorAll<HTMLElement>(`[data-scroll-id="${elementId}"]`);
    for (const el of Array.from(matches)) {
      if (el.offsetParent !== null) return el;
    }
    return null;
  }
}
