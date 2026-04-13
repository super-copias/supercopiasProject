import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CatalogosService } from '../../services/catalogos.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-horarios-acceso',
  template: `
    <div class="card mb-4">
      <div class="card-header d-flex justify-content-between align-items-center">
        <div>
          <h5 class="mb-0"><i class="fas fa-clock me-2"></i>Horarios de Acceso</h5>
          <small class="text-muted">Define los rangos horarios en que los empleados pueden ingresar al sistema.</small>
        </div>
        <button class="btn btn-primary btn-sm" (click)="abrirFormulario()" [disabled]="loading">
          <i class="fas fa-plus me-1"></i>Nuevo horario
        </button>
      </div>

      <div class="card-body">
        <!-- Alerta informativa -->
        <div class="alert alert-info d-flex align-items-start gap-2 mb-3">
          <i class="fas fa-info-circle mt-1"></i>
          <div>
            <strong>Funcionamiento automático:</strong> El sistema activa/desactiva a todos los usuarios
            no-administradores automáticamente según los horarios <em>activos</em> aquí configurados.
            Si ningún horario está activo, no se realizan cambios automáticos.
            Puedes anular el estado de cualquier empleado en cualquier momento desde la tabla de empleados.
          </div>
        </div>

        <!-- Loading -->
        <div *ngIf="loading" class="text-center py-3">
          <i class="fas fa-spinner fa-spin me-2"></i> Cargando horarios...
        </div>

        <!-- Lista de horarios -->
        <div *ngIf="!loading">
          <div *ngIf="horarios.length === 0" class="text-muted text-center py-4">
            <i class="fas fa-clock fa-2x mb-2 d-block opacity-50"></i>
            No hay horarios configurados. Crea uno con el botón <strong>Nuevo horario</strong>.
          </div>

          <div class="table-responsive" *ngIf="horarios.length > 0">
            <table class="table table-hover table-sm align-middle">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Hora inicio</th>
                  <th>Hora fin</th>
                  <th>Estado</th>
                  <th style="width: 120px;">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let h of horarios">
                  <td class="fw-medium">{{ h.nombre }}</td>
                  <td><span class="badge bg-light text-dark border">{{ h.hora_inicio | slice:0:5 }}</span></td>
                  <td><span class="badge bg-light text-dark border">{{ h.hora_fin | slice:0:5 }}</span></td>
                  <td>
                    <div class="form-check form-switch d-flex align-items-center gap-2 mb-0">
                      <input class="form-check-input" type="checkbox" role="switch"
                             [checked]="h.activo"
                             (change)="toggleActivo(h)"
                             style="cursor:pointer; width:2.2em; height:1.2em;">
                      <span class="badge" [class.bg-success]="h.activo" [class.bg-secondary]="!h.activo"
                            style="font-size:0.72em;">
                        {{ h.activo ? 'Activo' : 'Inactivo' }}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div class="btn-group btn-group-sm">
                      <button class="btn btn-outline-warning btn-sm" (click)="editarHorario(h)" title="Editar">
                        <i class="fas fa-edit"></i>
                      </button>
                      <button class="btn btn-outline-danger btn-sm" (click)="eliminarHorario(h)" title="Eliminar">
                        <i class="fas fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal formulario -->
    <div class="modal fade" [class.show]="mostrarModal" [style.display]="mostrarModal ? 'block' : 'none'"
         tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="fas fa-clock me-2"></i>{{ editando ? 'Editar' : 'Nuevo' }} horario de acceso
            </h5>
            <button type="button" class="btn-close" (click)="cerrarFormulario()"></button>
          </div>
          <form [formGroup]="form" (ngSubmit)="guardar()">
            <div class="modal-body">
              <div class="mb-3">
                <label class="form-label fw-medium">Nombre <span class="text-danger">*</span></label>
                <input type="text" class="form-control" formControlName="nombre"
                       placeholder="Ej: Horario laboral" />
                <div *ngIf="form.get('nombre')?.invalid && form.get('nombre')?.touched"
                     class="text-danger small mt-1">El nombre es requerido.</div>
              </div>
              <div class="row g-3">
                <div class="col-6">
                  <label class="form-label fw-medium">Hora inicio <span class="text-danger">*</span></label>
                  <input type="time" class="form-control" formControlName="hora_inicio" />
                  <div *ngIf="form.get('hora_inicio')?.invalid && form.get('hora_inicio')?.touched"
                       class="text-danger small mt-1">Requerido.</div>
                </div>
                <div class="col-6">
                  <label class="form-label fw-medium">Hora fin <span class="text-danger">*</span></label>
                  <input type="time" class="form-control" formControlName="hora_fin" />
                  <div *ngIf="form.get('hora_fin')?.invalid && form.get('hora_fin')?.touched"
                       class="text-danger small mt-1">Requerido.</div>
                </div>
              </div>
              <div class="form-check form-switch mt-3">
                <input class="form-check-input" type="checkbox" role="switch" id="activoSwitch"
                       formControlName="activo" />
                <label class="form-check-label" for="activoSwitch">Horario activo</label>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="cerrarFormulario()">Cancelar</button>
              <button type="submit" class="btn btn-primary" [disabled]="form.invalid || guardando">
                <i class="fas fa-save me-1"></i>{{ guardando ? 'Guardando...' : 'Guardar' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    <div class="modal-backdrop fade show" *ngIf="mostrarModal"></div>
  `
})
export class HorariosAccesoComponent implements OnInit, OnDestroy {
  horarios: any[] = [];
  loading = false;
  guardando = false;
  mostrarModal = false;
  editando: any = null;
  form!: FormGroup;
  private destroy$ = new Subject<void>();

