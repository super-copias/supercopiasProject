import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { Router } from '@angular/router';
import { InventariosService, Articulo, Departamento, DepartamentoConArticulos, EstadisticasInventario } from '../../../../services/inventarios.service';
import { NotificationService } from '../../../../services/notification.service';

@Component({
  selector: 'app-inventarios-list',
  templateUrl: './inventarios-list.component.html',
  styleUrls: ['./inventarios-list.component.scss']
})
export class InventariosListComponent implements OnInit, OnDestroy {

  // ── Estado de vista ────────────────────────────────────────────────────────
  vistaActiva: 'vacia' | 'acordeon' | 'busqueda' = 'vacia';
  loading = false;

  // ── Datos ──────────────────────────────────────────────────────────────────
  departamentosConArticulos: DepartamentoConArticulos[] = [];
  resultadosBusqueda: Articulo[] = [];
  departamentos: Departamento[] = [];
  alertas: any[] = [];
  estadisticas: EstadisticasInventario | null = null;
  mostrarAlertas = false;

  // ── Acordeón ───────────────────────────────────────────────────────────────
  seccionesAbiertas = new Set<number>();

  // ── Filtros ────────────────────────────────────────────────────────────────
  filtroBusqueda = '';
  filtroDepartamento: number | '' = '';
  filtroTipo = '';

  // ── Paginación (vista búsqueda) ────────────────────────────────────────────
  page = 1;
  total = 0;
  pages = 1;
  limit = 15;
  get paginasArray(): number[] {
    return Array.from({ length: Math.min(this.pages, 7) }, (_, i) => i + 1);
  }

  private destroy$ = new Subject<void>();
  private busqueda$ = new Subject<void>();

  constructor(
    private inventariosService: InventariosService,
    private router: Router,
    private notif: NotificationService
  ) {}

