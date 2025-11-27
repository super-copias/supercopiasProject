import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';

@Component({
  selector: 'app-form-falta',
  template: `
    <div [formGroup]="form">
      <div class="mb-3">
        <label class="form-label">Fecha *</label>
        <input type="date" class="form-control" formControlName="fecha_inicio">
      </div>

      <div class="mb-3">
        <label class="form-label">Tipo de Falta</label>
        <select class="form-select" formControlName="justificada">
          <option [value]="true">Justificada</option>
          <option [value]="false">Injustificada</option>
        </select>
      </div>

      <div class="mb-3">
        <label class="form-label">Motivo</label>
        <select class="form-select" formControlName="subtipo">
          <option value="">Seleccione un motivo</option>
          <option value="enfermedad">Enfermedad</option>
          <option value="familiar">Asunto Familiar</option>
          <option value="personal">Personal</option>
          <option value="otro">Otro</option>
        </select>
      </div>

      <div class="mb-3">
        <label class="form-label">Descripción</label>
        <textarea class="form-control" formControlName="motivo" rows="3" 
                  placeholder="Describa el motivo de la falta"></textarea>
      </div>

      <div class="mb-3">
        <div class="form-check">
          <input class="form-check-input" type="checkbox" formControlName="con_goce_sueldo" id="goce-falta">
          <label class="form-check-label" for="goce-falta">
            Con goce de sueldo
          </label>
        </div>
        <small class="text-muted">Marque si la falta no afecta el salario del empleado</small>
      </div>

      <div class="mb-3">
        <label class="form-label">Observaciones</label>
        <textarea class="form-control" formControlName="observaciones" rows="2" 
                  placeholder="Notas adicionales"></textarea>
      </div>
    </div>
  `
})
export class FormFaltaComponent {
  @Input() form!: FormGroup;
}
