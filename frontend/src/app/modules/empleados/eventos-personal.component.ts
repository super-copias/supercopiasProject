import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { EventosPersonalService, EventoPersonal, ResumenVacaciones } from '../../services/eventos-personal.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-eventos-personal',
  template: `
    <div class="eventos-personal-container">
      <!-- Header con resumen de vacaciones -->
      <div class="card mb-3" *ngIf="resumenVacaciones">
        <div class="card-header bg-primary text-white">
          <h6 class="mb-0">
            <i class="fas fa-umbrella-beach me-2"></i>
            Resumen de Vacaciones {{anioActual}}
          </h6>
        </div>
        <div class="card-body">
          <div class="row g-2">
            <div class="col-md-3">
              <div class="stat-box">
                <small class="text-muted d-block">Días Sugeridos</small>
                <h4 class="mb-0">{{resumenVacaciones.dias_vacaciones_sugeridos}}</h4>
              </div>
            </div>
            <div class="col-md-3">
              <div class="stat-box">
                <small class="text-muted d-block">Tomados</small>
                <h4 class="mb-0 text-info">{{resumenVacaciones.dias_tomados}}</h4>
              </div>
            </div>
            <div class="col-md-3">
              <div class="stat-box">
                <small class="text-muted d-block">Restantes</small>
                <h4 class="mb-0" [class.text-success]="!resumenVacaciones.excede_sugeridos" 
                    [class.text-warning]="resumenVacaciones.excede_sugeridos">
                  {{resumenVacaciones.dias_restantes}}
                </h4>
              </div>
            </div>
            <div class="col-md-3">
              <div class="stat-box">
                <small class="text-muted d-block">Pendientes</small>
                <h4 class="mb-0 text-warning">{{resumenVacaciones.dias_pendientes}}</h4>
              </div>
            </div>
          </div>
          <div class="alert alert-warning mt-2 mb-0 py-2" *ngIf="resumenVacaciones.excede_sugeridos">
            <small>
              <i class="fas fa-exclamation-triangle me-1"></i>
              Se exceden los días sugeridos (+{{resumenVacaciones.dias_excedentes}} días)
            </small>
          </div>
        </div>
      </div>

      <!-- Toolbar -->
      <div class="card mb-3">
        <div class="card-body py-2">
          <div class="d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div class="d-flex gap-2 flex-wrap">
              <button class="btn btn-sm btn-primary" (click)="abrirModalNuevo()" title="Nuevo evento">
                <i class="fas fa-plus"></i>
                <span class="d-none d-sm-inline ms-1">Nuevo</span>
              </button>
              
              <!-- Filtros -->
              <select class="form-select form-select-sm" style="width: auto;" [(ngModel)]="filtroTipo" 
                      (change)="cargarEventos()">
                <option value="">Todos los eventos</option>
                <option value="vacaciones">Vacaciones</option>
                <option value="falta">Faltas</option>
                <option value="permiso">Permisos</option>
                <option value="otro">Otros</option>
              </select>

              <select class="form-select form-select-sm" style="width: auto;" [(ngModel)]="anioFiltro" 
                      (change)="cargarEventos()">
                <option [value]="anioActual - 1">{{anioActual - 1}}</option>
                <option [value]="anioActual">{{anioActual}}</option>
                <option [value]="anioActual + 1">{{anioActual + 1}}</option>
              </select>
            </div>
            
            <button class="btn btn-sm btn-outline-secondary" (click)="cargarEventos()" title="Refrescar">
              <i class="fas fa-sync-alt" [class.fa-spin]="loading"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- Lista de eventos -->
      <div class="card">
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover table-sm mb-0">
              <thead class="table-light">
                <tr>
                  <th width="100">Tipo</th>
                  <th>Fechas</th>
                  <th width="100">Duración</th>
                  <th>Motivo</th>
                  <th width="100">Estado</th>
                  <th width="100" class="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngIf="loading">
                  <td colspan="6" class="text-center py-3">
                    <i class="fas fa-spinner fa-spin me-1"></i> Cargando eventos...
                  </td>
                </tr>
                <tr *ngIf="!loading && eventos.length === 0">
                  <td colspan="6" class="text-center text-muted py-3">
                    <i class="fas fa-calendar-times me-1"></i>
                    No hay eventos registrados
                  </td>
                </tr>
                <tr *ngFor="let evento of eventos">
                  <td>
                    <span class="badge" [class]="'bg-' + eventosService.getColorTipo(evento.tipo)">
                      <i class="fas {{eventosService.getIconoTipo(evento.tipo)}} me-1"></i>
                      {{eventosService.formatearTipo(evento.tipo)}}
                    </span>
                  </td>
                  <td>
                    <small>
                      {{evento.fecha_inicio | date:'dd/MM/yyyy'}}
                      <span *ngIf="evento.fecha_fin && evento.fecha_fin !== evento.fecha_inicio">
                        - {{evento.fecha_fin | date:'dd/MM/yyyy'}}
                      </span>
                      <span *ngIf="evento.hora_inicio">
                        <br>{{evento.hora_inicio}} - {{evento.hora_fin}}
                      </span>
                    </small>
                  </td>
                  <td>
                    <span *ngIf="evento.dias_totales">{{evento.dias_totales}} día(s)</span>
                    <span *ngIf="evento.horas_totales">{{evento.horas_totales}} hora(s)</span>
                  </td>
                  <td>
                    <small>
                      <span *ngIf="evento.subtipo" class="text-muted">{{evento.subtipo}}<br></span>
                      {{evento.motivo || evento.observaciones || '-'}}
                    </small>
                  </td>
                  <td>
                    <span class="badge" [class]="'bg-' + eventosService.getColorEstado(evento.estado)">
                      {{eventosService.formatearEstado(evento.estado)}}
                    </span>
                  </td>
                  <td class="text-end">
                    <div class="btn-group btn-group-sm">
                      <button class="btn btn-sm btn-outline-primary" (click)="verDetalle(evento)" title="Ver detalle">
                        <i class="fas fa-eye"></i>
                      </button>
                      <button class="btn btn-sm btn-outline-danger" (click)="eliminar(evento)" title="Eliminar">
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
    <app-evento-personal-form-modal
      [visible]="mostrarModal"
      [empleadoId]="empleadoId"
      [evento]="eventoSeleccionado"
      [resumenVacaciones]="resumenVacaciones"
      (cerrar)="cerrarModal()"
      (guardado)="onEventoGuardado()">
    </app-evento-personal-form-modal>
  `,
  styles: [`
    .stat-box {
      text-align: center;
      padding: 0.5rem;
    }

    .stat-box h4 {
      font-weight: bold;
      font-size: 1.5rem;
    }
  `]
})
export class EventosPersonalComponent implements OnInit, OnDestroy {
  @Input() empleadoId!: number;
  