  ngOnInit() {
    this.cargarDepartamentos();
    this.cargarEstadisticas();
    this.cargarAlertas();

    // Debounce para búsqueda por texto — siempre escucha
    this.busqueda$.pipe(debounceTime(350), takeUntil(this.destroy$))
      .subscribe(() => this.ejecutarBusquedaOFiltro());
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Carga inicial ──────────────────────────────────────────────────────────

  private cargarDepartamentos() {
    this.inventariosService.getDepartamentos().subscribe({
      next: r => { if (r.success) this.departamentos = r.data || []; }
    });
  }

  private cargarEstadisticas() {
    this.inventariosService.getEstadisticas().subscribe({
      next: r => { if (r.success) this.estadisticas = r.data; }
    });
  }

  private cargarAlertas() {
    this.inventariosService.getAlertas().subscribe({
      next: r => {
        if (r.success) {
          this.alertas = r.data || [];
          this.mostrarAlertas = this.alertas.length > 0;
        }
      }
    });
  }

  // ── Vista acordeón (Ver todos) ─────────────────────────────────────────────

  verTodos() {
    const params: any = {};
    if (this.filtroDepartamento) params.departamento_id = this.filtroDepartamento;
    if (this.filtroTipo) params.tipo = this.filtroTipo;

    this.loading = true;
    this.inventariosService.getInventariosPorDepartamento(params).subscribe({
      next: r => {
        this.loading = false;
        if (r.success) {
          this.departamentosConArticulos = r.data || [];
          // Iniciar todos los departamentos contraídos
          this.seccionesAbiertas.clear();
          this.vistaActiva = 'acordeon';
        }
      },
      error: () => { this.loading = false; this.notif.error('Error al cargar inventario'); }
    });
  }

  toggleSeccion(id: number) {
    if (this.seccionesAbiertas.has(id)) this.seccionesAbiertas.delete(id);
    else this.seccionesAbiertas.add(id);
  }

  estaAbierto(id: number): boolean { return this.seccionesAbiertas.has(id); }

  // ── Búsqueda y filtros ─────────────────────────────────────────────────────

  onFiltroChange() {
    this.busqueda$.next();
  }

  ejecutarBusquedaOFiltro() {
    const hayTexto = this.filtroBusqueda.trim().length > 0;
    const hayDepto = !!this.filtroDepartamento;
    const hayTipo = !!this.filtroTipo;

    // Sin ningún filtro → vista vacía
    if (!hayTexto && !hayDepto && !hayTipo) {
      this.vistaActiva = 'vacia';
      return;
    }
    // Solo departamento (sin texto) → acordeón filtrado
    if (!hayTexto && hayDepto && !hayTipo) {
      this.verTodos();
      return;
    }
    // Cualquier texto o combinación → lista paginada
    this.cargarListaBusqueda(1);
  }

  cargarListaBusqueda(p: number) {
    if (p < 1 || p > this.pages) return;
    this.page = p;
    this.loading = true;

    const params: any = { page: p, limit: this.limit };
    if (this.filtroBusqueda.trim()) {
      // Búsqueda por texto: independiente de los demás filtros
      params.q = this.filtroBusqueda.trim();
    } else {
      // Sin texto: aplica departamento y tipo
      if (this.filtroDepartamento) params.departamento_id = this.filtroDepartamento;
      if (this.filtroTipo) params.tipo = this.filtroTipo;
    }

    this.inventariosService.getInventarios(params).subscribe({
      next: r => {
        this.loading = false;
        if (r.success) {
          this.resultadosBusqueda = r.data || [];
          this.total = r.pagination?.total || 0;
          this.pages = r.pagination?.pages || 1;
          this.vistaActiva = 'busqueda';
        }
      },
      error: () => { this.loading = false; this.notif.error('Error al buscar'); }
    });
  }

  limpiarFiltros() {
    this.filtroBusqueda = '';
    this.filtroDepartamento = '';
    this.filtroTipo = '';
    this.vistaActiva = 'vacia';
    this.resultadosBusqueda = [];
    this.departamentosConArticulos = [];
  }

  limpiarBusqueda() {
    this.filtroBusqueda = '';
    this.onFiltroChange();
  }

  // ── Navegación ─────────────────────────────────────────────────────────────

  nuevo() { this.router.navigate(['/admin/inventarios/nuevo']); }
  verDetalle(id: number) { this.router.navigate(['/admin/inventarios/detalle', id]); }
  editar(id: number) { this.router.navigate(['/admin/inventarios/editar', id]); }
  verHistorial() { this.router.navigate(['/admin/inventarios/movimientos']); }
  verDepartamentos() { this.router.navigate(['/admin/inventarios/departamentos']); }
  ocultarAlertas() { this.mostrarAlertas = false; }

  // ── Acciones sobre artículos ───────────────────────────────────────────────

  archivar(art: Articulo) {
    if (!confirm(`¿Archivar "${art.nombre}"? El artículo quedará oculto pero conservará su historial.`)) return;
    this.inventariosService.archivarInventario(art.id!, true).subscribe({
      next: r => {
        this.notif.success(r.message || 'Artículo archivado');
        this.refrescarVista();
        this.cargarEstadisticas();
      },
      error: e => this.notif.error(e.error?.message || 'Error al archivar')
    });
  }

  eliminar(art: Articulo) {
    if (!confirm(`¿Eliminar PERMANENTEMENTE "${art.nombre}"?\n⚠ Esta acción no se puede deshacer. Se recomienda archivar en su lugar.`)) return;
    this.inventariosService.deleteInventario(art.id!).subscribe({
      next: () => {
        this.notif.success('Artículo eliminado');
        this.refrescarVista();
        this.cargarEstadisticas();
        this.cargarAlertas();
      },
      error: e => this.notif.error(e.error?.message || 'Error al eliminar')
    });
  }

  private refrescarVista() {
    if (this.vistaActiva === 'acordeon') this.verTodos();
    else if (this.vistaActiva === 'busqueda') this.cargarListaBusqueda(this.page);
  }

  // ── Helpers de presentación ────────────────────────────────────────────────

  getBadgeStock(art: any): string { return this.inventariosService.getBadgeClass(art?.nivel_stock || 'sin_stock'); }
  getStockLabel(art: any): string { return this.inventariosService.getStockLabel(art); }
  getTipoIcon(art: any): string { return this.inventariosService.getTipoIcon(art); }
  formatCurrency(v: number): string { return this.inventariosService.formatCurrency(v); }
}
