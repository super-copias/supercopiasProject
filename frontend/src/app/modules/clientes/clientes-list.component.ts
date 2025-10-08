import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, finalize, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ClientesService } from '../../services/clientes.service';

@Component({
  selector: 'app-clientes-list',
  template: `
  <div class="card mb-4">
    <div class="card-header d-flex justify-content-between align-items-center">
      <h5 class="mb-0">Clientes</h5>
      <div class="d-flex gap-2">
        <div class="input-group">
          <input class="form-control" placeholder="Buscar cliente..." [(ngModel)]="q" (input)="search$.next(q)" [disabled]="loading" />
          <button class="btn btn-outline-secondary" type="button" (click)="load()" [disabled]="loading"><i class="fas fa-search"></i></button>
        </div>
        <a class="btn btn-primary btn-sm d-inline-flex align-items-center" [routerLink]="['/admin/clientes/nuevo']">
          <i class="fas fa-plus"></i>
          <span class="ms-1">Nuevo</span>
        </a>
        <a class="btn btn-outline-primary btn-sm d-inline-flex align-items-center flex-nowrap text-nowrap" [routerLink]="['/admin/clientes/upload']">
          <i class="fas fa-upload"></i>
          <span class="ms-1">Alta&nbsp;masiva</span>
        </a>
      </div>
    </div>
    <div class="card-body">
      <app-clientes-table [clientes]="clientes" 
                          (editar)="onEditar($event)" 
                          (eliminar)="onEliminar($event)"></app-clientes-table>
      <div *ngIf="loading" class="my-2">
        <small class="text-muted"><i class="fas fa-spinner fa-spin"></i> Cargando...</small>
      </div>

      <div class="d-flex justify-content-between align-items-center mt-3">
        <div class="small text-muted">Mostrando {{total}} clientes</div>
        <nav aria-label="paginacion">
          <ul class="pagination pagination-sm mb-0">
            <li class="page-item" [class.disabled]="page===1"><a class="page-link" (click)="go(page-1)">Anterior</a></li>
            <li class="page-item disabled"><span class="page-link">Página {{page}} / {{pages}}</span></li>
            <li class="page-item" [class.disabled]="page===pages"><a class="page-link" (click)="go(page+1)">Siguiente</a></li>
          </ul>
        </nav>
      </div>
    </div>
  </div>
  `
})
export class ClientesListComponent implements OnInit, OnDestroy {
  clientes: any[] = [];
  q = '';
  loading = false;
  search$ = new Subject<string>();
  pageChange$ = new Subject<number>();
  private searchSub: Subscription | null = null;
  private pageSub: Subscription | null = null;
  page = 1;
  limit = 10;
  total = 0;
  pages = 1;
  
  constructor(private svc: ClientesService, private router: Router) { }
  
  ngOnInit() {
    this.load();
    
    // Búsqueda con debounce
    this.searchSub = this.search$.pipe(
      debounceTime(300),
      switchMap(q => {
        this.q = q;
        this.page = 1;
        return this.loadData();
      })
    ).subscribe();

    // Paginación con debounce para evitar clicks rápidos
    this.pageSub = this.pageChange$.pipe(
      debounceTime(150), // Menos tiempo que la búsqueda
      switchMap(page => {
        this.page = page;
        return this.loadData();
      })
    ).subscribe();
  }
  
  ngOnDestroy() { 
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
        this.clientes = r.data || []; 
        this.total = r.total || 0; 
        this.pages = Math.max(1, Math.ceil(this.total / this.limit));
        
        // Si estamos en una página que no existe, ir a la última página válida
        if (this.page > this.pages && this.pages > 0) {
          this.page = this.pages;
          this.load(); // Recargar con la página corregida
        }
      },
      error: (error) => {
        console.error('Error loading clients:', error);
        this.clientes = [];
        this.total = 0;
        this.pages = 1;
        this.page = 1;
      }
    });
  }
  
  go(p: number) { 
    if (p < 1 || p > this.pages || p === this.page) return;
    this.pageChange$.next(p);
  }

  onEditar(cliente: any) {
    // Por ahora redirigir al formulario de nuevo cliente
    // En el futuro se puede crear un formulario de edición específico
    this.router.navigate(['/admin/clientes/nuevo'], { queryParams: { id: cliente.id } });
  }

  onEliminar(cliente: any) {
    this.svc.delete(cliente.id).subscribe((success) => {
      if (success) {
        this.load(); // Recargar la lista
      }
    });
  }
}
