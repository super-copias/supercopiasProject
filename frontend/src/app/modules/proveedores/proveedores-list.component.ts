import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, finalize, switchMap, takeUntil } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ProveedoresService } from '../../services/proveedores.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-proveedores-list',
  template: `
  <div class="card mb-4">
    <div class="card-header">
      <div class="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
        <h5 class="mb-0">Proveedores</h5>
        <div class="d-flex flex-column flex-sm-row gap-2 w-100 w-md-auto">
          <div class="input-group" style="min-width: 250px; max-width: 400px;">
            <input #searchInput
                   class="form-control" 
                   placeholder="Buscar proveedor..." 
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
            <a class="btn btn-primary btn-sm d-flex align-items-center" [routerLink]="['/admin/proveedores/nuevo']">
              <i class="fas fa-plus d-none d-sm-inline"></i>
              <span class="ms-0 ms-sm-1">Nuevo</span>
            </a>
          </div>
        </div>
      </div>
    </div>
    <div class="card-body">
      <app-proveedores-table [proveedores]="proveedores" 
                          (editar)="onEditar($event)" 
                          (eliminar)="onEliminar($event)"></app-proveedores-table>
      <div *ngIf="loading" class="my-2">
        <small class="text-muted"><i class="fas fa-spinner fa-spin"></i> Cargando...</small>
      </div>

      <div class="d-flex flex-column flex-sm-row justify-content-between align-items-center mt-3 gap-2">
        <div class="small text-muted order-2 order-sm-1">Mostrando {{total}} proveedores</div>
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
export class ProveedoresListComponent implements OnInit, OnDestroy {
  // Propiedades simples
  proveedores: any[] = [];
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
  
  constructor(
    private svc: ProveedoresService, 
    private router: Router,
    private notificationService: NotificationService
  ) { }
  
  ngOnInit() {
    // Paginación con debounce para evitar clicks rápidos
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

    // Cargar datos iniciales
    this.load();
  }
  
  ngOnDestroy() { 
    this.destroy$.next();
    this.destroy$.complete();
    if (this.pageSub) this.pageSub.unsubscribe();
  }
  
  private loadData() {
    this.loading = true;
    return this.svc.getList({ q: this.q, page: this.page, limit: this.limit }).pipe(
      takeUntil(this.destroy$),
      finalize(() => this.loading = false)
    );
  }
  
  private handleResponse(r: any) {
    // Manejar formato estándar API
    if (r.success) {
      this.proveedores = r.data || []; 
      this.total = r.pagination?.total || 0; 
      this.pages = r.pagination?.pages || 1;
    } else {
      this.proveedores = [];
      this.total = 0;
      this.pages = 1;
    }
    
    // Si estamos en una página que no existe, ir a la última página válida
    if (this.page > this.pages && this.pages > 0) {
      this.page = this.pages;
      this.load();
    }
  }

  private handleError(error: any) {
    this.proveedores = [];
    this.total = 0;
    this.pages = 1;
    this.page = 1;
  }
  
  load() {
    this.loadData().subscribe({
      next: (r: any) => { 
        this.handleResponse(r);
      },
      error: (error) => {
        this.handleError(error);
      }
    });
  }
  
  onSearch() {
    this.q = this.searchTerm.trim();
    this.page = 1;
    this.load();
  }
  
  onClearSearch() {
    this.searchTerm = '';
    this.q = '';
    this.page = 1;
    this.load();
  }
  
  go(p: number) { 
    if (p < 1 || p > this.pages || p === this.page) return;
    this.page = p;
    this.pageChange$.next(p);
  }

  onEditar(proveedor: any) {
    this.router.navigate(['/admin/proveedores/nuevo'], { queryParams: { id: proveedor.id } });
  }

  onEliminar(proveedor: any) {
    this.svc.delete(proveedor.id).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        if (response?.success) {
          this.notificationService.success(
            `El proveedor "${proveedor.nombre_comercial || proveedor.nombreComercial}" ha sido desactivado correctamente`,
            'Proveedor desactivado'
          );
          this.load();
        } else {
          this.notificationService.error(
            'No se pudo desactivar el proveedor',
            'Error al desactivar'
          );
        }
      },
      error: (error) => {
        this.notificationService.error(
          error.error?.message || 'Error desconocido al desactivar el proveedor',
          'Error al desactivar'
        );
      }
    });
  }
}

