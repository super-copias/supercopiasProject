import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { ConfigService } from './config.service';

@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
  private socket: Socket | null = null;
  private connected = false;

  constructor(private configService: ConfigService) {}

  /** Inicializa la conexión la primera vez que se necesite. */
  private connect(): Socket {
    if (this.socket && this.connected) return this.socket;

    const url = this.configService.apiUrl.replace(/\/api$/, '');
    this.socket = io(url, {
      // Solo WebSocket en producción; en desarrollo admite polling como fallback
      transports: ['websocket', 'polling'],
      withCredentials: true,
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      this.connected = true;
    });

    this.socket.on('disconnect', () => {
      this.connected = false;
    });

    return this.socket;
  }

  /**
   * Suscribe al cliente a la sala de un equipo específico y retorna
   * un Observable que emite cada vez que el servidor notifica un cambio
   * en el historial de contador del equipo.
   *
   * Uso en equipo-detalle.component.ts:
   *   this.socketService.onContadorUpdated(this.equipoId)
   *     .pipe(takeUntil(this.destroy$))
   *     .subscribe(() => this.loadHistoriales());
   */
  onContadorUpdated(equipoId: number): Observable<{ equipoId: number; registro: any }> {
    const socket = this.connect();
    socket.emit('join:equipo', equipoId);

    return new Observable((observer) => {
      const handler = (payload: { equipoId: number; registro: any }) => {
        observer.next(payload);
      };
      socket.on('equipo:contador:updated', handler);

      // Cuando el Observable se destruye (unsubscribe / takeUntil), salir de la sala
      return () => {
        socket.off('equipo:contador:updated', handler);
        socket.emit('leave:equipo', equipoId);
      };
    });
  }

  ngOnDestroy(): void {
    this.socket?.disconnect();
  }
}
