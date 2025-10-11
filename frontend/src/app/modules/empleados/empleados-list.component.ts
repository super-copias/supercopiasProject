import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, switchMap, takeUntil, finalize } from 'rxjs/operators';
import { Router } from '@angular/router';
import { EmpleadosService } from '../../services/empleados.service';

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
                          (editar)="onEditar($event)" 
                          (eliminar)="onEliminar($event)"></app-empleados-table>
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
  private destroy$ = new Subject<void>();

  constructor(
    private empleadosService: EmpleadosService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Configurar búsqueda con debounce
    this.search$.pipe(
      debounceTime(300),
      switchMap(() => this.performSearch()),
      takeUntil(this.destroy$)
    ).subscribe();

    // Carga inicial
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
        console.error('Error cargando empleados:', error);
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
          alert('Empleado eliminado exitosamente');
          this.load(); // Recargar la lista
        } else {
          alert('Error al eliminar el empleado');
        }
      },
      error: (error) => {
        console.error('Error eliminando empleado:', error);
        alert('Error al eliminar el empleado. Por favor intente nuevamente.');
      }
    });
  }
}