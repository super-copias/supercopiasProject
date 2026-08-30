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
        <div class="d-flex align-items-center gap-2">
          <a class="btn btn-outline-secondary btn-sm d-flex align-items-center"
             [routerLink]="['/admin/empleados']" title="Volver a empleados">
            <i class="fas fa-arrow-left"></i>
          </a>
          <div>
            <h5 class="mb-0"><i class="fas fa-clock me-2"></i>Horarios de Acceso</h5>
            <small class="text-muted">Define los rangos horarios en que los empleados pueden ingresar al sistema.</small>
          </div>
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
            no-administradores automáticamente según el horario <em>activo</em> aquí configurado.
            Solo puede haber <strong>un horario activo</strong> a la vez (o ninguno): al activar uno,
            el que estuviera activo se desactiva. Si ningún horario está activo, se restablece el acceso
            a todos los empleados activos (se quita la restricción). Se admiten rangos que cruzan la
            medianoche (p. ej. 22:00–06:00). Los empleados dados de baja desde la tabla de empleados no se
            ven afectados. Puedes anular el estado de cualquier empleado en cualquier momento desde la tabla de empleados.
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
                  <td><span class="badge bg-light text-dark border">{{ to12h(h.hora_inicio) }}</span></td>
                  <td><span class="badge bg-light text-dark border">{{ to12h(h.hora_fin) }}</span></td>
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
                <div class="col-12">
                  <small class="text-muted">
                    Si la <strong>hora fin</strong> es menor que la <strong>hora inicio</strong>, la franja
                    cruza la medianoche (p. ej. 22:00 → 06:00). Las dos horas no pueden ser iguales.
                  </small>
                  <div *ngIf="form.errors?.['horasIguales']" class="text-danger small mt-1">
                    La hora de inicio y la de fin no pueden ser iguales.
                  </div>
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
    }, { validators: [this.horasDistintasValidator] });
  }

  /** hora_inicio y hora_fin no pueden ser iguales (inicio > fin = cruza medianoche, permitido). */
  private horasDistintasValidator(group: FormGroup) {
    const ini = group.get('hora_inicio')?.value;
    const fin = group.get('hora_fin')?.value;
    return ini && fin && ini === fin ? { horasIguales: true } : null;
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
    const data = this.form.value;

    if (data.activo && !this.confirmarActivacion(data.hora_inicio, data.hora_fin, this.editando?.id)) {
      return;
    }

    this.guardando = true;
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
    const activando = !horario.activo;

    if (activando && !this.confirmarActivacion(horario.hora_inicio, horario.hora_fin, horario.id)) {
      // El usuario canceló: recrear las filas para que el checkbox vuelva a su valor real.
      this.horarios = this.horarios.map(h => ({ ...h }));
      return;
    }

    this.catalogosService.updateHorario(horario.id, { activo: activando })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notificationService.success(`Horario ${activando ? 'activado' : 'desactivado'}.`, 'Horario');
          // Recargar: al activar uno, el backend pudo desactivar otro.
          this.cargarHorarios();
        },
        error: () => {
          this.notificationService.error('No se pudo cambiar el estado.', 'Error');
          this.cargarHorarios();
        }
      });
  }

  /**
   * Confirma la activación de un horario avisando de sus efectos.
   * Devuelve true si se puede proceder (sin avisos o el usuario aceptó).
   */
  private confirmarActivacion(horaInicio: string, horaFin: string, idActual?: number): boolean {
    const avisos: string[] = [];

    const otroActivo = this.horarios.find(h => h.id !== idActual && h.activo);
    if (otroActivo) {
      avisos.push(`Se desactivará el horario activo actual ("${otroActivo.nombre}"). Solo puede haber uno activo.`);
    }

    if (!this.dentroDeRango(horaInicio, horaFin)) {
      avisos.push(
        `La hora actual está FUERA del rango ${this.to12h(horaInicio)}–${this.to12h(horaFin)}: ` +
        `se desactivará el acceso de los empleados no-administradores hasta el próximo inicio de ventana.`
      );
    }

    if (avisos.length === 0) return true;
    return confirm(`Al activar este horario:\n\n• ${avisos.join('\n\n• ')}\n\n¿Continuar?`);
  }

  /** ¿La hora actual del navegador cae dentro del rango? Soporta rangos que cruzan medianoche. */
  private dentroDeRango(horaInicio: string, horaFin: string): boolean {
    const toMin = (t: string) => {
      const [h, m] = t.slice(0, 5).split(':').map(Number);
      return h * 60 + m;
    };
    const i = toMin(horaInicio);
    const f = toMin(horaFin);
    const now = new Date();
    const a = now.getHours() * 60 + now.getMinutes();
    if (i === f) return true;
    return i < f ? (a >= i && a <= f) : (a >= i || a <= f);
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

  to12h(time: string): string {
    if (!time) return '';
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${period}`;
  }
}
