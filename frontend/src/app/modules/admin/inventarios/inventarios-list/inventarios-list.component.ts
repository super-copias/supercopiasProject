import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { Location } from '@angular/common';
import { InventariosService, Articulo, Departamento, DepartamentoConArticulos, EstadisticasInventario } from '../../../../services/inventarios.service';
import { NotificationService } from '../../../../services/notification.service';
import { ScrollMemoryService } from '../../../../services/scroll-memory.service';

@Component({
  selector: 'app-inventarios-list',
  templateUrl: './inventarios-list.component.html',
  styleUrls: ['./inventarios-list.component.scss']
})
export class InventariosListComponent implements OnInit, OnDestroy {

  // ── Estado de vista ────────────────────────────────────────────────────────
  vistaActiva: 'vacia' | 'acordeon' | 'busqueda' | 'archivados' = 'vacia';
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
  private focusArtId: number | null = null;

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

  // ── Archivados ─────────────────────────────────────────────────────────────
  articulosArchivados: Articulo[] = [];
  pageArchivados = 1;
  totalArchivados = 0;
  pagesArchivados = 1;
  get paginasArchivadosArray(): number[] {
    return Array.from({ length: Math.min(this.pagesArchivados, 7) }, (_, i) => i + 1);
  }

  private destroy$ = new Subject<void>();
  private busqueda$ = new Subject<void>();

  // Clave de memoria de scroll para esta lista, y si la carga actual del
  // componente vino de un "Atrás" (para decidir si corresponde restaurar).
  private readonly scrollKey = 'inventarios-list';
  private readonly isBackNav: boolean;

  constructor(
    private inventariosService: InventariosService,
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private notif: NotificationService,
    private scrollMemory: ScrollMemoryService
  ) {
    // Se captura aquí (no en ngOnInit): en ngOnInit, router.getCurrentNavigation()
    // suele devolver null; el constructor corre justo tras NavigationStart.
    this.isBackNav = this.scrollMemory.isBackNavigation();
  }

  ngOnInit() {
    this.cargarDepartamentos();
    this.cargarEstadisticas();
    this.cargarAlertas();

    // La URL (query params) es la fuente de verdad del estado de la lista:
    // filtros, página, vista activa, secciones abiertas del acordeón y el
    // artículo a enfocar. Cualquier cambio (clicks del usuario, botón "Atrás"
    // del navegador, o volver desde detalle/editar) pasa por aquí.
    this.route.queryParamMap.pipe(takeUntil(this.destroy$))
      .subscribe(params => this.leerParamsYCargar(params));

    // Debounce para búsqueda por texto
    this.busqueda$.pipe(debounceTime(350), takeUntil(this.destroy$))
      .subscribe(() => {
        const q = this.filtroBusqueda.trim();
        this.updateQueryParams({
          q: q || null, depto: null, tipo: null, page: null,
          vista: q ? 'busqueda' : null, open: null, focus: null
        });
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Carga inicial (independiente de la vista/filtros) ──────────────────────

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

  // ── Lectura de query params → estado + carga de la vista correspondiente ───

  private leerParamsYCargar(params: ParamMap) {
    this.filtroBusqueda = params.get('q') || '';
    this.filtroDepartamento = Number(params.get('depto')) || '';
    this.filtroTipo = params.get('tipo') || '';
    this.page = Number(params.get('page')) || 1;
    this.pageArchivados = Number(params.get('pageArch')) || 1;

    const openCsv = params.get('open');
    this.seccionesAbiertas = new Set(openCsv ? openCsv.split(',').map(Number) : []);
    this.focusArtId = Number(params.get('focus')) || null;

    switch (params.get('vista')) {
      case 'archivados': this.cargarArchivadosFetch(); break;
      case 'acordeon':   this.cargarAcordeonFetch(); break;
      case 'busqueda':   this.cargarBusquedaFetch(); break;
      default:           this.vistaActiva = 'vacia';
    }
  }

  // ── Navegación dirigida por query params ────────────────────────────────────
  // Actualiza la URL sobre el mismo componente (sin destruirlo/recrearlo);
  // la suscripción a queryParamMap se encarga de recargar los datos.
  private updateQueryParams(params: Record<string, any>, opts: { replaceUrl?: boolean } = {}) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
      replaceUrl: !!opts.replaceUrl
    });
  }

