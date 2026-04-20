import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';
import { EmpleadosService } from '../../../../services/empleados.service';
import { ClientesService } from '../../../../services/clientes.service';
import { InventariosService } from '../../../../services/inventarios.service';
import { EquiposService } from '../../../../services/equipos.service';
import { PosService } from '../../../../services/pos.service';
import { ProveedoresService } from '../../../../services/proveedores.service';
import { AuthService } from '../../../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  loading = false;
  ultimaActualizacion: Date | null = null;

  // Info del usuario
  nombreUsuario = '';

  // Stats ventas del día
  statsVentas = {
    total_ventas: 0,
    total_ingresos: 0,
    ticket_promedio: 0,
    ventas_canceladas: 0,
    pagos_efectivo: 0,
    pagos_tarjeta: 0,
    pagos_transferencia: 0
  };

  // Stats pedidos
  statsPedidos = {
    pendiente: 0,
    en_proceso: 0,
    terminado: 0,
    finalizados_hoy: 0,
    activos: 0
  };

  // Clientes / empleados
  totalClientes = 0;
  totalEmpleados = 0;

  // Stats inventario
  statsInventario = {
    total_articulos: 0,
    total_productos: 0,
    total_servicios: 0,
    alertas_criticas: 0,
    alertas_bajas: 0,
    valor_total_inventario: 0
  };
  alertasInventario: any[] = [];

  // Stats equipos
  statsEquipos = {
    total_activos: 0,
    en_reparacion: 0,
    fotocopiadoras: 0,
    impresoras: 0
  };

  // Proveedores
  totalProveedores = 0;

  // Últimas ventas del día
  ultimasVentas: any[] = [];

  // Módulos del sistema para acceso rápido
  readonly modulos = [
    { label: 'Punto de Venta', icon: 'fas fa-cash-register', route: 'punto-venta', color: '#0d6efd', bg: '#e7f0ff' },
    { label: 'Pedidos', icon: 'fas fa-clipboard-list', route: 'punto-venta', color: '#fd7e14', bg: '#fff3e7' },
    { label: 'Clientes', icon: 'fas fa-users', route: 'clientes', color: '#198754', bg: '#e7f5ee' },
    { label: 'Empleados', icon: 'fas fa-user-tie', route: 'empleados', color: '#ffc107', bg: '#fffbe7' },
    { label: 'Inventarios', icon: 'fas fa-boxes', route: 'inventarios', color: '#0dcaf0', bg: '#e7fafd' },
    { label: 'Equipos', icon: 'fas fa-print', route: 'equipos', color: '#6f42c1', bg: '#f0ebff' },
    { label: 'Proveedores', icon: 'fas fa-truck', route: 'proveedores', color: '#20c997', bg: '#e7faf5' },
    { label: 'Facturación', icon: 'fas fa-file-invoice-dollar', route: 'facturacion', color: '#dc3545', bg: '#fdecea' },
    { label: 'Reportes', icon: 'fas fa-chart-bar', route: 'reportes', color: '#6c757d', bg: '#f1f3f5' },
  ];

  constructor(
    private authService: AuthService,
    private empleadosService: EmpleadosService,
    private clientesService: ClientesService,
    private inventariosService: InventariosService,
    private equiposService: EquiposService,
    private posService: PosService,
    private proveedoresService: ProveedoresService,
    private router: Router
  ) {}

  ngOnInit() {
    const user = this.authService.getCurrentUser();
    this.nombreUsuario = user?.nombre || (user as any)?.username || 'Usuario';
    this.cargarDashboard();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarDashboard() {
    this.loading = true;

    forkJoin({
      statsVentas:      this.posService.getStatsHoy().pipe(catchError(() => of({ success: false, data: null }))),
      statsPedidos:     this.posService.getStatsPedidos().pipe(catchError(() => of({ success: false, data: null }))),
      clientes:         this.clientesService.getList({ page: 1, limit: 1 }).pipe(catchError(() => of({ success: false, pagination: null }))),
      empleados:        this.empleadosService.getList({ page: 1, limit: 1 }).pipe(catchError(() => of({ success: false, pagination: null }))),
      statsInventario:  this.inventariosService.getEstadisticas().pipe(catchError(() => of({ success: false, data: null }))),
      alertasInventario:this.inventariosService.getAlertas().pipe(catchError(() => of({ success: false, data: [] }))),
      statsEquipos:     this.equiposService.getStats().pipe(catchError(() => of({ success: false, data: null }))),
      proveedores:      this.proveedoresService.getList({ page: 1, limit: 1 }).pipe(catchError(() => of({ success: false, pagination: null }))),
      ultimasVentas:    this.posService.listVentas({ page: 1, limit: 5 }).pipe(catchError(() => of({ success: false, data: [] }))),
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (r: any) => {
        if (r.statsVentas?.success && r.statsVentas.data)
          this.statsVentas = r.statsVentas.data;

        if (r.statsPedidos?.success && r.statsPedidos.data)
          this.statsPedidos = r.statsPedidos.data;

        if (r.clientes?.success)
          this.totalClientes = r.clientes.pagination?.total ?? 0;

        if (r.empleados?.success)
          this.totalEmpleados = r.empleados.pagination?.total ?? 0;

        if (r.statsInventario?.success && r.statsInventario.data)
          this.statsInventario = r.statsInventario.data;

        if (r.alertasInventario?.success)
          this.alertasInventario = (r.alertasInventario.data || []).slice(0, 5);

        if (r.statsEquipos?.success && r.statsEquipos.data)
          this.statsEquipos = r.statsEquipos.data;

        if (r.proveedores?.success)
          this.totalProveedores = r.proveedores.pagination?.total ?? 0;

        if (r.ultimasVentas?.success)
          this.ultimasVentas = r.ultimasVentas.data || [];

        this.ultimaActualizacion = new Date();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  recargar() { this.cargarDashboard(); }

  irA(ruta: string) { this.router.navigate(['/admin', ruta]); }

  formatCurrency(val: number): string {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val || 0);
  }

  getPagoPercent(count: number): number {
    const total = this.statsVentas.total_ventas || 1;
    return Math.round((count / total) * 100);
  }

  get fechaHoy(): string {
    return new Date().toLocaleDateString('es-MX', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  get totalAlertas(): number {
    return (this.statsInventario.alertas_criticas || 0) + (this.statsInventario.alertas_bajas || 0);
  }
}