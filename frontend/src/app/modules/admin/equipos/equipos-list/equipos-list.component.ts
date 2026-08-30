import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { EquiposService } from '../../../../services/equipos.service';
import { NotificationService } from '../../../../services/notification.service';
import { ScrollMemoryService } from '../../../../services/scroll-memory.service';

@Component({
  selector: 'app-equipos-list',
  templateUrl: './equipos-list.component.html',
  styleUrls: ['./equipos-list.component.scss']
})
export class EquiposListComponent implements OnInit, OnDestroy {
  equipos: any[] = [];
  alertas: any[] = [];
  mostrarAlertas = true;
  Math = Math; // Para usar Math.abs en el template
  searchTerm = '';
  loading = false;
  page = 1;
  limit = 10;
  total = 0;
  pages = 1;

  // Filtros
  q = '';
  filtroTipo = '';
  filtroEstatus = '';

  // Catálogos
  tiposEquipo: any[] = [];
  estatusEquipo: any[] = [];
  catalogosCargados = false;

  private destroy$ = new Subject<void>();

  // Clave de memoria de scroll para esta lista, y si la carga actual del
  // componente vino de un "Atrás" (para decidir si corresponde restaurar).
  private readonly scrollKey = 'equipos-list';
  private readonly isBackNav: boolean;

  constructor(
    private equiposService: EquiposService,
    private route: ActivatedRoute,
    private router: Router,
    private notificationService: NotificationService,
    private scrollMemory: ScrollMemoryService
  ) {
    // Se captura aquí (no en ngOnInit): en ngOnInit, router.getCurrentNavigation()
    // suele devolver null; el constructor corre justo tras NavigationStart.
    this.isBackNav = this.scrollMemory.isBackNavigation();
  }