  /**
   * Igual que updateQueryParams pero sin pasar por el router: solo reescribe
   * la URL/historial. Con scrollPositionRestoration:'enabled' cualquier
   * router.navigate() manda la página al top; para ajustes puramente
   * cosméticos (qué acordeón quedó abierto) eso es justo lo que NO queremos.
   */
  private silentQueryParams(params: Record<string, any>) {
    const tree = this.router.createUrlTree([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge'
    });
    this.location.replaceState(this.router.serializeUrl(tree));
  }

  // ── Vista acordeón (Ver todos) ─────────────────────────────────────────────

  // Traduce filtroTipo al parámetro correcto para la API
  private getTipoParams(): any {
    const p: any = {};
    switch (this.filtroTipo) {
      case 'servicio': p.es_servicio = 'true';  break;   // servicios: tipo=venta + es_servicio=true
      case 'venta':    p.tipo = 'venta'; p.es_servicio = 'false'; break; // productos de venta (sin servicios)
      case 'insumo':   p.tipo = 'insumo';   break;
      case 'generico': p.tipo = 'generico'; break;
    }
    return p;
  }

  /** Botón "Ver todos": conserva los filtros actuales, solo cambia la vista. */
  verTodos() {
    this.updateQueryParams({ vista: 'acordeon' });
  }

  private cargarAcordeonFetch() {
    const params: any = {};
    if (this.filtroDepartamento) params.departamento_id = this.filtroDepartamento;
    Object.assign(params, this.getTipoParams());

    this.loading = true;
    this.inventariosService.getInventariosPorDepartamento(params).subscribe({
      next: r => {
        this.loading = false;
        if (r.success) {
          this.departamentosConArticulos = r.data || [];
          this.vistaActiva = 'acordeon';
          this.enfocarArticuloPendiente();
        }
        this.scrollMemory.restore(this.scrollKey, this.isBackNav);
      },
      error: () => { this.loading = false; this.notif.error('Error al cargar inventario'); }
    });
  }

