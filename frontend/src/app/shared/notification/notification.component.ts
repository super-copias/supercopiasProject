/**
 * Componente de Notificaciones - SuperCopias
 * Muestra notificaciones tipo toast en la esquina superior derecha
 */

import { Component, ChangeDetectorRef } from '@angular/core';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-notification',
  template: `
    <div class="notification-container">
      <div *ngFor="let notification of getNotifications()" 
           class="alert alert-{{getAlertClass(notification.type)}} alert-dismissible fade show notification-item"
           role="alert">
        <div class="d-flex align-items-start">
          <i class="{{getIcon(notification.type)}} me-2 mt-1"></i>
          <div class="flex-grow-1">
            <strong *ngIf="notification.title">{{notification.title}}</strong>
            <div [innerHTML]="notification.message"></div>
          </div>
          <button type="button" class="btn-close" (click)="remove(notification.id)" aria-label="Close"></button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .notification-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      max-width: 400px;
      width: 100%;
      pointer-events: none;
    }

    .notification-item {
      margin-bottom: 10px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      border-left: 4px solid;
      animation: slideInRight 0.3s ease-out;
      pointer-events: auto;
    }

    .notification-item.alert-success {
      border-left-color: #198754;
    }

    .notification-item.alert-danger {
      border-left-color: #dc3545;
    }

    .notification-item.alert-warning {
      border-left-color: #ffc107;
    }

    .notification-item.alert-info {
      border-left-color: #0dcaf0;
    }

    @keyframes slideInRight {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @media (max-width: 576px) {
      .notification-container {
        left: 10px;
        right: 10px;
        max-width: none;
      }
    }
  `]
})
export class NotificationComponent {
  constructor(
    public notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  getNotifications() {
    return this.notificationService.notifications;
  }

  remove(id: string) {
    this.notificationService.remove(id);
    this.cdr.detectChanges();
  }

  getAlertClass(type: string): string {
    switch (type) {
      case 'success': return 'success';
      case 'error': return 'danger';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'secondary';
    }
  }

  getIcon(type: string): string {
    switch (type) {
      case 'success': return 'fas fa-check-circle text-success';
      case 'error': return 'fas fa-exclamation-circle text-danger';
      case 'warning': return 'fas fa-exclamation-triangle text-warning';
      case 'info': return 'fas fa-info-circle text-info';
      default: return 'fas fa-bell';
    }
  }
}
