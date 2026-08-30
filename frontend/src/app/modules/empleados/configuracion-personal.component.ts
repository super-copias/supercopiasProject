import { Component, OnInit, OnDestroy } from '@angular/core';
import { Location } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TurnosService } from '../../services/turnos.service';
import { PermisosConfigService } from '../../services/permisos-config.service';
import { Turno } from '../../shared/interfaces';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-configuracion-personal',
  template: `
    <div class="container-fluid p-4">
      <button class="btn btn-outline-secondary btn-sm mb-3" (click)="volver()">
        <i class="fas fa-arrow-left me-1"></i>Volver
      </button>
      <h3 class="mb-4"><i class="fas fa-sliders-h me-2"></i>Configuración de Personal</h3>

      <!-- Límite diario de permisos -->
      <div class="card mb-4">
        <div class="card-header">
          <h5 class="mb-0"><i class="fas fa-file-signature me-2"></i>Límite Diario de Permisos</h5>
          <small class="text-muted">Cantidad máxima de permisos sugerida por día entre todos los empleados. Es informativo: al superarse se permite el registro y solo se muestra una alerta.</small>
        </div>
        <div class="card-body">
          <div class="row align-items-end g-2">
            <div class="col-auto">
              <label class="form-label">Límite diario</label>
              <input type="number" class="form-control" style="width: 120px;" min="1" [(ngModel)]="limiteDiario">
            </div>
            <div class="col-auto">
              <button class="btn btn-primary" [disabled]="guardandoLimite || !limiteDiario || limiteDiario < 1" (click)="guardarLimite()">
                <i class="fas fa-spinner fa-spin me-1" *ngIf="guardandoLimite"></i>Guardar
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Catálogo de turnos -->
      <div class="card">
        <div class="card-header d-flex justify-content-between align-items-center">
          <h5 class="mb-0"><i class="fas fa-clock me-2"></i>Catálogo de Turnos</h5>
          <button class="btn btn-sm btn-primary" (click)="abrirNuevo()" [disabled]="loading">
            <i class="fas fa-plus me-1"></i>Nuevo turno
          </button>
        </div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover table-sm mb-0">
              <thead class="table-light">
                <tr>
                  <th>Nombre</th>
                  <th>Hora entrada</th>
                  <th>Hora salida</th>
                  <th>Estado</th>
                  <th class="text-end" style="width: 140px;">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngIf="loading">
                  <td colspan="5" class="text-center py-3"><i class="fas fa-spinner fa-spin me-1"></i>Cargando...</td>
                </tr>
                <tr *ngIf="!loading && turnos.length === 0">
                  <td colspan="5" class="text-center text-muted py-3">No hay turnos configurados</td>
                </tr>
                <tr *ngFor="let t of turnos">
                  <td class="fw-medium">{{ t.nombre }}</td>
                  <td>{{ t.hora_entrada }}</td>
                  <td>{{ t.hora_salida }}</td>
                  <td>
                    <span class="badge" [class.bg-success]="t.activo" [class.bg-secondary]="!t.activo">
                      {{ t.activo ? 'Activo' : 'Inactivo' }}
                    </span>
                  </td>
                  <td class="text-end">
                    <div class="btn-group btn-group-sm">
                      <button class="btn btn-outline-primary" (click)="abrirEditar(t)" title="Editar"><i class="fas fa-edit"></i></button>
                      <button class="btn" [class.btn-outline-danger]="t.activo" [class.btn-outline-success]="!t.activo"
                              (click)="toggleEstado(t)" [title]="t.activo ? 'Desactivar' : 'Activar'">
                        <i class="fas" [class.fa-ban]="t.activo" [class.fa-check]="!t.activo"></i>
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

    <!-- Modal de formulario de turno -->
    <div class="modal" [class.show]="mostrarModal" [style.display]="mostrarModal ? 'block' : 'none'" style="z-index: 1060;" *ngIf="mostrarModal">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-primary text-white">
            <h5 class="modal-title">{{ editando ? 'Editar' : 'Nuevo' }} turno</h5>
            <button type="button" class="btn-close btn-close-white" (click)="cerrarModal()"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label">Nombre *</label>
              <input type="text" class="form-control" [(ngModel)]="form.nombre" placeholder="Ej: Nocturno">
            </div>
            <div class="row">
              <div class="col-6 mb-3">
                <label class="form-label">Hora de entrada *</label>
                <input type="time" class="form-control" [(ngModel)]="form.horaEntrada">
              </div>
              <div class="col-6 mb-3">
                <label class="form-label">Hora de salida *</label>
                <input type="time" class="form-control" [(ngModel)]="form.horaSalida">
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="cerrarModal()">Cancelar</button>
            <button type="button" class="btn btn-primary" [disabled]="guardando || !form.nombre || !form.horaEntrada || !form.horaSalida" (click)="guardar()">
              <i class="fas fa-spinner fa-spin me-1" *ngIf="guardando"></i>Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
    <div class="modal-backdrop" [class.show]="mostrarModal" *ngIf="mostrarModal" style="z-index: 1055;"></div>
  `
})
export class ConfiguracionPersonalComponent implements OnInit, OnDestroy {
  turnos: Turno[] = [];
  loading = false;
  guardando = false;
  mostrarModal = false;
  editando: Turno | null = null;
  form = { nombre: '', horaEntrada: '', horaSalida: '' };

