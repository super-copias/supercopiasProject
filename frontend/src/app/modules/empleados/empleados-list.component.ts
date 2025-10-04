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
      </div>
    </div>
  `
})
export class EmpleadosListComponent implements OnInit {
  empleados: any[] = [];
  q = '';
  search$ = new Subject<string>();
  private searchSub: Subscription | null = null;
    constructor(private svc: EmpleadosService, private router: Router) { }
  ngOnInit() { 
    this.load();
    this.searchSub = this.search$.pipe(debounceTime(300)).subscribe(q => { this.q = q; this.load(); });
  }
  ngOnDestroy() { if (this.searchSub) this.searchSub.unsubscribe(); }
  load() {
    this.svc.list(this.q).subscribe((r: any) => { this.empleados = r.data; });
  }
  
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
