import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
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
export class EmpleadosListComponent implements OnInit {
  empleados: any[] = [];
  q = '';
  search$ = new Subject<string>();
  private searchSub: Subscription | null = null;
  page = 1;
  limit = 10;
  total = 0;
  pages = 1;
    constructor(private svc: EmpleadosService, private router: Router) { }
  ngOnInit() { 
    this.load();
    this.searchSub = this.search$.pipe(debounceTime(300)).subscribe(q => { this.q = q; this.load(); });
  }
  ngOnDestroy() { if (this.searchSub) this.searchSub.unsubscribe(); }
  load() {
    this.svc.list(this.q, this.page, this.limit).subscribe((r: any) => { this.empleados = r.data; this.total = r.total; this.pages = Math.max(1, Math.ceil(this.total / this.limit)); });
  }
  go(p: number) { if (p<1 || p>this.pages) return; this.page = p; this.load(); }
  
    verDetalles(empleado: any) {
        // placeholder: abrir modal o navegar a vista detalle
        console.log('Ver detalles empleado:', empleado);
    }

    editar(empleado: any) {
        // navegar al formulario de edición usando Router
        this.router.navigate(['/admin/empleados', empleado.id, 'editar']);
    }

    nuevo() {
        this.router.navigate(['/admin/empleados/nuevo']);
    }

    eliminar(empleado: any) {
        if (!confirm(`Eliminar empleado ${empleado.nombre || empleado.id}?`)) return;
        this.svc.delete(String(empleado.id)).subscribe(() => this.load());
    }
}
