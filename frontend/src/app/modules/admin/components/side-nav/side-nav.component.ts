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
        { icon: 'fas fa-users', text: 'Empleados', link: '/admin/empleados' },
        { icon: 'fas fa-user-friends', text: 'Clientes', link: '/admin/clientes' },
        // espacio vacío para Colaboradores (placeholder)
        { icon: 'fas fa-user-tie', text: 'Colaboradores', link: '/admin/colaboradores' }
      ]
    },
    {
      text: 'Administración',
      items: [
        { icon: 'fas fa-boxes', text: 'Inventarios', link: '/admin/inventarios' },
        { icon: 'fas fa-tv', text: 'Equipos', link: '/admin/equipos' },
        { icon: 'fas fa-chart-bar', text: 'Reportes', link: '/admin/reportes' },
        { icon: 'fas fa-cash-register', text: 'PuntoVenta', link: '/admin/punto-venta' }
      ]
    }
    ,
    // Operaciones sección removida según solicitud
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
