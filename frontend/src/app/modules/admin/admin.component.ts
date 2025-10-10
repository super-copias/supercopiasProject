import { Component, HostListener, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { RequestCancellationService } from '../../services/request-cancellation.service';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})
export class AdminComponent {
  // collapsed: reduce width on desktop
  collapsed = false;
  // mobileOpen: overlay visible on small screens
  mobileOpen = false;
  // showUserMenu: control user dropdown menu
  showUserMenu = false;

  constructor(
    public auth: AuthService,
    private router: Router,
    private cancellationService: RequestCancellationService
  ) {}

  ngOnInit(): void {
    this.updateForWidth(window.innerWidth);
    
    // Cancelación más selectiva - solo al cambiar entre módulos principales
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      // Solo cancelar en cambios significativos de módulo
      const currentUrl = event.url;
      if (this.isModuleChange(currentUrl)) {
        this.cancellationService.cancelAllRequests();
      }
    });
  }

  private isModuleChange(url: string): boolean {
    // Solo cancelar al cambiar entre módulos principales, no en sub-rutas
    return url.match(/\/admin\/(dashboard|empleados|clientes|inventarios|equipos|reportes|proveedores)$/) !== null;
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.updateForWidth(event.target.innerWidth);
  }

  updateForWidth(width: number) {
    // Consider mobile if below 768px
    if (width < 768) {
      // start hidden (mobile overlay closed)
      this.collapsed = true;
      this.mobileOpen = false;
    } else {
      // desktop: show expanded by default
      this.collapsed = false;
      this.mobileOpen = false;
    }
  }

  toggleSidebar(forceMobile: boolean = false) {
    // If forceMobile is true, always treat as mobile toggle (useful for mobile button)
    const isMobile = forceMobile || window.innerWidth < 768;
    if (isMobile) {
      this.mobileOpen = !this.mobileOpen;
      console.log('[Admin] toggleSidebar mobile (forced=', forceMobile, ') -> mobileOpen =', this.mobileOpen);
    } else {
      // toggle collapsed state on desktop
      this.collapsed = !this.collapsed;
      console.log('[Admin] toggleSidebar desktop -> collapsed =', this.collapsed);
    }
  }

  closeMobile() {
    this.mobileOpen = false;
  }

  /**
   * Toggle user dropdown menu
   */
  toggleUserMenu() {
    this.showUserMenu = !this.showUserMenu;
  }

  /**
   * Close user dropdown menu
   */
  closeUserMenu() {
    this.showUserMenu = false;
  }

  /**
   * Handle logout with menu close
   */
  logout() {
    this.closeUserMenu();
    this.auth.logout();
  }

  /**
   * Close user menu when clicking outside
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: any) {
    const userMenuButton = event.target.closest('#userMenu');
    const userMenuDropdown = event.target.closest('.dropdown-menu');
    
    if (!userMenuButton && !userMenuDropdown) {
      this.showUserMenu = false;
    }
  }
}