  ngOnInit() {
    this.loadAlertas();

    // La URL (query params) es la fuente de verdad del estado de la lista:
    // búsqueda, filtros y página se leen de ahí y se recargan cada vez que
    // cambian, sin importar si el cambio vino de un click del usuario, del
    // botón "Atrás" del navegador o de volver desde detalle/editar/nuevo.
    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.leerParams(params);
      this.fetch();
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private leerParams(params: ParamMap) {
    this.q = params.get('q') || '';
    this.searchTerm = this.q;
    this.filtroTipo = params.get('tipo') || '';
    this.filtroEstatus = params.get('estatus') || '';
    this.page = Number(params.get('page')) || 1;
  }

  private fetch() {
    this.loading = true;
    const filters = {
      q: this.q,
      tipo: this.filtroTipo,
      estatus: this.filtroEstatus,
      page: this.page,
      limit: this.limit
    };

    this.equiposService.getEquipos(filters).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r: any) => {
        this.loading = false;
        this.handleResponse(r);
        // Se aplica después de que los datos ya están en el DOM; si no venimos
        // de "Atrás" o no hay nada guardado, no hace nada.
        this.scrollMemory.restore(this.scrollKey, this.isBackNav);
      },
      error: (error) => {
        this.loading = false;
        this.handleError(error);
        this.scrollMemory.restore(this.scrollKey, this.isBackNav);
      }
    });
  }

  private handleResponse(r: any) {
    if (r.success) {
      this.equipos = r.data || [];
      this.total = r.pagination?.total || 0;
      this.pages = r.pagination?.pages || 1;
    } else {
      this.equipos = [];
      this.total = 0;
      this.pages = 1;
    }
  }

  private handleError(error: any) {
    console.error('Error al cargar equipos:', error);
    this.notificationService.error('Error al cargar equipos');
    this.equipos = [];
    this.total = 0;
    this.pages = 1;
  }

  loadCatalogos() {
    if (this.catalogosCargados) return;

    this.equiposService.getCatalogosCompletos().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.tiposEquipo = response.data.tipos || [];
          this.estatusEquipo = response.data.estatus || [];
          this.catalogosCargados = true;
        }
      },
      error: (err) => {
        console.error('Error al cargar catálogos:', err);
      }
    });
  }

  loadAlertas() {
    this.equiposService.getAlertasMantenimiento().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.alertas = response.data;
          this.mostrarAlertas = this.alertas.length > 0;
        }
      },
      error: (err) => {
        console.error('Error al cargar alertas:', err);
        this.alertas = [];
      }
    });
  }

  ocultarAlertas() {
    this.mostrarAlertas = false;
  }

  onVerAlerta(alerta: any) {
    this.scrollMemory.save(this.scrollKey, 'equipo-' + alerta.id);
    this.router.navigate(['/admin/equipos/detalle', alerta.id]);
  }

  // ── Navegación dirigida por query params ───────────────────────────────────
  // Actualiza la URL en el mismo componente (sin destruirlo/recrearlo) y deja
  // que la suscripción de queryParamMap dispare la recarga de datos.
  private updateQueryParams(params: Record<string, any>, resetPage = false) {
    const queryParams: Record<string, any> = { ...params };
    if (resetPage) queryParams['page'] = null;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge'
    });
  }

  onSearch() {
    this.updateQueryParams({ q: this.searchTerm.trim() || null }, true);
  }

  onClearSearch() {
    this.updateQueryParams({ q: null }, true);
  }

  onFilterChange() {
    this.updateQueryParams({
      tipo: this.filtroTipo || null,
      estatus: this.filtroEstatus || null
    }, true);
  }

  /**
   * Limpia búsqueda, filtros y paginación y vuelve a consultar todo desde el
   * inicio. También recarga catálogos y alertas.
   */
  refrescar() {
    const yaEnInicio = !this.q && !this.filtroTipo && !this.filtroEstatus && this.page === 1;

    this.searchTerm = '';
    this.filtroTipo = '';
    this.filtroEstatus = '';
    this.page = 1;

    // Forzar recarga de catálogos (por si se agregaron/ocultaron tipos o marcas)
    this.catalogosCargados = false;
    this.loadCatalogos();
    this.loadAlertas();

    // Deja la URL sin query params; la suscripción a queryParamMap dispara la
    // recarga si algo cambió. Si ya estábamos en el estado inicial, forzamos.
    this.router.navigate([], { relativeTo: this.route, queryParams: {} });
    if (yaEnInicio) this.fetch();
  }

  go(p: number) {
    if (p >= 1 && p <= this.pages) {
      this.updateQueryParams({ page: p });
    }
  }

  onNuevo() {
    this.scrollMemory.save(this.scrollKey);
    this.router.navigate(['/admin/equipos/nuevo']);
  }

  onCatalogos() {
    this.scrollMemory.save(this.scrollKey);
    this.router.navigate(['/admin/equipos/catalogos']);
  }

  onVer(equipo: any) {
    this.scrollMemory.save(this.scrollKey, 'equipo-' + equipo.id);
    this.router.navigate(['/admin/equipos/detalle', equipo.id]);
  }

  onEditar(equipo: any) {
    this.scrollMemory.save(this.scrollKey, 'equipo-' + equipo.id);
    this.router.navigate(['/admin/equipos/editar', equipo.id]);
  }

  onEliminar(equipo: any) {
    if (!confirm(`¿Está seguro de eliminar el equipo "${equipo.marca} ${equipo.modelo}"?`)) {
      return;
    }

    this.equiposService.deleteEquipo(equipo.id).subscribe({
      next: () => {
        this.notificationService.success('Equipo eliminado exitosamente');
        // Si era el último equipo de esta página (y no es la primera), retrocede
        // una página en vez de quedarse en una página vacía.
        if (this.equipos.length === 1 && this.page > 1) {
          this.updateQueryParams({ page: this.page - 1 });
        } else {
          this.fetch();
        }
      },
      error: (err) => {
        console.error('Error al eliminar equipo:', err);
        this.notificationService.error('Error al eliminar equipo');
      }
    });
  }

  getTipoNombre(tipo: string): string {
    const found = this.tiposEquipo.find(t => t.codigo === tipo);
    return found ? found.nombre : tipo;
  }

  getEstatusClass(estatus: string): string {
    const found = this.estatusEquipo.find(e => e.codigo === estatus);
    if (!found) return 'badge bg-secondary';
    return `badge bg-${found.color}`;
  }

  getEstatusNombre(estatus: string): string {
    const found = this.estatusEquipo.find(e => e.codigo === estatus);
    return found ? found.nombre : estatus;
  }
}
