import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TurnosService, TurnoHistorial, DIAS_SEMANA_LABELS } from '../../services/turnos.service';
import { Turno, TurnoDia } from '../../shared/interfaces';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-turnos-semana',
  template: `
    <div class="turnos-semana-container">
      <div class="card mb-3">
        <div class="card-header d-flex justify-content-between align-items-center">
          <h6 class="mb-0"><i class="fas fa-calendar-week me-2"></i>Horario Semanal</h6>
          <button class="btn btn-sm" [class.btn-primary]="!editando" [class.btn-secondary]="editando" (click)="toggleEditar()" [disabled]="loading">
            <i class="fas" [class.fa-edit]="!editando" [class.fa-times]="editando"></i>
            {{ editando ? 'Cancelar' : 'Editar' }}
          </button>
        </div>
        <div class="card-body">
          <div *ngIf="loading" class="text-center py-3"><i class="fas fa-spinner fa-spin me-1"></i>Cargando...</div>
          <div class="row g-2" *ngIf="!loading">
            <div class="col-6 col-md-3" *ngFor="let dia of dias">
              <label class="form-label small">{{ dia.label }}</label>
              <select class="form-select form-select-sm" [(ngModel)]="dia.turnoId" [disabled]="!editando">
                <option [ngValue]="null">Sin turno (descanso)</option>
                <option *ngFor="let turno of turnos" [ngValue]="turno.id">{{ turno.nombre }} ({{ turno.hora_entrada }}-{{ turno.hora_salida }})</option>
              </select>
            </div>
          </div>
          <div class="mt-3" *ngIf="editando">
            <button class="btn btn-primary btn-sm" [disabled]="guardando" (click)="guardar()">
              <i class="fas fa-spinner fa-spin me-1" *ngIf="guardando"></i>Guardar horario
            </button>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h6 class="mb-0"><i class="fas fa-history me-2"></i>Historial de Turnos</h6>
        </div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover table-sm mb-0">
              <thead class="table-light">
                <tr>
                  <th>Fecha</th>
                  <th>Día</th>
                  <th>Turno</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngIf="historial.length === 0">
                  <td colspan="4" class="text-center text-muted py-3">Sin historial de turnos</td>
                </tr>
                <tr *ngFor="let h of historial">
                  <td><small>{{ h.fecha_cambio | date:'dd/MM/yyyy HH:mm' }}</small></td>
                  <td><small>{{ diasSemanaLabels[h.dia_semana] }}</small></td>
                  <td><small>{{ h.turno_nombre || 'Sin turno' }}</small></td>
                  <td><span class="badge bg-light text-dark border">{{ h.accion }}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `
})
export class TurnosSemanaComponent implements OnInit, OnChanges, OnDestroy {
  @Input() empleadoId!: number;

  turnos: Turno[] = [];
  dias: { dia: number; label: string; turnoId: number | null }[] = [1, 2, 3, 4, 5, 6, 7].map(dia => ({
    dia, label: DIAS_SEMANA_LABELS[dia], turnoId: null
  }));
  historial: TurnoHistorial[] = [];
  diasSemanaLabels = DIAS_SEMANA_LABELS;

  loading = false;
  guardando = false;
  editando = false;

  private destroy$ = new Subject<void>();

  constructor(private turnosService: TurnosService, private notificationService: NotificationService) {}

  ngOnInit() {
    this.turnosService.listar().pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => { this.turnos = response.data || []; },
      error: () => { this.turnos = []; }
    });
    this.cargar();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['empleadoId'] && !changes['empleadoId'].firstChange) {
      this.cargar();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargar() {
    if (!this.empleadoId) return;
    this.loading = true;
    this.turnosService.getTurnosDias(this.empleadoId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        const porDia = new Map((response.data || []).map((d: TurnoDia) => [d.dia_semana, d.turno_id]));
        this.dias = this.dias.map(d => ({ ...d, turnoId: porDia.has(d.dia) ? (porDia.get(d.dia) as number | null) : null }));
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
    this.turnosService.getHistorial(this.empleadoId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => { this.historial = response.data || []; },
      error: () => { this.historial = []; }
    });
  }

  toggleEditar() {
    if (this.editando) {
      this.cargar(); // Descartar cambios no guardados
    }
    this.editando = !this.editando;
  }

  guardar() {
    this.guardando = true;
    const dias = this.dias.map(d => ({ diaSemana: d.dia, turnoId: d.turnoId }));
    this.turnosService.setTurnosDias(this.empleadoId, dias).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.notificationService.success('Horario semanal actualizado');
        this.guardando = false;
        this.editando = false;
        this.cargar();
      },
      error: () => {
        this.notificationService.error('Error al actualizar el horario semanal');
        this.guardando = false;
      }
    });
  }
}
