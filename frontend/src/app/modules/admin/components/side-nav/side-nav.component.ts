import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../services/auth.service';
import { ModuleGuard } from '../../../../services/module.guard';

@Component({
  selector: 'app-side-nav',
  templateUrl: './side-nav.component.html',
  styleUrls: ['./side-nav.component.scss']
})
export class SideNavComponent implements OnChanges, OnInit {
  @Input() collapsed = false;
  @Input() mobileOpen = false;
  @Output() requestClose = new EventEmitter<void>();
  
  allMenuItems = [
    {
      text: 'Principal',
      items: [
        { icon: 'fas fa-tachometer-alt', text: 'Dashboard', link: '/admin/dashboard', module: 'dashboard' },
        { icon: 'fas fa-users', text: 'Empleados', link: '/admin/empleados', module: 'empleados' },
        { icon: 'fas fa-user-friends', text: 'Clientes', link: '/admin/clientes', module: 'clientes' },
        { icon: 'fas fa-store', text: 'Proveedores', link: '/admin/proveedores', module: 'proveedores' }
      ]
    },
    {
      text: 'Administración',
      items: [
        { icon: 'fas fa-boxes', text: 'Inventarios', link: '/admin/inventarios', module: 'inventarios' },
        { icon: 'fas fa-tv', text: 'Equipos', link: '/admin/equipos', module: 'equipos' },
        { icon: 'fas fa-chart-bar', text: 'Reportes', link: '/admin/reportes', module: 'reportes' },
        { icon: 'fas fa-file-invoice-dollar', text: 'Facturación', link: '/admin/facturacion', module: 'facturacion' },
        { icon: 'fas fa-cash-register', text: 'Punto de Venta', link: '/admin/punto-venta', module: 'punto_venta' }
      ]
    }
  ];

  menuItems: any[] = [];

  constructor(
    public auth: AuthService,
    private moduleGuard: ModuleGuard,
    private router: Router
  ) {}

  ngOnInit() {
    this.filterMenuItems();
  }

  /**
   * Filtrar elementos del menú según los permisos del usuario
   */
  filterMenuItems() {
    this.menuItems = this.allMenuItems.map(section => ({
      text: section.text,
      items: section.items.filter(item => {
        // Si no tiene módulo especificado, permitir acceso
        if (!item.module) return true;
        // Verificar si el usuario tiene acceso al módulo
        return this.moduleGuard.isModuleAllowed(item.module);
      })
    })).filter(section => section.items.length > 0); // Solo mostrar secciones con elementos
  }

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
    }
    if (changes['collapsed']) {
    }
  }
}
