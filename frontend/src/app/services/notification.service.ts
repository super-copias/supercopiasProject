/**
 * Servicio de Notificaciones - SuperCopias
 * Maneja notificaciones de éxito, error, advertencia e información
 * Usa alerts de Bootstrap con auto-hide
 */

import { Injectable, ApplicationRef } from '@angular/core';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  title?: string;
  duration?: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  public notifications: Notification[] = [];

  constructor(private appRef: ApplicationRef) {}

  /**
   * Mostrar notificación de éxito
   */
  success(message: string, title: string = '¡Éxito!', duration: number = 3000) {
    this.show('success', message, title, duration);
  }

  /**
   * Mostrar notificación de error
   */
  error(message: string, title: string = 'Error', duration: number = 5000) {
    this.show('error', message, title, duration);
  }

  /**
   * Mostrar notificación de advertencia
   */
  warning(message: string, title: string = 'Advertencia', duration: number = 4000) {
    this.show('warning', message, title, duration);
  }

  /**
   * Mostrar notificación de información
   */
  info(message: string, title: string = 'Información', duration: number = 3000) {
    this.show('info', message, title, duration);
  }

  /**
   * Mostrar notificación genérica
   */
  private show(type: 'success' | 'error' | 'warning' | 'info', message: string, title?: string, duration: number = 3000) {
    const notification: Notification = {
      id: this.generateId(),
      type,
      message,
      title,
      duration
    };
    this.notifications.push(notification);
    
    // Forzar detección de cambios
    this.appRef.tick();

    // Auto-eliminar después del tiempo especificado
    if (duration > 0) {
      setTimeout(() => {
        this.remove(notification.id);
      }, duration);
    }
  }

  /**
   * Eliminar una notificación por ID
   */
  remove(id: string) {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.appRef.tick();
  }

  /**
   * Generar ID único para la notificación
   */
  private generateId(): string {
    return `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
