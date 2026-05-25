import { Injectable, OnDestroy } from '@angular/core';

/**
 * Servicio de Inactividad - SuperCopias
 * Funcionalidad deshabilitada: la sesión permanece activa hasta que el usuario
 * cierre sesión manualmente o cierre el navegador.
 */
@Injectable({ providedIn: 'root' })
export class InactivityService implements OnDestroy {

  start(): void {}

  stop(): void {}

  ngOnDestroy(): void {}
}
