import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';

@Component({
  selector: 'app-form-permiso',
  template: `
    <div [formGroup]="form">
      <div class="mb-3">
        <label class="form-label">Fecha *</label>
        <input type="date" class="form-control" formControlName="fecha_inicio">
      </div>

      <div class="mb-3">
        <label class="form-label">Duración</label>
        <div class="row">
          <div class="col-md-6 mb-2">
            <label class="form-label">Hora Inicio</label>
            <input type="time" class="form-control" formControlName="hora_inicio" (change)="calcularHoras()">
          </div>
          <div class="col-md-6 mb-2">
            <label class="form-label">Hora Fin</label>
            <input type="time" class="form-control" formControlName="hora_fin" (change)="calcularHoras()">
          </div>
        </div>
        <div class="alert alert-info py-2 mt-2" *ngIf="horasCalculadas > 0">
          <small><i class="fas fa-clock me-1"></i> Total: <strong>{{horasCalculadas}}</strong> hora(s)</small>
        </div>
      </div>

      <div class="mb-3">
        <label class="form-label">Tipo de Permiso</label>
        <select class="form-select" formControlName="subtipo">
          <option value="">Seleccione un tipo</option>
          <option value="personal">Personal</option>
          <option value="medico">Médico</option>
          <option value="tramite">Trámite Oficial</option>
          <option value="otro">Otro</option>
        </select>
      </div>

      <div class="mb-3">
        <div class="form-check">
          <input class="form-check-input" type="checkbox" formControlName="con_goce_sueldo" id="goce-permiso">
          <label class="form-check-label" for="goce-permiso">
            Con goce de sueldo
          </label>
        </div>
      </div>

      <div class="mb-3">
        <label class="form-label">Motivo</label>
        <textarea class="form-control" formControlName="motivo" rows="3" 
                  placeholder="Describa el motivo del permiso"></textarea>
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
export class FormPermisoComponent {
  @Input() form!: FormGroup;
  horasCalculadas = 0;

  calcularHoras() {
    const horaInicio = this.form.get('hora_inicio')?.value;
    const horaFin = this.form.get('hora_fin')?.value;

    if (!horaInicio || !horaFin) {
      this.horasCalculadas = 0;
      return;
    }

    const [horaInicioH, horaInicioM] = horaInicio.split(':').map(Number);
    const [horaFinH, horaFinM] = horaFin.split(':').map(Number);
    const minutosInicio = horaInicioH * 60 + horaInicioM;
    const minutosFin = horaFinH * 60 + horaFinM;
    this.horasCalculadas = (minutosFin - minutosInicio) / 60;
  }
}
