import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, switchMap, takeUntil, finalize } from 'rxjs/operators';
import { Router } from '@angular/router';
import { EmpleadosService } from '../../services/empleados.service';
import { CatalogosService } from '../../services/catalogos.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-empleados-list',
  template: `
  <div class="card mb-4">
    <div class="card-header">
      <div class="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
        <h5 class="mb-0">Empleados</h5>
        <div class="d-flex flex-column flex-sm-row gap-2 w-100 w-md-auto">
          <div class="input-group" style="min-width: 250px; max-width: 400px;">
            <input #searchInput
                   class="form-control" 
                   placeholder="Buscar empleado..." 
                   [(ngModel)]="searchTerm" 
                   (keyup.enter)="onSearch()"
                   [disabled]="loading" />
            <button class="btn btn-outline-secondary" 
                    type="button" 
                    (click)="onSearch()"
                    [disabled]="loading"
                    title="Buscar">
              <i class="fas fa-search"></i>
            </button>
            <button class="btn btn-outline-secondary" 
                    type="button" 
                    (click)="onClearSearch()"
                    [disabled]="loading"
                    *ngIf="searchTerm"
                    title="Limpiar búsqueda">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="d-flex gap-2">
            <a class="btn btn-outline-secondary btn-sm d-flex align-items-center" [routerLink]="['/admin/empleados/horarios']" title="Gestionar horarios de acceso">
              <i class="fas fa-clock"></i>
              <span class="ms-1 d-none d-sm-inline">Horarios</span>
            </a>
            <a class="btn btn-primary btn-sm d-flex align-items-center" [routerLink]="['/admin/empleados/nuevo']">
              <i class="fas fa-plus d-none d-sm-inline"></i>
              <span class="ms-0 ms-sm-1">Nuevo</span>
            </a>
          </div>
        </div>
      </div>
    </div>
    <div class="card-body">
      <app-empleados-table [empleados]="empleados" 
                          (verDetalle)="onVerDetalle($event)"
                          (editar)="onEditar($event)" 
                          (eliminar)="onEliminar($event)"
                          (toggleEstado)="onToggleEstado($event)"></app-empleados-table>
      <div *ngIf="loading" class="my-2">
        <small class="text-muted"><i class="fas fa-spinner fa-spin"></i> Cargando...</small>
      </div>

      <div class="d-flex flex-column flex-sm-row justify-content-between align-items-center mt-3 gap-2">
        <div class="small text-muted order-2 order-sm-1">Mostrando {{total}} empleados</div>
        <nav aria-label="paginacion" class="order-1 order-sm-2">
          <ul class="pagination pagination-sm mb-0 justify-content-center">
            <li class="page-item" [class.disabled]="page===1">
              <a class="page-link" (click)="go(page-1)">
                <span class="d-none d-sm-inline">Anterior</span>
                <i class="fas fa-chevron-left d-sm-none"></i>
              </a>
            </li>
            <li class="page-item disabled">
              <span class="page-link">
                <span class="d-none d-sm-inline">Página {{page}} / {{pages}}</span>
                <span class="d-sm-none">{{page}}/{{pages}}</span>
              </span>
            </li>
            <li class="page-item" [class.disabled]="page===pages">
              <a class="page-link" (click)="go(page+1)">
                <span class="d-none d-sm-inline">Siguiente</span>
                <i class="fas fa-chevron-right d-sm-none"></i>
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  </div>

  <!-- Modal de detalle del empleado -->
  <app-empleado-detail-modal
    [visible]="mostrarModalDetalle"
    [empleado]="empleadoSeleccionado"
    [sucursales]="sucursales"
    (cerrarModal)="onCerrarModalDetalle()">
  </app-empleado-detail-modal>
  `
})
export class EmpleadosListComponent implements OnInit, OnDestroy {
  // Propiedades simples
  empleados: any[] = [];
  q = '';
  searchTerm = '';  // Campo separado para el input de búsqueda
  loading = false;
  pageChange$ = new Subject<number>();
  
  // Paginación
  page = 1;
  pages = 1;
  limit = 10;
  total = 0;

  // Subject para búsqueda con debounce
  search$ = new Subject<void>();
  
  // Modal de detalle
  mostrarModalDetalle = false;
  empleadoSeleccionado: any = null;
  sucursales: any[] = [];
  catalogosCargados = false;
  private destroy$ = new Subject<void>();

