import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';

@Component({
  selector: 'app-form-otro',
  template: `
    <div [formGroup]="form">
      <div class="row">
        <div class="col-md-6 mb-3">
          <label class="form-label">Fecha Inicio *</label>
          <input type="date" class="form-control" formControlName="fecha_inicio">
        </div>
        <div class="col-md-6 mb-3">
          <label class="form-label">Fecha Fin</label>
          <input type="date" class="form-control" formControlName="fecha_fin">
          <small class="text-muted">Opcional para eventos de un solo día</small>
        </div>
      </div>

      <div class="mb-3">
        <label class="form-label">Tipo de Evento</label>
        <select class="form-select" formControlName="subtipo">
          <option value="">Seleccione un tipo</option>
          <option value="capacitacion">Capacitación</option>
          <option value="comision">Comisión</option>
          <option value="suspension">Suspensión</option>
          <option value="licencia">Licencia</option>
          <option value="otro">Otro</option>
        </select>
      </div>

      <div class="mb-3">
        <label class="form-label">Título del Evento</label>
        <input type="text" class="form-control" formControlName="motivo" 
               placeholder="Ej: Curso de Atención al Cliente">
      </div>

      <div class="mb-3">
        <label class="form-label">Descripción</label>
        <textarea class="form-control" formControlName="observaciones" rows="3" 
                  placeholder="Descripción detallada del evento"></textarea>
      </div>

      <div class="mb-3">
        <div class="form-check">
          <input class="form-check-input" type="checkbox" formControlName="con_goce_sueldo" id="goce-otro">
          <label class="form-check-label" for="goce-otro">
            Afecta salario
          </label>
        </div>
        <small class="text-muted">Marque si este evento afecta el salario del empleado</small>
      </div>

      <div class="mb-3">
        <label class="form-label">Estado</label>
        <select class="form-select" formControlName="estado">
          <option value="pendiente">Pendiente</option>
          <option value="aprobado">Aprobado</option>
          <option value="rechazado">Rechazado</option>
        </select>
      </div>
    </div>
  `
})
export class FormOtroComponent {
  @Input() form!: FormGroup;
}
