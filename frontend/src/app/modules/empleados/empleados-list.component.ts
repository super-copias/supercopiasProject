import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, switchMap, takeUntil, finalize } from 'rxjs/operators';
import { Router } from '@angular/router';
import { EmpleadosService } from '../../services/empleados.service';

@Component({
  selector: 'app-empleados-list',
  template: `
    <div class="card mb-4">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h5 class="mb-0">
          <i class="fas fa-users me-2"></i>
          Empleados
        </h5>
        <div class="d-flex gap-2">
          <div class="input-group">
            <input 
              class="form-control" 
              placeholder="Buscar empleado..." 
              [(ngModel)]="q" 
              (input)="search$.next(q)" 
              [disabled]="loading" />
            <button 
              class="btn btn-outline-secondary" 
              type="button" 
              (click)="load()" 
              [disabled]="loading">
              <i class="fas fa-search"></i>
            </button>
          </div>
          <a class="btn btn-primary btn-sm d-inline-flex align-items-center" 
             [routerLink]="['/admin/empleados/nuevo']">
            <i class="fas fa-plus"></i>
            <span class="ms-1">Nuevo</span>
          </a>
          <a class="btn btn-outline-primary btn-sm d-inline-flex align-items-center flex-nowrap text-nowrap" 
             [routerLink]="['/admin/empleados/upload']">
            <i class="fas fa-upload"></i>
            <span class="ms-1">Alta&nbsp;masiva</span>
          </a>
        </div>
      </div>
      <div class="card-body">
        <!-- Tabla temporalmente comentada mientras se corrigen los errores -->
        <!--
        <app-empleados-table 
          [empleados]="empleados" 
          (editar)="onEditar($event)" 
          (eliminar)="onEliminar($event)"
          (asignarRole)="onAsignarRole($event)"></app-empleados-table>
        -->
        
        <!-- Lista simple temporal -->
        <div *ngIf="empleados && empleados.length > 0" class="table-responsive">
          <table class="table table-striped">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Puesto</th>
                <th>Roles</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let empleado of empleados">
                <td>{{ empleado.nombre }} {{ empleado.apellidos }}</td>
                <td>{{ empleado.email || 'N/A' }}</td>
                <td>{{ empleado.puesto || 'N/A' }}</td>
                <td>
                  <span *ngFor="let rol of empleado.roles" class="badge bg-secondary me-1">
                    {{ rol }}
                  </span>
                </td>
                <td>
                  <button class="btn btn-sm btn-primary me-1" (click)="onEditar(empleado)">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button class="btn btn-sm btn-danger" (click)="onEliminar(empleado.id)">
                    <i class="fas fa-trash"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div *ngIf="loading" class="my-2">
          <small class="text-muted">
            <i class="fas fa-spinner fa-spin"></i> Cargando...
          </small>
        </div>

        <div class="d-flex justify-content-between align-items-center mt-3">
          <div class="small text-muted">Mostrando {{total}} empleados</div>
          <nav aria-label="paginacion">
            <ul class="pagination pagination-sm mb-0">
              <li class="page-item" [class.disabled]="page===1">
                <a class="page-link" (click)="go(page-1)">Anterior</a>
              </li>
              <li class="page-item disabled">
                <span class="page-link">Página {{page}} / {{pages}}</span>
              </li>
              <li class="page-item" [class.disabled]="page===pages">
                <a class="page-link" (click)="go(page+1)">Siguiente</a>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </div>
  `
})
export class EmpleadosListComponent implements OnInit, OnDestroy {
  empleados: any[] = [];
  q = '';
  loading = false;
  search$ = new Subject<string>();
  pageChange$ = new Subject<number>();
  private destroy$ = new Subject<void>();
  private searchSub: Subscription | null = null;
  private pageSub: Subscription | null = null;
  page = 1;
  limit = 10;
  total = 0;
  pages = 1;
  
  constructor(
    private svc: EmpleadosService, 
    private router: Router
  ) { }
  
  ngOnInit() {
    // Cargar datos desde el backend
    this.load();
    
    // Búsqueda con debounce
    this.searchSub = this.search$.pipe(
      debounceTime(300),
      switchMap(q => {
        this.q = q;
        this.page = 1;
        return this.loadData();
      }),
      takeUntil(this.destroy$)
    ).subscribe();

    // Paginación con debounce para evitar clicks rápidos
    this.pageSub = this.pageChange$.pipe(
      debounceTime(150),
      switchMap(page => {
        this.page = page;
        return this.loadData();
      }),
      takeUntil(this.destroy$)
    ).subscribe();
  }
  
  ngOnDestroy() { 
    this.destroy$.next();
    this.destroy$.complete();
    if (this.searchSub) this.searchSub.unsubscribe();
    if (this.pageSub) this.pageSub.unsubscribe();
  }
  
  private loadData() {
    this.loading = true;
    return this.svc.list(this.q, this.page, this.limit).pipe(
      finalize(() => this.loading = false)
    );
  }
  
  load() {
    this.loadData().subscribe({
      next: (r: any) => { 
        this.empleados = r?.data || []; 
        this.total = r?.total || 0; 
        this.pages = Math.max(1, Math.ceil(this.total / this.limit)); 
      },
      error: (error) => {
        console.error('Error loading empleados:', error);
        this.empleados = [];
        this.total = 0;
        this.pages = 1;
      }
    });
  }
  
  go(page: number) {
    if (page >= 1 && page <= this.pages && page !== this.page) {
      this.pageChange$.next(page);
    }
  }
  
  onEditar(empleado: any) {
    this.router.navigate(['/admin/empleados/editar', empleado.id]);
  }
  
  onEliminar(empleado: any) {
    this.svc.delete(empleado.id).subscribe({
      next: () => {
        console.log('Empleado eliminado:', empleado.nombre);
        this.load(); // Recargar lista
      },
      error: (error) => {
        console.error('Error al eliminar empleado:', error);
        alert('Error al eliminar el empleado');
      }
    });
  }
  
  onAsignarRole(empleado: any) {
    const role = prompt('Ingrese el rol a asignar (admin, supervisor, operador):', empleado.role || '');
    if (role && role.trim()) {
      this.svc.assignRole(empleado.id, role.trim()).subscribe({
        next: (updated) => {
          console.log('Rol asignado:', updated);
          this.load(); // Recargar lista
        },
        error: (error) => {
          console.error('Error al asignar rol:', error);
          alert('Error al asignar el rol');
        }
      });
    }
  }
}