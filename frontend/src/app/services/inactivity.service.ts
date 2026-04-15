import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { fromEvent, merge, Subscription } from 'rxjs';
import { throttleTime } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';

/**
 * Servicio de Inactividad - SuperCopias
 * Detecta inactividad del usuario y cierra la sesión tras 15 minutos.
 * - Avisa al usuario 2 minutos antes del cierre.
 * - Envía heartbeat al backend cada 2 minutos si hay actividad.
 * - Cualquier evento de usuario (mouse, teclado, scroll, touch) reinicia el timer.
 */
@Injectable({ providedIn: 'root' })
export class InactivityService implements OnDestroy {

  private readonly TIMEOUT_MS   = 15 * 60 * 1000; // 15 minutos
  private readonly WARNING_MS   =  2 * 60 * 1000; // Advertir 2 min antes del cierre
  private readonly HEARTBEAT_MS =  2 * 60 * 1000; // Frecuencia máxima del heartbeat

  // PRUEBAS
    //private readonly TIMEOUT_MS   = 30 * 1000; // 30 segundos (cierre)
    //private readonly WARNING_MS   = 15 * 1000; // aviso 15 seg antes del cierre
    //private readonly HEARTBEAT_MS =  10 * 1000; // heartbeat cada 10 seg

  private activitySub:  Subscription | null = null;
  private heartbeatSub: Subscription | null = null;
  private warningTimer: ReturnType<typeof setTimeout> | null = null;
  private logoutTimer:  ReturnType<typeof setTimeout> | null = null;
  private warningShown = false;

  constructor(
    private authService:      AuthService,
    private notifications:    NotificationService,
    private ngZone:           NgZone
  ) {}

  /**
   * Iniciar monitoreo de inactividad.
   * Llamar cuando el usuario inicia sesión.
   */
  start(): void {
    this.stop(); // Limpiar cualquier estado previo

    this.ngZone.runOutsideAngular(() => {
      const activity$ = merge(
        fromEvent(document, 'mousemove'),
        fromEvent(document, 'keydown'),
        fromEvent(document, 'click'),
        fromEvent(document, 'scroll'),
        fromEvent(document, 'touchstart')
      );

      // Heartbeat al backend: máximo 1 vez cada 2 minutos
      this.heartbeatSub = activity$.pipe(
        throttleTime(this.HEARTBEAT_MS)
      ).subscribe(() => {
        this.authService.activityHeartbeat().subscribe();
      });

      // Reiniciar timers ante cualquier actividad
      this.activitySub = activity$.subscribe(() => {
        this.resetTimers();
      });

      this.resetTimers();
    });
  }

  /**
   * Detener monitoreo de inactividad.
   * Llamar cuando el usuario cierra sesión.
   */
  stop(): void {
    this.activitySub?.unsubscribe();
    this.heartbeatSub?.unsubscribe();
    this.activitySub  = null;
    this.heartbeatSub = null;
    this.clearTimers();
    this.warningShown = false;
  }

  private resetTimers(): void {
    if (!this.warningShown) {
      // Solo reiniciar si la advertencia aún no está activa para no ser demasiado permisivo
      this.clearTimers();
      this.scheduleTimers();
    } else {
      // Si el usuario actuó durante la ventana de advertencia, reiniciar completamente
      this.clearTimers();
      this.warningShown = false;
      this.scheduleTimers();
    }
  }

  private scheduleTimers(): void {
    this.warningTimer = setTimeout(() => {
      this.ngZone.run(() => this.showWarning());
    }, this.TIMEOUT_MS - this.WARNING_MS);

    this.logoutTimer = setTimeout(() => {
      this.ngZone.run(() => this.doLogout());
    }, this.TIMEOUT_MS);
  }

  private clearTimers(): void {
    if (this.warningTimer) { clearTimeout(this.warningTimer); this.warningTimer = null; }
    if (this.logoutTimer)  { clearTimeout(this.logoutTimer);  this.logoutTimer  = null; }
  }

  private showWarning(): void {
    this.warningShown = true;
    this.notifications.warning(
      'Tu sesión expirará en <strong>2 minutos</strong> por inactividad. ' +
      'Mueve el ratón o presiona una tecla para continuar.',
      'Sesión por expirar',
      120000 // visible los 2 minutos restantes
    );
  }

  private doLogout(): void {
    this.stop();
    this.authService.logoutByInactivity();
  }

  ngOnDestroy(): void {
    this.stop();
  }
}
