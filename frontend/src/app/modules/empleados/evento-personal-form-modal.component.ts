import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EventosPersonalService, EventoPersonal, ResumenVacaciones } from '../../services/eventos-personal.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-evento-personal-form-modal',
  template: `
    <div class="modal" [class.show]="visible" [style.display]="visible ? 'block' : 'none'" style="z-index: 1060;">
      <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header bg-primary text-white">
            <h5 class="modal-title">
              <i class="fas fa-calendar-plus me-2"></i>
              {{esEdicion ? 'Ver/Editar Evento' : 'Nuevo Evento de Personal'}}
            </h5>
            <button type="button" class="btn-close btn-close-white" (click)="cerrar.emit()"></button>
          </div>

          <form [formGroup]="form" (ngSubmit)="guardar()">
            <div class="modal-body">
              <!-- Selector de tipo de evento -->
              <div class="mb-3">
                <label class="form-label">Tipo de Evento *</label>
                <div class="row g-2">
                  <div class="col-6 col-md-3" *ngFor="let tipo of tiposEvento">
                    <div class="form-check card h-100">
                      <div class="card-body p-2 text-center">
                        <input class="form-check-input" type="radio" formControlName="tipo" 
                               [value]="tipo.value" [id]="'tipo-' + tipo.value" [disabled]="esEdicion">
                        <label class="form-check-label d-block" [for]="'tipo-' + tipo.value" style="cursor: pointer;">
                          <i class="fas {{tipo.icon}} fa-2x d-block mb-1" [class]="'text-' + tipo.color"></i>
                          <small>{{tipo.label}}</small>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Formulario según tipo seleccionado -->
              <div *ngIf="form.get('tipo')?.value === 'vacaciones'">
                <app-form-vacaciones [form]="form" [resumenVacaciones]="resumenVacaciones"></app-form-vacaciones>
              </div>

              <div *ngIf="form.get('tipo')?.value === 'falta'">
                <app-form-falta [form]="form"></app-form-falta>
              </div>

              <div *ngIf="form.get('tipo')?.value === 'permiso'">
                <app-form-permiso [form]="form"></app-form-permiso>
              </div>

              <div *ngIf="form.get('tipo')?.value === 'otro'">
                <app-form-otro [form]="form"></app-form-otro>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="cerrar.emit()">
                <i class="fas fa-times me-1"></i> Cancelar
              </button>
              <button type="submit" class="btn btn-primary" [disabled]="!form.valid || guardando">
                <i class="fas" [class.fa-save]="!guardando" [class.fa-spinner]="guardando" 
                   [class.fa-spin]="guardando"></i>
                {{guardando ? 'Guardando...' : 'Guardar'}}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    <div class="modal-backdrop" [class.show]="visible" *ngIf="visible" style="z-index: 1055;"></div>
  `
})
export class EventoPersonalFormModalComponent implements OnInit, OnChanges {
  @Input() visible = false;
  @Input() empleadoId!: number;
  @Input() evento: EventoPersonal | null = null;
  @Input() resumenVacaciones: ResumenVacaciones | null = null;
  @Output() cerrar = new EventEmitter<void>();
  @Output() guardado = new EventEmitter<void>();

  form!: FormGroup;
  guardando = false;
  esEdicion = false;

  tiposEvento = [
    { value: 'vacaciones', label: 'Vacaciones', icon: 'fa-umbrella-beach', color: 'primary' },
    { value: 'falta', label: 'Falta', icon: 'fa-times-circle', color: 'danger' },
    { value: 'permiso', label: 'Permiso', icon: 'fa-file-signature', color: 'warning' },
    { value: 'otro', label: 'Otro', icon: 'fa-calendar-check', color: 'info' }
  ];

  constructor(
    private fb: FormBuilder,
    private eventosService: EventosPersonalService,
    private notificationService: NotificationService
  ) {
    this.inicializarForm();
  }

  ngOnInit() {
    if (this.evento) {
      this.cargarEvento();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['evento'] && this.evento) {
      this.cargarEvento();
    } else if (changes['visible'] && this.visible && !this.evento) {
      this.form.reset({ tipo: 'vacaciones', estado: 'aprobado', con_goce_sueldo: true });
      this.esEdicion = false;
    }
  }

  inicializarForm() {
    this.form = this.fb.group({
      tipo: ['vacaciones', Validators.required],
      fecha_inicio: ['', Validators.required],
      fecha_fin: [''],
      hora_inicio: [''],
      hora_fin: [''],
      subtipo: [''],
      estado: ['aprobado', Validators.required],
      justificada: [false],
      con_goce_sueldo: [true],
      motivo: [''],
      observaciones: ['']
    });
  }

  cargarEvento() {
    if (!this.evento) return;
    
    this.esEdicion = true;
    this.form.patchValue({
      tipo: this.evento.tipo,
      fecha_inicio: this.evento.fecha_inicio,
      fecha_fin: this.evento.fecha_fin,
      hora_inicio: this.evento.hora_inicio,
      hora_fin: this.evento.hora_fin,
      subtipo: this.evento.subtipo,
      estado: this.evento.estado,
      justificada: this.evento.justificada,
      con_goce_sueldo: this.evento.con_goce_sueldo,
      motivo: this.evento.motivo,
      observaciones: this.evento.observaciones
    });
  }

  guardar() {
    if (!this.form.valid) {
      this.notificationService.warning('Por favor complete los campos requeridos');
      return;
    }

    this.guardando = true;
    const datos = this.form.value;

    const request = this.esEdicion 
      ? this.eventosService.actualizar(this.empleadoId, this.evento!.id!, datos)
      : this.eventosService.crear(this.empleadoId, datos);

    request.subscribe({
      next: (response) => {
        const mensaje = this.esEdicion ? 'Evento actualizado' : 'Evento registrado';
        this.notificationService.success(mensaje);
        
        // Mostrar advertencia si excede días de vacaciones
        if (response.advertencia) {
          this.notificationService.warning(response.advertencia.mensaje);
        }
        
        this.guardando = false;
        this.guardado.emit();
      },
      error: (error) => {
        console.error('Error al guardar:', error);
        this.notificationService.error(error.error?.mensaje || 'Error al guardar evento');
        this.guardando = false;
      }
    });
  }
}
