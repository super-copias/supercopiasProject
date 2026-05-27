import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { fromEvent, merge, Subscription } from 'rxjs';
import { throttleTime } from 'rxjs/operators';

import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';

const INACTIVITY_LIMIT   = 60 * 60 * 1000;  // 1 hora
const WARN_BEFORE        =  5 * 60 * 1000;  // aviso 5 min antes del cierre
const HEARTBEAT_THROTTLE =  2 * 60 * 1000;  // heartbeat al backend cada 2 min máx

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];

@Injectable({ providedIn: 'root' })
export class InactivityService implements OnDestroy {
  private logoutTimer: any = null;
  private warnTimer:   any = null;
  private eventsSub:   Subscription | null = null;

  constructor(
    private ngZone:      NgZone,
    private authService: AuthService,
    private notify:      NotificationService,
  ) {}

  start(): void {
    this.stop();
    this.ngZone.runOutsideAngular(() => {
      this.eventsSub = merge(...ACTIVITY_EVENTS.map(e => fromEvent(document, e)))
        .pipe(throttleTime(HEARTBEAT_THROTTLE))
        .subscribe(() => {
          this.authService.activityHeartbeat().subscribe();
          this.ngZone.run(() => this.resetTimers());
        });
    });
    this.resetTimers();
  }

  stop(): void {
    clearTimeout(this.logoutTimer);
    clearTimeout(this.warnTimer);
    this.logoutTimer = null;
    this.warnTimer   = null;
    this.eventsSub?.unsubscribe();
    this.eventsSub   = null;
  }

  private resetTimers(): void {
    clearTimeout(this.logoutTimer);
    clearTimeout(this.warnTimer);

    this.warnTimer = setTimeout(() => {
      this.notify.warning(
        'Tu sesión se cerrará en 5 minutos por inactividad. Mueve el ratón o teclea para mantenerla activa.',
        'Aviso de sesión',
        10_000
      );
    }, INACTIVITY_LIMIT - WARN_BEFORE);

    this.logoutTimer = setTimeout(() => {
      this.ngZone.run(() => this.authService.logoutByInactivity());
    }, INACTIVITY_LIMIT);
  }

  ngOnDestroy(): void { this.stop(); }
}