  constructor(
    private catalogosService: CatalogosService,
    private notificationService: NotificationService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.cargarHorarios();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm(data?: any) {
    this.form = this.fb.group({
      nombre: [data?.nombre || '', [Validators.required, Validators.maxLength(100)]],
      hora_inicio: [data?.hora_inicio ? data.hora_inicio.slice(0, 5) : '06:40', Validators.required],
      hora_fin: [data?.hora_fin ? data.hora_fin.slice(0, 5) : '21:30', Validators.required],
      activo: [data?.activo !== undefined ? data.activo : true]
    });
  }

  cargarHorarios(): void {
    this.loading = true;
    this.catalogosService.getHorarios()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.horarios = res?.data || [];
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.notificationService.error('No se pudieron cargar los horarios.', 'Error');
        }
      });
  }

  abrirFormulario(): void {
    this.editando = null;
    this.initForm();
    this.mostrarModal = true;
  }

  editarHorario(horario: any): void {
    this.editando = horario;
    this.initForm(horario);
    this.mostrarModal = true;
  }

  cerrarFormulario(): void {
    this.mostrarModal = false;
    this.editando = null;
  }

  guardar(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.guardando = true;
    const data = this.form.value;
    const op = this.editando
      ? this.catalogosService.updateHorario(this.editando.id, data)
      : this.catalogosService.createHorario(data);

    op.pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.guardando = false;
        const msg = this.editando ? 'actualizado' : 'creado';
        this.notificationService.success(`Horario ${msg} exitosamente.`, 'Horario');
        this.cerrarFormulario();
        this.cargarHorarios();
      },
      error: (err) => {
        this.guardando = false;
        this.notificationService.error(
          err?.error?.message || 'Error al guardar el horario.',
          'Error'
        );
      }
    });
  }

  toggleActivo(horario: any): void {
    this.catalogosService.updateHorario(horario.id, { activo: !horario.activo })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          horario.activo = !horario.activo;
          const estado = horario.activo ? 'activado' : 'desactivado';
          this.notificationService.success(`Horario ${estado}.`, 'Horario');
        },
        error: () => this.notificationService.error('No se pudo cambiar el estado.', 'Error')
      });
  }

  eliminarHorario(horario: any): void {
    if (!confirm(`¿Eliminar el horario "${horario.nombre}"?`)) return;
    this.catalogosService.deleteHorario(horario.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notificationService.success('Horario eliminado.', 'Horario');
          this.cargarHorarios();
        },
        error: () => this.notificationService.error('No se pudo eliminar el horario.', 'Error')
      });
  }
}
