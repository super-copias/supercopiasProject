import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../services/auth.service';

@Component({
  selector: 'app-side-nav',
  templateUrl: './side-nav.component.html',
  styleUrls: ['./side-nav.component.scss']
})
export class SideNavComponent {
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
    this.router.navigate(['/login']);
  }
}