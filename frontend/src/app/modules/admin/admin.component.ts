import { Component, HostListener, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';

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

  constructor(public auth: AuthService) {}

  ngOnInit(): void {
    this.updateForWidth(window.innerWidth);
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
}