  eventos: EventoPersonal[] = [];
  resumenVacaciones: ResumenVacaciones | null = null;
  loading = false;
  anioActual = new Date().getFullYear();
  anioFiltro = new Date().getFullYear();
  filtroTipo = '';
  
  mostrarModal = false;
  eventoSeleccionado: EventoPersonal | null = null;
  
  private destroy$ = new Subject<void>();

  constructor(
    public eventosService: EventosPersonalService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    if (!this.empleadoId) {
      console.error('empleadoId es requerido');
      return;
    }
    this.cargarDatos();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarDatos() {
    this.cargarEventos();
    this.cargarResumenVacaciones();
  }

  cargarEventos() {
    this.loading = true;
    const filtros = {
      tipo: this.filtroTipo || undefined,
      anio: this.anioFiltro
    };

    this.eventosService.listar(this.empleadoId, filtros)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.eventos = response.data || [];
          this.loading = false;
        },
        error: (error) => {
          console.error('Error al cargar eventos:', error);
          this.notificationService.error('Error al cargar eventos');
          this.loading = false;
        }
      });
  }

  cargarResumenVacaciones() {
    this.eventosService.getResumenVacaciones(this.empleadoId, this.anioFiltro)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.resumenVacaciones = response.data;
        },
        error: (error) => {
          console.error('Error al cargar resumen de vacaciones:', error);
        }
      });
  }

  abrirModalNuevo() {
    this.eventoSeleccionado = null;
    this.mostrarModal = true;
  }

  verDetalle(evento: EventoPersonal) {
    this.eventoSeleccionado = evento;
    this.mostrarModal = true;
  }

  cerrarModal() {
    this.mostrarModal = false;
    this.eventoSeleccionado = null;
  }

  onEventoGuardado() {
    this.cerrarModal();
    this.cargarDatos();
  }

  eliminar(evento: EventoPersonal) {
    if (!confirm(`¿Está seguro de eliminar este evento de ${evento.tipo}?`)) {
      return;
    }

    this.eventosService.eliminar(this.empleadoId, evento.id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notificationService.success('Evento eliminado correctamente');
          this.cargarDatos();
        },
        error: (error) => {
          console.error('Error al eliminar evento:', error);
          this.notificationService.error('Error al eliminar evento');
        }
      });
  }
}
