import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EmpleadosService } from '../../services/empleados.service';

@Component({
  selector: 'app-empleados-form',
  template: `
    <div class="card">
      <div class="card-header"><h5 class="mb-0">Formulario Empleado</h5></div>
      <div class="card-body">
        <form (ngSubmit)="save()" #f="ngForm" novalidate>
          <div class="mb-3">
            <label class="form-label">Nombre</label>
            <input class="form-control" [(ngModel)]="empleado.nombre" name="nombre" required #nombre="ngModel" />
            <div *ngIf="nombre.invalid && nombre.touched" class="text-danger small">El nombre es requerido.</div>
          </div>

          <div class="mb-3">
            <label class="form-label">Correo</label>
            <input class="form-control" [(ngModel)]="empleado.correo" name="correo" email #correo="ngModel" />
            <div *ngIf="correo.invalid && correo.touched" class="text-danger small">Introduce un correo válido.</div>
          </div>

          <div class="mb-3">
            <label class="form-label">Teléfono</label>
            <input class="form-control" [(ngModel)]="empleado.telefono" name="telefono" />
          </div>

          <div class="mb-3">
            <label class="form-label">Cargo</label>
            <input class="form-control" [(ngModel)]="empleado.cargo" name="cargo" />
          </div>

          <div class="mb-3">
            <label class="form-label">Departamento</label>
            <input class="form-control" [(ngModel)]="empleado.departamento" name="departamento" />
          </div>

          <div class="mb-3">
            <label class="form-label">Fecha de ingreso</label>
            <input type="date" class="form-control" [(ngModel)]="empleado.fechaIngreso" name="fechaIngreso" />
          </div>

          <div class="mb-3">
            <label class="form-label">Estado</label>
            <select class="form-select" [(ngModel)]="empleado.estado" name="estado">
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </div>

          <div class="d-flex gap-2">
            <button class="btn btn-primary" type="submit" [disabled]="loading || f.invalid">Guardar</button>
            <button class="btn btn-secondary" type="button" (click)="cancel()" [disabled]="loading">Cancelar</button>
          </div>
          <div *ngIf="error" class="mt-2 text-danger">{{error}}</div>
        </form>
      </div>
    </div>
  `
})
export class EmpleadosFormComponent implements OnInit {
  empleado: any = {};
  id: string | null = null;
  loading = false;
  error: string | null = null;
  constructor(private route: ActivatedRoute, private router: Router, private svc: EmpleadosService) {}

  ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id');
    if (this.id) {
      this.loading = true;
      this.svc.get(this.id).subscribe({
        next: (r: any) => { this.empleado = r; this.loading = false; },
        error: (err: any) => { this.error = 'No se pudo cargar el empleado'; this.loading = false; console.error(err); }
      });
    }
  }

  save() {
    this.loading = true;
    if (this.id) {
      this.svc.update(this.id, this.empleado).subscribe({ next: () => this.router.navigate(['/admin/empleados']), error: (e) => { this.error = 'Error al guardar'; this.loading = false; } });
    } else {
      this.svc.create(this.empleado).subscribe({ next: () => this.router.navigate(['/admin/empleados']), error: (e) => { this.error = 'Error al crear'; this.loading = false; } });
    }
  }

  cancel() { this.router.navigate(['/admin/empleados']); }
}
