import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SueldosService } from '../../services/sueldos.service';
import { SueldoHistorial } from '../../shared/interfaces';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-sueldos',
  template: `
    <div class="sueldos-container">
      <div class="card mb-3">
        <div class="card-header d-flex justify-content-between align-items-center">
          <h6 class="mb-0"><i class="fas fa-money-bill-wave me-2"></i>Historial de Sueldos</h6>
          <button class="btn btn-sm btn-primary" (click)="abrirNuevo()" [disabled]="loading">
            <i class="fas fa-plus me-1"></i>Nuevo registro
          </button>
        </div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover table-sm mb-0">
              <thead class="table-light">
                <tr>
                  <th>Fecha de asignación</th>
                  <th>Monto</th>
                  <th>Observaciones</th>
                  <th class="text-end" style="width: 100px;">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngIf="loading">
                  <td colspan="4" class="text-center py-3"><i class="fas fa-spinner fa-spin me-1"></i>Cargando...</td>
                </tr>
                <tr *ngIf="!loading && historial.length === 0">
                  <td colspan="4" class="text-center text-muted py-3">Sin registros de sueldo</td>
                </tr>
                <tr *ngFor="let h of historial">
                  <td>{{ h.fecha_asignacion | date:'dd/MM/yyyy' }}</td>
                  <td class="fw-medium">{{ h.monto | currency:'MXN':'symbol':'1.2-2' }}</td>
                  <td><small>{{ h.observaciones || '-' }}</small></td>
                  <td class="text-end">
                    <div class="btn-group btn-group-sm">
                      <button class="btn btn-outline-primary" (click)="abrirEditar(h)" title="Editar">
                        <i class="fas fa-edit"></i>
                      </button>
                      <button class="btn btn-outline-danger" (click)="eliminar(h)" title="Eliminar definitivamente">
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

    <!-- Modal de formulario -->
    <div class="modal" [class.show]="mostrarModal" [style.display]="mostrarModal ? 'block' : 'none'" style="z-index: 1070;" *ngIf="mostrarModal">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-primary text-white">
            <h5 class="modal-title">{{ editando ? 'Editar' : 'Nuevo' }} registro de sueldo</h5>
            <button type="button" class="btn-close btn-close-white" (click)="cerrarModal()"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label">Monto *</label>
              <div class="input-group">
                <span class="input-group-text">$</span>
                <input type="number" class="form-control" [(ngModel)]="form.monto" min="0.01" step="0.01">
                <span class="input-group-text">MXN</span>
              </div>
            </div>
            <div class="mb-3">
              <label class="form-label">Fecha de asignación *</label>
              <input type="date" class="form-control" [(ngModel)]="form.fechaAsignacion">
            </div>
            <div class="mb-3">
              <label class="form-label">Observaciones</label>
              <textarea class="form-control" rows="2" [(ngModel)]="form.observaciones"></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="cerrarModal()">Cancelar</button>
            <button type="button" class="btn btn-primary" [disabled]="guardando || !form.monto || !form.fechaAsignacion" (click)="guardar()">
              <i class="fas fa-spinner fa-spin me-1" *ngIf="guardando"></i>Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
    <div class="modal-backdrop" [class.show]="mostrarModal" *ngIf="mostrarModal" style="z-index: 1065;"></div>
  `
})
export class SueldosComponent implements OnInit, OnDestroy {
  @Input() empleadoId!: number;

  historial: SueldoHistorial[] = [];
  loading = false;
  guardando = false;
  mostrarModal = false;
  editando: SueldoHistorial | null = null;
  form: { monto: number | null; fechaAsignacion: string; observaciones: string } = { monto: null, fechaAsignacion: '', observaciones: '' };

  private destroy$ = new Subject<void>();

  constructor(private sueldosService: SueldosService, private notificationService: NotificationService) {}

  ngOnInit() {
    this.cargar();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargar() {
    this.loading = true;
    this.sueldosService.listar(this.empleadoId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.historial = response.data || [];
        this.loading = false;
      },
      error: () => {
        this.notificationService.error('Error al cargar el historial de sueldos');
        this.loading = false;
      }
    });
  }

  abrirNuevo() {
    this.editando = null;
    this.form = { monto: null, fechaAsignacion: this.hoy(), observaciones: '' };
    this.mostrarModal = true;
  }

  abrirEditar(h: SueldoHistorial) {
    this.editando = h;
    this.form = { monto: h.monto, fechaAsignacion: h.fecha_asignacion, observaciones: h.observaciones || '' };
    this.mostrarModal = true;
  }

  cerrarModal() {
    if (this.guardando) return;
    this.mostrarModal = false;
  }

  guardar() {
    if (!this.form.monto || !this.form.fechaAsignacion) return;
    this.guardando = true;
    const datos = { monto: this.form.monto, fechaAsignacion: this.form.fechaAsignacion, observaciones: this.form.observaciones };

    const request = this.editando
      ? this.sueldosService.actualizar(this.empleadoId, this.editando.id, datos)
      : this.sueldosService.crear(this.empleadoId, datos);

    request.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.notificationService.success(this.editando ? 'Sueldo actualizado' : 'Sueldo registrado');
        this.guardando = false;
        this.mostrarModal = false;
        this.cargar();
      },
      error: (error) => {
        this.notificationService.error(error?.error?.error?.message || 'Error al guardar el sueldo');
        this.guardando = false;
      }
    });
  }

  eliminar(h: SueldoHistorial) {
    if (!confirm('¿Eliminar definitivamente este registro de sueldo? Esta acción no se puede deshacer.')) return;

    this.sueldosService.eliminar(this.empleadoId, h.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.notificationService.success('Registro eliminado');
        this.cargar();
      },
      error: () => {
        this.notificationService.error('Error al eliminar el registro');
      }
    });
  }

  private hoy(): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  }
}
