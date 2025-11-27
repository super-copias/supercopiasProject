import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ResumenVacaciones } from '../../services/eventos-personal.service';

@Component({
  selector: 'app-form-vacaciones',
  template: `
    <div [formGroup]="form">
      <div class="row">
        <div class="col-md-6 mb-3">
          <label class="form-label">Fecha Inicio *</label>
          <input type="date" class="form-control" formControlName="fecha_inicio" 
                 (change)="calcularDias()">
        </div>
        <div class="col-md-6 mb-3">
          <label class="form-label">Fecha Fin *</label>
          <input type="date" class="form-control" formControlName="fecha_fin"
                 (change)="calcularDias()">
        </div>
      </div>

      <div class="alert alert-info" *ngIf="diasCalculados > 0">
        <i class="fas fa-info-circle me-1"></i>
        Total de días: <strong>{{diasCalculados}}</strong> día(s)
      </div>

      <!-- Resumen del año -->
      <div class="card bg-light mb-3" *ngIf="resumenVacaciones">
        <div class="card-body">
          <h6 class="card-title mb-2">Resumen del Año {{resumenVacaciones.anio}}</h6>
          <div class="row g-2 text-center">
            <div class="col-3">
              <small class="text-muted d-block">Sugeridos</small>
              <strong>{{resumenVacaciones.dias_vacaciones_sugeridos}}</strong>
            </div>
            <div class="col-3">
              <small class="text-muted d-block">Tomados</small>
              <strong class="text-info">{{resumenVacaciones.dias_tomados}}</strong>
            </div>
            <div class="col-3">
              <small class="text-muted d-block">Este registro</small>
              <strong class="text-primary">{{diasCalculados}}</strong>
            </div>
            <div class="col-3">
              <small class="text-muted d-block">Total</small>
              <strong [class.text-success]="!excedeDias" [class.text-warning]="excedeDias">
                {{resumenVacaciones.dias_tomados + diasCalculados}}
              </strong>
            </div>
          </div>
          <div class="alert alert-warning mt-2 mb-0 py-2" *ngIf="excedeDias">
            <small>
              <i class="fas fa-exclamation-triangle me-1"></i>
              Se excederían los días sugeridos (+{{diasExcedentes}} días)
            </small>
          </div>
        </div>
      </div>

      <div class="mb-3">
        <label class="form-label">Observaciones</label>
        <textarea class="form-control" formControlName="observaciones" rows="3" 
                  placeholder="Ej: Días adicionales autorizados por desempeño excepcional"></textarea>
        <small class="form-text text-muted">
          Especialmente importante si se exceden los días sugeridos
        </small>
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
export class FormVacacionesComponent {
  @Input() form!: FormGroup;
  @Input() resumenVacaciones: ResumenVacaciones | null = null;

  diasCalculados = 0;
  excedeDias = false;
  diasExcedentes = 0;

  calcularDias() {
    const fechaInicio = this.form.get('fecha_inicio')?.value;
    const fechaFin = this.form.get('fecha_fin')?.value;

    if (!fechaInicio || !fechaFin) {
      this.diasCalculados = 0;
      return;
    }

    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    const diff = Math.abs(fin.getTime() - inicio.getTime());
    this.diasCalculados = Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;

    // Verificar si excede días sugeridos
    if (this.resumenVacaciones) {
      const totalConRegistro = this.resumenVacaciones.dias_tomados + this.diasCalculados;
      this.excedeDias = totalConRegistro > this.resumenVacaciones.dias_vacaciones_sugeridos;
      this.diasExcedentes = totalConRegistro - this.resumenVacaciones.dias_vacaciones_sugeridos;
    }
  }
}
