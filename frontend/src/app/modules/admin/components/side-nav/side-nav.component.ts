import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../services/auth.service';

@Component({
  selector: 'app-side-nav',
  templateUrl: './side-nav.component.html',
  styleUrls: ['./side-nav.component.scss']
})
export class SideNavComponent implements OnChanges {
  @Input() collapsed = false;
  @Input() mobileOpen = false;
  @Output() requestClose = new EventEmitter<void>();
  menuItems = [
    {
      text: 'Principal',
      items: [
        { icon: 'fas fa-tachometer-alt', text: 'Dashboard', link: '/admin' },
        { icon: 'fas fa-users', text: 'Gestión de Empleados', link: '/admin/empleados' },
        { icon: 'fas fa-user-friends', text: 'Gestión de Clientes', link: '/admin/clientes' }
      ]
    },
    {
      text: 'Operaciones',
      items: [
        { icon: 'fas fa-copy', text: 'Servicios de Copias', link: '/admin/servicios' },
        { icon: 'fas fa-print', text: 'Estado de Impresoras', link: '/admin/impresoras' },
        { icon: 'fas fa-tasks', text: 'Trabajos Pendientes', link: '/admin/trabajos' }
      ]
    },
    {
      text: 'Administración',
      items: [
        { icon: 'fas fa-chart-bar', text: 'Reportes', link: '/admin/reportes' },
        { icon: 'fas fa-cog', text: 'Configuración', link: '/admin/configuracion' }
      ]
    }
  ];

  constructor(
    public auth: AuthService,
    private router: Router
  ) {}

  logout() {
    this.auth.logout();
  }

  onNavItemClick() {
    // if in mobile overlay mode, request to close after navigating
    if (this.mobileOpen && window.innerWidth < 768) {
      this.requestClose.emit();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['mobileOpen']) {
      console.log('[SideNav] mobileOpen changed ->', changes['mobileOpen'].currentValue);
    }
    if (changes['collapsed']) {
      console.log('[SideNav] collapsed changed ->', changes['collapsed'].currentValue);
    }
  }
}
