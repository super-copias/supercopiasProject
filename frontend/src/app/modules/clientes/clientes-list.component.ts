import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, finalize, switchMap, takeUntil } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ClientesService } from '../../services/clientes.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-clientes-list',
  template: `
  <div class="card mb-4">
    <div class="card-header">
      <div class="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
        <h5 class="mb-0">Clientes</h5>
        <div class="d-flex flex-column flex-sm-row gap-2 w-100 w-md-auto">
          <div class="input-group" style="min-width: 250px; max-width: 400px;">
            <input #searchInput
                   class="form-control" 
                   placeholder="Buscar cliente..." 
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
            <a class="btn btn-primary btn-sm d-flex align-items-center" [routerLink]="['/admin/clientes/nuevo']">
              <i class="fas fa-plus d-none d-sm-inline"></i>
              <span class="ms-0 ms-sm-1">Nuevo</span>
            </a>
            <a class="btn btn-outline-primary btn-sm d-flex align-items-center" [routerLink]="['/admin/clientes/upload']">
              <i class="fas fa-upload d-none d-sm-inline"></i>
              <span class="ms-0 ms-sm-1 d-none d-sm-inline">Alta masiva</span>
              <span class="d-sm-none">Import</span>
            </a>
          </div>
        </div>
      </div>
    </div>
    <div class="card-body">
      <app-clientes-table [clientes]="clientes" 
                          (editar)="onEditar($event)" 
                          (eliminar)="onEliminar($event)"></app-clientes-table>
      <div *ngIf="loading" class="my-2">
        <small class="text-muted"><i class="fas fa-spinner fa-spin"></i> Cargando...</small>
      </div>

      <div class="d-flex flex-column flex-sm-row justify-content-between align-items-center mt-3 gap-2">
        <div class="small text-muted order-2 order-sm-1">Mostrando {{total}} clientes</div>
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
export class ClientesListComponent implements OnInit, OnDestroy {
  // Propiedades simples
  clientes: any[] = [];
  q = '';
  searchTerm = '';  // Campo separado para el input de búsqueda
  loading = false;
  pageChange$ = new Subject<number>();
  private destroy$ = new Subject<void>();
  private pageSub: Subscription | null = null;
  page = 1;
  limit = 10;
  total = 0;
  pages = 1;
  
  constructor(
    private svc: ClientesService, 
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
    return this.svc.list(this.q, this.page, this.limit).pipe(
      takeUntil(this.destroy$),
      finalize(() => this.loading = false)
    );
  }
  
  private handleResponse(r: any) {
    // Manejar tanto formato nuevo como legacy
    if (r.success) {
      // Formato nuevo (estándar API)
      this.clientes = r.data || []; 
      this.total = r.pagination?.total || 0; 
      this.pages = r.pagination?.pages || Math.max(1, Math.ceil(this.total / this.limit));
    } else {
      // Formato legacy
      this.clientes = r.data || []; 
      this.total = r.total || 0; 
      this.pages = Math.max(1, Math.ceil(this.total / this.limit));
    }
    
    // Si estamos en una página que no existe, ir a la última página válida
    if (this.page > this.pages && this.pages > 0) {
      this.page = this.pages;
      this.load(); // Recargar con la página corregida
    }
  }

  private handleError(error: any) {
    this.clientes = [];
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
    this.q = this.searchTerm.trim(); // Copiar del campo de búsqueda al campo de query, eliminando espacios
    this.page = 1; // Resetear a la primera página
    this.load(); // Ejecutar búsqueda
  }
  
  onClearSearch() {
    this.searchTerm = '';
    this.q = '';
    this.page = 1;
    this.load();
  }
  
  go(p: number) { 
    if (p < 1 || p > this.pages || p === this.page) return;
    this.page = p; // Esto dispara automáticamente la búsqueda
    this.pageChange$.next(p);
  }

  onEditar(cliente: any) {
    // Por ahora redirigir al formulario de nuevo cliente
    // En el futuro se puede crear un formulario de edición específico
    this.router.navigate(['/admin/clientes/nuevo'], { queryParams: { id: cliente.id } });
  }

  onEliminar(cliente: any) {
    this.svc.delete(cliente.id).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        if (response?.success) {
          this.notificationService.success(
            `El cliente "${cliente.nombreComercial}" ha sido desactivado correctamente`,
            'Cliente desactivado'
          );
          this.load(); // Recargar la lista
        } else {
          this.notificationService.error(
            'No se pudo desactivar el cliente',
            'Error al desactivar'
          );
        }
      },
      error: (error) => {
        this.notificationService.error(
          error.error?.message || 'Error desconocido al desactivar el cliente',
          'Error al desactivar'
        );
      }
    });
  }
}
