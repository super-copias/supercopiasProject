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
        <div class="card-header">
          <h6 class="mb-0"><i class="fas fa-calendar-week me-2"></i>Horario Semanal</h6>
        </div>
        <div class="card-body">
          <div *ngIf="loading" class="text-center py-3"><i class="fas fa-spinner fa-spin me-1"></i>Cargando...</div>
          <div class="row g-2" *ngIf="!loading">
            <div class="col-6 col-md-3" *ngFor="let dia of dias">
              <label class="form-label small">{{ dia.label }}</label>
              <select class="form-select form-select-sm" [(ngModel)]="dia.turnoId">
                <option [ngValue]="null">Sin turno (descanso)</option>
                <option *ngFor="let turno of turnos" [ngValue]="turno.id">{{ turno.nombre }} ({{ turno.hora_entrada | hora12 }} - {{ turno.hora_salida | hora12 }})</option>
              </select>
            </div>
          </div>
          <div class="mt-3 d-flex gap-2" *ngIf="!loading">
            <button class="btn btn-primary btn-sm" [disabled]="guardando || !hayCambios" (click)="guardar()">
              <i class="fas fa-spinner fa-spin me-1" *ngIf="guardando"></i>Guardar cambios
            </button>
            <button class="btn btn-outline-secondary btn-sm" *ngIf="hayCambios" [disabled]="guardando" (click)="descartar()">
              <i class="fas fa-undo me-1"></i>Descartar
            </button>
          </div>
        </div>
      </div>

      <div class="card mb-3" *ngIf="!loading">
        <div class="card-header">
          <h6 class="mb-0"><i class="fas fa-calculator me-2"></i>Horas Trabajadas</h6>
          <small class="text-muted">Calculado según el horario semanal configurado. No se almacena.</small>
        </div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-sm mb-0">
              <thead class="table-light">
                <tr>
                  <th>Día</th>
                  <th>Turno</th>
                  <th class="text-end">Horas</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let dia of dias">
                  <td><small>{{ dia.label }}</small></td>
                  <td><small>{{ turnoPorId(dia.turnoId)?.nombre || 'Descanso' }}</small></td>
                  <td class="text-end"><small>{{ dia.turnoId ? formatHoras(horasDelTurno(dia.turnoId)) : '—' }}</small></td>
                </tr>
              </tbody>
              <tfoot class="table-light">
                <tr class="fw-bold">
                  <td colspan="2">Total semanal ({{ diasLaborados }} {{ diasLaborados === 1 ? 'día' : 'días' }})</td>
                  <td class="text-end">{{ formatHoras(totalHorasSemana) }}</td>
                </tr>
                <tr>
                  <td colspan="2"><small class="text-muted">Promedio por día laborado</small></td>
                  <td class="text-end"><small class="text-muted">{{ diasLaborados ? formatHoras(totalHorasSemana / diasLaborados) : '—' }}</small></td>
                </tr>
                <tr>
                  <td colspan="2"><small class="text-muted">Estimado mensual (x4.33 semanas)</small></td>
                  <td class="text-end"><small class="text-muted">{{ formatHoras(totalHorasSemana * 4.33) }}</small></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h6 class="mb-0"><i class="fas fa-history me-2"></i>Historial de Turnos</h6>
        </div>
        <div class="card-body p-0">
          <div class="table-responsive historial-scroll">
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
                  <td><small>{{ h.fecha_cambio | date:'dd/MM/yyyy hh:mm a' }}</small></td>
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
  `,
  styles: [`
    /* El historial genera su propio scroll interno para no desplazar todo el modal.
       La altura se adapta al alto de la pantalla (min/max en px como respaldo). */
    .historial-scroll {
      max-height: clamp(180px, 32vh, 420px);
      overflow-y: auto;
    }
    .historial-scroll table thead th {
      position: sticky;
      top: 0;
      z-index: 1;
    }
  `]
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

  /** Estado original (turnoId por día) para detectar cambios reales */
  private original: (number | null)[] = [];

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
        this.original = this.dias.map(d => d.turnoId);
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
    this.turnosService.getHistorial(this.empleadoId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => { this.historial = response.data || []; },
      error: () => { this.historial = []; }
    });
  }

  turnoPorId(id: number | null): Turno | undefined {
    return id == null ? undefined : this.turnos.find(t => t.id === id);
  }

  private parseHora(h: string): number {
    const [hh, mm] = (h || '0:0').split(':').map(Number);
    return (hh || 0) + (mm || 0) / 60;
  }

  horasDelTurno(id: number | null): number {
    const turno = this.turnoPorId(id);
    if (!turno) return 0;
    let diff = this.parseHora(turno.hora_salida) - this.parseHora(turno.hora_entrada);
    if (diff <= 0) diff += 24; // Turno que cruza medianoche
    return diff;
  }

  get diasLaborados(): number {
    return this.dias.filter(d => d.turnoId != null).length;
  }

  get totalHorasSemana(): number {
    return this.dias.reduce((acc, d) => acc + this.horasDelTurno(d.turnoId), 0);
  }

  formatHoras(horasDecimal: number): string {
    const horas = Math.floor(horasDecimal);
    const minutos = Math.round((horasDecimal - horas) * 60);
    return minutos ? `${horas}h ${minutos}m` : `${horas}h`;
  }

  get hayCambios(): boolean {
    return this.dias.some((d, i) => d.turnoId !== this.original[i]);
  }

  descartar() {
    this.dias = this.dias.map((d, i) => ({ ...d, turnoId: this.original[i] ?? null }));
  }

  guardar() {
    if (!this.hayCambios) return;
    this.guardando = true;
    const dias = this.dias.map(d => ({ diaSemana: d.dia, turnoId: d.turnoId }));
    this.turnosService.setTurnosDias(this.empleadoId, dias).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.notificationService.success('Horario semanal actualizado');
        this.guardando = false;
        this.cargar();
      },
      error: () => {
        this.notificationService.error('Error al actualizar el horario semanal');
        this.guardando = false;
      }
    });
  }
}