  constructor(
    private empleadosService: EmpleadosService,
    private catalogosService: CatalogosService,
    private router: Router,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    // Configurar búsqueda con debounce
    this.search$.pipe(
      debounceTime(300),
      switchMap(() => this.performSearch()),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.empleados = response.data || [];
          this.total = response.pagination?.total || 0;
          this.pages = response.pagination?.pages || 1;
          this.page = response.pagination?.page || 1;
        }
      },
      error: (error) => {
        this.empleados = [];
      }
    });

    // Cargar datos iniciales
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Ejecutar búsqueda
   */
  onSearch(): void {
    this.search$.next();
  }

  /**
   * Limpiar búsqueda
   */
  onClearSearch(): void {
    this.searchTerm = '';
    this.q = '';
    this.page = 1;
    this.load();
  }

  /**
   * Realizar la búsqueda actual
   */
  private performSearch() {
    this.q = this.searchTerm.trim();
    this.page = 1;
    this.loading = true;
    
    
    return this.empleadosService.getList({
      q: this.q,
      page: this.page,
      limit: this.limit,
      includeInactive: true
    }).pipe(
      finalize(() => this.loading = false)
    );
  }

  /**
   * Cargar datos iniciales
   */
  load(): void {
    this.loading = true;
    
    this.empleadosService.getList({
      q: this.q,
      page: this.page,
      limit: this.limit,
      includeInactive: true
    }).pipe(
      finalize(() => this.loading = false)
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.empleados = response.data || [];
          this.total = response.pagination?.total || 0;
          this.pages = response.pagination?.pages || 1;
          this.page = response.pagination?.page || 1;
        }
      },
      error: (error) => {
        this.empleados = [];
      }
    });
  }

  /**
   * Navegar a página específica
   */
  go(page: number): void {
    if (page < 1 || page > this.pages || page === this.page) return;
    this.page = page;
    this.load();
  }

  /**
   * Cargar datos del servicio
   */
  private loadData() {
    this.loading = true;
    
    return this.empleadosService.getList({
      q: this.q,
      page: this.page,
      limit: this.limit
    }).pipe(
      finalize(() => this.loading = false)
    );
  }

  /**
   * Navegar para editar empleado
   */
  onEditar(empleado: any): void {
    this.router.navigate(['/admin/empleados/editar', empleado.id]);
  }

  /**
   * Eliminar empleado
   */
  onEliminar(empleado: any): void {
    // Confirmar eliminación
    const confirmar = confirm(`¿Está seguro que desea eliminar al empleado "${empleado.nombre}"?\n\nEsta acción no se puede deshacer.`);
    
    if (!confirmar) {
      return;
    }

    this.empleadosService.delete(empleado.id).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        if (response?.success) {
          this.notificationService.success(
            `El empleado "${empleado.nombre}" ha sido eliminado correctamente`,
            'Empleado eliminado'
          );
          this.load(); // Recargar la lista
        } else {
          this.notificationService.error(
            'No se pudo eliminar el empleado',
            'Error al eliminar'
          );
        }
      },
      error: (error) => {
        this.notificationService.error(
          error.error?.message || 'Error al eliminar el empleado. Por favor intente nuevamente.',
          'Error al eliminar'
        );
      }
    });
  }

  /**
   * Cargar catálogos necesarios (solo la primera vez)
   */
  private loadCatalogos(): void {
    if (this.catalogosCargados) return;
    
    this.catalogosService.getSucursales().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        if (response?.success && response.data) {
          this.sucursales = response.data;
          this.catalogosCargados = true;
        }
      },
      error: (error) => {
      }
    });
  }

  /**
   * Mostrar detalle del empleado
   */
  onVerDetalle(empleado: any): void {
    // Cargar catálogos solo cuando se necesiten
    this.loadCatalogos();
    
    // Obtener datos completos del empleado desde el backend
    this.empleadosService.getEmpleado(empleado.id).subscribe({
      next: (response) => {
        if (response && response.success && response.data) {
          this.empleadoSeleccionado = response.data;
          this.mostrarModalDetalle = true;
        }
      },
      error: (error) => {
        this.mostrarModalDetalle = false;
      }
    });
  }

  /**
   * Activar / desactivar empleado
   * Revierte el toggle visual si el usuario cancela o si el backend rechaza la acción.
   */
  onToggleEstado(empleado: any): void {
    const estadoOriginal = empleado.activo;
    const accion = estadoOriginal ? 'desactivar' : 'activar';

    const confirmar = confirm(`¿Está seguro que desea ${accion} al empleado "${empleado.nombre}"?`);
    if (!confirmar) {
      // El checkbox ya cambió visualmente en el DOM; revertimos forzando un nuevo arreglo
      // para que Angular re-evalúe el binding [checked]=
      this.empleados = this.empleados.map(e =>
        e.id === empleado.id ? { ...e, activo: estadoOriginal } : e
      );
      return;
    }

    this.empleadosService.toggleEstado(empleado.id).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        if (response?.success) {
          const nuevoEstado = response.data?.activo;
          const msg = nuevoEstado ? 'activado' : 'desactivado';
          this.notificationService.success(
            `El empleado "${empleado.nombre}" ha sido ${msg} correctamente.`,
            `Empleado ${msg}`
          );
          this.load();
        }
      },
      error: (error) => {
        const errorCode = error?.error?.error?.code || error?.error?.code;
        if (errorCode === 'ADMIN_PROTEGIDO') {
          this.notificationService.warning(
            error?.error?.error?.message || 'No es posible desactivar a un administrador del sistema.',
            'Acción no permitida'
          );
        } else {
          this.notificationService.error(
            error?.error?.error?.message || error?.error?.message || 'No se pudo cambiar el estado del empleado.',
            'Error al cambiar estado'
          );
        }
        // Revertir visual en cualquier caso de error
        this.empleados = this.empleados.map(e =>
          e.id === empleado.id ? { ...e, activo: estadoOriginal } : e
        );
      }
    });
  }

  /**
   * Cerrar modal de detalle
   */
  onCerrarModalDetalle(): void {
    this.mostrarModalDetalle = false;
    this.empleadoSeleccionado = null;
  }
}