  limiteDiario: number | null = null;
  guardandoLimite = false;

  private destroy$ = new Subject<void>();

  constructor(
    private turnosService: TurnosService,
    private permisosConfigService: PermisosConfigService,
    private notificationService: NotificationService,
    private location: Location
  ) {}

  volver() {
    this.location.back();
  }

  ngOnInit() {
    this.cargarTurnos();
    this.cargarLimite();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarTurnos() {
    this.loading = true;
    this.turnosService.listar(true).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.turnos = response.data || [];
        this.loading = false;
      },
      error: () => {
        this.notificationService.error('Error al cargar el catálogo de turnos');
        this.loading = false;
      }
    });
  }

  cargarLimite() {
    this.permisosConfigService.obtener().pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => { this.limiteDiario = response.data?.limite_diario ?? 2; },
      error: () => { this.limiteDiario = 2; }
    });
  }

  guardarLimite() {
    if (!this.limiteDiario || this.limiteDiario < 1) return;
    this.guardandoLimite = true;
    this.permisosConfigService.actualizar(this.limiteDiario).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.notificationService.success('Límite diario de permisos actualizado');
        this.guardandoLimite = false;
      },
      error: () => {
        this.notificationService.error('Error al actualizar el límite diario');
        this.guardandoLimite = false;
      }
    });
  }

  abrirNuevo() {
    this.editando = null;
    this.form = { nombre: '', horaEntrada: '', horaSalida: '' };
    this.mostrarModal = true;
  }

  abrirEditar(t: Turno) {
    this.editando = t;
    this.form = { nombre: t.nombre, horaEntrada: t.hora_entrada, horaSalida: t.hora_salida };
    this.mostrarModal = true;
  }

  cerrarModal() {
    if (this.guardando) return;
    this.mostrarModal = false;
  }

  guardar() {
    this.guardando = true;
    const request = this.editando
      ? this.turnosService.actualizar(this.editando.id, this.form)
      : this.turnosService.crear(this.form as any);

    request.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.notificationService.success(this.editando ? 'Turno actualizado' : 'Turno creado');
        this.guardando = false;
        this.mostrarModal = false;
        this.cargarTurnos();
      },
      error: (error) => {
        this.notificationService.error(error?.error?.error?.message || 'Error al guardar el turno');
        this.guardando = false;
      }
    });
  }

  toggleEstado(t: Turno) {
    this.turnosService.toggleEstado(t.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.notificationService.success(`Turno ${t.activo ? 'desactivado' : 'activado'}`);
        this.cargarTurnos();
      },
      error: () => { this.notificationService.error('Error al cambiar el estado del turno'); }
    });
  }
}
