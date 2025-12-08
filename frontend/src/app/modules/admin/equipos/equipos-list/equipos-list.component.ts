import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, finalize, switchMap, takeUntil } from 'rxjs/operators';
import { Router } from '@angular/router';
import { EquiposService } from '../../../../services/equipos.service';
import { NotificationService } from '../../../../services/notification.service';

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
  q = '';
  searchTerm = '';
  loading = false;
  pageChange$ = new Subject<number>();
  private destroy$ = new Subject<void>();
  private pageSub: Subscription | null = null;
  page = 1;
  limit = 10;
  total = 0;
  pages = 1;
  
  // Filtros
  filtroTipo = '';
  filtroEstatus = '';
  
  // Catálogos
  tiposEquipo: any[] = [];
  estatusEquipo: any[] = [];
  catalogosCargados = false;
  
  constructor(
    private equiposService: EquiposService,
    private router: Router,
    private notificationService: NotificationService
  ) { }
  
  ngOnInit() {
    // Cargar alertas de mantenimiento
    this.loadAlertas();
    
    this.pageSub = this.pageChange$.pipe(
      debounceTime(150),
      switchMap(page => {
        this.page = page;
        return this.loadData();
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (r: any) => { 
        this.handleResponse(r);
      },
      error: (error) => {
        this.handleError(error);
      }
    });

    this.load();
  }
  
  ngOnDestroy() { 
    this.destroy$.next();
    this.destroy$.complete();
    if (this.pageSub) this.pageSub.unsubscribe();
  }
  
  private loadData() {
    this.loading = true;
    const filters = {
      q: this.q,
      tipo: this.filtroTipo,
      estatus: this.filtroEstatus,
      page: this.page,
      limit: this.limit
    };
    
    return this.equiposService.getEquipos(filters).pipe(
      takeUntil(this.destroy$),
      finalize(() => this.loading = false)
    );
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
    this.router.navigate(['/admin/equipos/detalle', alerta.id]);
  }
  
  load() {
    this.page = 1;
    this.loadData().subscribe({
      next: r => this.handleResponse(r),
      error: e => this.handleError(e)
    });
  }
  
  onSearch() {
    this.q = this.searchTerm.trim();
    this.load();
  }
  
  onClearSearch() {
    this.searchTerm = '';
    this.q = '';
    this.load();
  }
  
  onFilterChange() {
    this.load();
  }
  
  go(p: number) {
    if (p >= 1 && p <= this.pages) {
      this.pageChange$.next(p);
    }
  }
  
  onNuevo() {
    this.router.navigate(['/admin/equipos/nuevo']);
  }
  
  onVer(equipo: any) {
    this.router.navigate(['/admin/equipos/detalle', equipo.id]);
  }
  
  onEditar(equipo: any) {
    this.router.navigate(['/admin/equipos/editar', equipo.id]);
  }
  
  onEliminar(equipo: any) {
    if (!confirm(`¿Está seguro de eliminar el equipo "${equipo.marca} ${equipo.modelo}"?`)) {
      return;
    }
    
    this.equiposService.deleteEquipo(equipo.id).subscribe({
      next: () => {
        this.notificationService.success('Equipo eliminado exitosamente');
        this.load();
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