  private enfocarArticuloPendiente() {
    const focusId = this.focusArtId;
    if (!focusId) return;

    if (!this.seccionesAbiertas.size || ![...this.seccionesAbiertas].some(id =>
      this.departamentosConArticulos.find(d => d.id === id)?.articulos?.some(a => a.id === focusId))) {
      const depto = this.departamentosConArticulos.find(d => d.articulos?.some(a => a.id === focusId));
      if (depto?.id) this.seccionesAbiertas.add(depto.id);
    }

    setTimeout(() => {
      const el = document.getElementById(`articulo-${focusId}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);

    // Ya se usó: se limpia de la URL para no volver a enfocar en futuras
    // navegaciones dentro de la misma vista (p. ej. al alternar filtros).
    // Silencioso: si esto pasara por el router, revertiría el scrollIntoView
    // de arriba mandando la página de vuelta al top.
    this.focusArtId = null;
    this.silentQueryParams({ focus: null });
  }

  toggleSeccion(id: number) {
    if (this.seccionesAbiertas.has(id)) this.seccionesAbiertas.delete(id);
    else this.seccionesAbiertas.add(id);

    // Persiste qué departamentos están expandidos en la URL para que
    // sobrevivan a un viaje a detalle/editar y al botón "Atrás". Silencioso
    // para no saltar al top de la página cada vez que se abre un acordeón.
    this.silentQueryParams({
      open: this.seccionesAbiertas.size ? [...this.seccionesAbiertas].join(',') : null
    });
  }

  estaAbierto(id: number): boolean { return this.seccionesAbiertas.has(id); }

  // ── Búsqueda y filtros ─────────────────────────────────────────────────────

  onFiltroChange() {
    // Búsqueda por texto: limpia los demás filtros (debounced)
    this.busqueda$.next();
  }

  onDepartamentoChange() {
    this.updateQueryParams({
      depto: this.filtroDepartamento || null, q: null, tipo: null, page: null,
      vista: this.filtroDepartamento ? 'acordeon' : null, open: null, focus: null
    });
  }

  onTipoChange() {
    this.updateQueryParams({
      tipo: this.filtroTipo || null, q: null, depto: null, page: null,
      vista: this.filtroTipo ? 'busqueda' : null, open: null, focus: null
    });
  }

  cargarListaBusqueda(p: number) {
    if (p < 1 || p > this.pages) return;
    this.updateQueryParams({ page: p });
  }

  private cargarBusquedaFetch() {
    this.loading = true;

    const params: any = { page: this.page, limit: this.limit };
    if (this.filtroBusqueda.trim()) {
      params.q = this.filtroBusqueda.trim();
    } else {
      if (this.filtroDepartamento) params.departamento_id = this.filtroDepartamento;
      Object.assign(params, this.getTipoParams());
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
        this.scrollMemory.restore(this.scrollKey, this.isBackNav);
      },
      error: () => { this.loading = false; this.notif.error('Error al buscar'); }
    });
  }

  limpiarFiltros() {
    // Reemplaza la URL sin query params: vuelve a la vista vacía inicial.
    this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }

  limpiarBusqueda() {
    this.limpiarFiltros();
  }

  // ── Navegación ─────────────────────────────────────────────────────────────

  nuevo() {
    this.scrollMemory.save(this.scrollKey);
    this.router.navigate(['/admin/inventarios/nuevo']);
  }
  verDetalle(id: number) {
    this.scrollMemory.save(this.scrollKey, 'articulo-' + id);
    this.router.navigate(['/admin/inventarios/detalle', id]);
  }
  editar(id: number, deptoId?: number | null) {
    this.scrollMemory.save(this.scrollKey, 'articulo-' + id);
    this.router.navigate(['/admin/inventarios/editar', id], {
      queryParams: {
        returnTo: 'lista',
        returnDept: deptoId || undefined,
        returnArticulo: id
      }
    });
  }
  verHistorial() {
    this.scrollMemory.save(this.scrollKey);
    this.router.navigate(['/admin/inventarios/movimientos']);
  }
  verDepartamentos() {
    this.scrollMemory.save(this.scrollKey);
    this.router.navigate(['/admin/inventarios/departamentos']);
  }
  ocultarAlertas() { this.mostrarAlertas = false; }

  verArchivados(p: number = 1) {
    if (p < 1) return;
    this.updateQueryParams({
      vista: 'archivados', pageArch: p, q: null, depto: null, tipo: null, page: null, open: null, focus: null
    });
  }

  private cargarArchivadosFetch() {
    this.loading = true;
    this.inventariosService.getInventarios({ incluirArchivados: 'true', page: this.pageArchivados, limit: this.limit }).subscribe({
      next: r => {
        this.loading = false;
        if (r.success) {
          this.articulosArchivados = r.data || [];
          this.totalArchivados = r.pagination?.total || 0;
          this.pagesArchivados = r.pagination?.pages || 1;
          this.vistaActiva = 'archivados';
        }
        this.scrollMemory.restore(this.scrollKey, this.isBackNav);
      },
      error: () => { this.loading = false; this.notif.error('Error al cargar archivados'); }
    });
  }

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

  desarchivar(art: Articulo) {
    if (!confirm(`¿Restaurar "${art.nombre}"? El artículo volverá a estar disponible en el inventario.`)) return;
    this.inventariosService.archivarInventario(art.id!, false).subscribe({
      next: r => {
        this.notif.success(r.message || 'Artículo restaurado');
        this.cargarArchivadosFetch();
        this.cargarEstadisticas();
      },
      error: e => this.notif.error(e.error?.message || 'Error al restaurar')
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

  /** Refresca en el sitio la vista actual tras una acción (crear/editar/archivar/eliminar). */
  private refrescarVista() {
    if (this.vistaActiva === 'acordeon') this.cargarAcordeonFetch();
    else if (this.vistaActiva === 'busqueda') this.cargarBusquedaFetch();
    else if (this.vistaActiva === 'archivados') this.cargarArchivadosFetch();
  }

  // ── Helpers de presentación ────────────────────────────────────────────────

  getBadgeStock(art: any): string { return this.inventariosService.getBadgeClass(art?.nivel_stock || 'sin_stock'); }
  getStockLabel(art: any): string { return this.inventariosService.getStockLabel(art); }
  getTipoIcon(art: any): string { return this.inventariosService.getTipoIcon(art); }
  formatCurrency(v: number): string { return this.inventariosService.formatCurrency(v); }
}
