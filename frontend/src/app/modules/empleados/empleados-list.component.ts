import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, switchMap, takeUntil, finalize } from 'rxjs/operators';
import { Router } from '@angular/router';
import { EmpleadosService } from '../../services/empleados.service';

@Component({
  selector: 'app-empleados-list',
    template: `
    <div class="card">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h5 class="mb-0">Empleados</h5>
        <div class="d-flex gap-2">
                      <div class="input-group">
                        <input type="text" class="form-control" placeholder="Buscar colaborador..." [(ngModel)]="q" (input)="search$.next(q)" />
                        <button class="btn btn-outline-secondary" type="button" (click)="load()"><i class="fas fa-search"></i></button>
                      </div>
          <button class="btn btn-primary btn-sm d-inline-flex align-items-center" (click)="nuevo()">
            <i class="fas fa-plus"></i>
            <span class="ms-1">Nuevo</span>
          </button>
        </div>
      </div>
      <div class="card-body">
        <app-colaboradores-table [colaboradores]="empleados"></app-colaboradores-table>
        
        <div class="d-flex justify-content-between align-items-center mt-3">
          <div class="small text-muted">Mostrando {{total}} empleados</div>
          <nav aria-label="paginacion-empleados">
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
export class EmpleadosListComponent implements OnInit, OnDestroy {
  empleados: any[] = [];
  q = '';
  search$ = new Subject<string>();
  private destroy$ = new Subject<void>();
  private searchSub: Subscription | null = null;
  page = 1;
  limit = 10;
  total = 0;
  pages = 1;
  loading = false;
  
  constructor(
    private svc: EmpleadosService, 
    private router: Router
  ) { }
  
  ngOnInit() { 
    console.log('EmpleadosListComponent iniciado');
    this.load();
    
    // Búsqueda simple con debounce
    this.searchSub = this.search$.pipe(
      debounceTime(500), // Más tiempo para evitar requests excesivos
      switchMap(q => {
        console.log('Buscando:', q);
        this.q = q; 
        this.page = 1;
        this.loading = true;
        return this.svc.list(this.q, this.page, this.limit);
      }),
      takeUntil(this.destroy$),
      finalize(() => this.loading = false)
    ).subscribe({
      next: (r: any) => { 
        console.log('Resultados búsqueda:', r);
        this.empleados = r?.data || []; 
        this.total = r?.total || 0; 
        this.pages = Math.max(1, Math.ceil(this.total / this.limit)); 
      },
      error: (error) => {
        console.error('Error en búsqueda:', error);
        this.empleados = [];
        this.total = 0;
        this.pages = 1;
      }
    });
  }
  
  load() {
    console.log('Cargando empleados...');
    this.loading = true;
    
    this.svc.list(this.q, this.page, this.limit).pipe(
      takeUntil(this.destroy$),
      finalize(() => this.loading = false)
    ).subscribe({
      next: (r: any) => { 
        console.log('Datos cargados:', r);
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

  ngOnDestroy() { 
    this.destroy$.next();
    this.destroy$.complete();
    if (this.searchSub) this.searchSub.unsubscribe(); 
  }
  
  go(p: number) { 
    if (p < 1 || p > this.pages || p === this.page) return; 
    this.page = p; 
    this.load(); 
  }
  
  verDetalles(empleado: any) {
      console.log('Ver detalles empleado:', empleado);
  }

  editar(empleado: any) {
      this.router.navigate(['/admin/empleados', empleado.id, 'editar']);
  }

  nuevo() {
      this.router.navigate(['/admin/empleados/nuevo']);
  }

  eliminar(empleado: any) {
      if (!confirm(`Eliminar empleado ${empleado.nombre || empleado.id}?`)) return;
      this.svc.delete(String(empleado.id)).pipe(
        takeUntil(this.destroy$)
      ).subscribe(() => this.load());
  }
}
