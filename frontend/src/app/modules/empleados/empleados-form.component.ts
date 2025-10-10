import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EmpleadosService } from '../../services/empleados.service';

const MODULOS = [
  { id: 'dashboard', nombre: 'Dashboard', icono: 'fas fa-tachometer-alt' },
  { id: 'empleados', nombre: 'Empleados', icono: 'fas fa-users' },
  { id: 'clientes', nombre: 'Clientes', icono: 'fas fa-user-friends' },
  { id: 'proveedores', nombre: 'Proveedores', icono: 'fas fa-truck' },
  { id: 'inventarios', nombre: 'Inventarios', icono: 'fas fa-boxes' },
  { id: 'equipos', nombre: 'Equipos', icono: 'fas fa-tools' },
  { id: 'reportes', nombre: 'Reportes', icono: 'fas fa-chart-bar' },
  { id: 'puntoventa', nombre: 'Punto de Venta', icono: 'fas fa-cash-register' }
];

@Component({
  selector: 'app-empleados-form',
  template: `
    <div class="container-fluid p-4">
      <h3 class="mb-4">
        <i class="fas fa-user-tie me-2"></i>
        Nuevo Empleado
      </h3>
      
      <form [formGroup]="empleadoForm" (ngSubmit)="onSubmit()">
        <div class="row">
          <div class="col-md-6">
            <div class="card mb-4">
              <div class="card-header">
                <h5 class="mb-0">Información Personal</h5>
              </div>
              <div class="card-body">
                <div class="mb-3">
                  <label class="form-label">Nombre completo *</label>
                  <input 
                    type="text" 
                    class="form-control" 
                    formControlName="nombre"
                    [class.is-invalid]="isInvalid('nombre')"
                    placeholder="Ej: Juan Pérez García">
                  <div class="invalid-feedback" *ngIf="isInvalid('nombre')">
                    El nombre es requerido (mínimo 3 caracteres)
                  </div>
                </div>

                <div class="mb-3">
                  <label class="form-label">Teléfono *</label>
                  <input 
                    type="tel" 
                    class="form-control" 
                    formControlName="telefono"
                    [class.is-invalid]="isInvalid('telefono')"
                    placeholder="Ej: 555-123-4567">
                  <div class="invalid-feedback" *ngIf="isInvalid('telefono')">
                    El teléfono es requerido
                  </div>
                </div>

                <div class="mb-3">
                  <label class="form-label">Email</label>
                  <input 
                    type="email" 
                    class="form-control" 
                    formControlName="email"
                    placeholder="empleado@supercopias.com">
                </div>

                <div class="mb-3">
                  <label class="form-label">Estado</label>
                  <select class="form-select" formControlName="activo">
                    <option [value]="true">Activo</option>
                    <option [value]="false">Inactivo</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div class="col-md-6">
            <div class="card mb-4">
              <div class="card-header">
                <h5 class="mb-0">Información Laboral</h5>
              </div>
              <div class="card-body">
                <div class="mb-3">
                  <label class="form-label">Puesto</label>
                  <input 
                    type="text" 
                    class="form-control" 
                    formControlName="puesto"
                    placeholder="Ej: Gerente, Cajero, Operador">
                </div>

                <div class="mb-3">
                  <label class="form-label">Departamento</label>
                  <input 
                    type="text" 
                    class="form-control" 
                    formControlName="departamento"
                    placeholder="Ej: Administración, Ventas">
                </div>

                <div class="mb-3">
                  <label class="form-label">Salario Mensual</label>
                  <div class="input-group">
                    <span class="input-group-text">$</span>
                    <input 
                      type="number" 
                      class="form-control" 
                      formControlName="salario"
                      placeholder="0.00"
                      step="0.01"
                      min="0">
                    <span class="input-group-text">MXN</span>
                  </div>
                </div>

                <div class="mb-3">
                  <label class="form-label">Fecha de Ingreso</label>
                  <input 
                    type="date" 
                    class="form-control" 
                    formControlName="fechaIngreso">
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="row">
          <div class="col-12">
            <div class="card mb-4">
              <div class="card-header">
                <h5 class="mb-0">
                  <i class="fas fa-shield-alt me-2"></i>
                  Permisos de Módulos
                </h5>
              </div>
              <div class="card-body">
                <div class="mb-4">
                  <label class="form-label">Tipo de Acceso *</label>
                  <div class="row">
                    <div class="col-md-4">
                      <div class="form-check">
                        <input 
                          class="form-check-input" 
                          type="radio" 
                          formControlName="tipoPermiso" 
                          value="operador" 
                          id="tipoOperador">
                        <label class="form-check-label" for="tipoOperador">
                          <i class="fas fa-user me-1 text-primary"></i>
                          <strong>Operador</strong>
                          <br>
                          <small class="text-muted">Acceso limitado a módulos específicos</small>
                        </label>
                      </div>
                    </div>
                    <div class="col-md-4">
                      <div class="form-check">
                        <input 
                          class="form-check-input" 
                          type="radio" 
                          formControlName="tipoPermiso" 
                          value="administrador" 
                          id="tipoAdmin">
                        <label class="form-check-label" for="tipoAdmin">
                          <i class="fas fa-crown me-1 text-warning"></i>
                          <strong>Administrador</strong>
                          <br>
                          <small class="text-muted">Acceso completo a todos los módulos</small>
                        </label>
                      </div>
                    </div>
                    <div class="col-md-4">
                      <div class="form-check">
                        <input 
                          class="form-check-input" 
                          type="radio" 
                          formControlName="tipoPermiso" 
                          value="personalizado" 
                          id="tipoPersonalizado">
                        <label class="form-check-label" for="tipoPersonalizado">
                          <i class="fas fa-cogs me-1 text-success"></i>
                          <strong>Personalizado</strong>
                          <br>
                          <small class="text-muted">Configuración manual por módulo</small>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div *ngIf="tipoPermiso && tipoPermiso !== 'administrador'">
                  <label class="form-label">Módulos Permitidos</label>
                  <div class="row">
                    <div class="col-md-6 col-lg-3 mb-3" *ngFor="let modulo of modulos">
                      <div class="card h-100" [class.border-primary]="isSelected(modulo.id)">
                        <div class="card-body p-3">
                          <div class="form-check">
                            <input 
                              class="form-check-input" 
                              type="checkbox" 
                              [id]="'mod_' + modulo.id"
                              [checked]="isSelected(modulo.id)"
                              (change)="toggle(modulo.id)">
                            <label class="form-check-label" [for]="'mod_' + modulo.id">
                              <i [class]="modulo.icono + ' me-2 text-primary'"></i>
                              <strong>{{modulo.nombre}}</strong>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="alert alert-warning" *ngIf="tipoPermiso === 'administrador'">
                  <i class="fas fa-crown me-2"></i>
                  <strong>Acceso de Administrador:</strong> Este empleado tendrá acceso completo a todos los módulos del sistema.
                </div>

                <div class="mt-3" *ngIf="seleccionados.length > 0 && tipoPermiso !== 'administrador'">
                  <label class="form-label">Módulos Seleccionados ({{seleccionados.length}}):</label>
                  <div class="d-flex flex-wrap gap-1">
                    <span class="badge bg-primary" *ngFor="let moduloId of seleccionados">
                      {{getNombre(moduloId)}}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="d-flex gap-2">
          <button 
            type="submit" 
            class="btn btn-primary"
            [disabled]="loading || !isFormValid()">
            <span *ngIf="loading">
              <i class="fas fa-spinner fa-spin me-1"></i>
              Guardando...
            </span>
            <span *ngIf="!loading">
              <i class="fas fa-save me-1"></i>
              Guardar
            </span>
          </button>
          
          <button 
            type="button" 
            class="btn btn-outline-secondary"
            (click)="cancel()"
            [disabled]="loading">
            <i class="fas fa-times me-1"></i>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  `,
  styleUrls: ['./empleados-form.component.css']
})
export class EmpleadosFormComponent implements OnInit {
  empleadoForm: FormGroup;
  loading = false;
  modulos = MODULOS;
  tipoPermiso = '';
  seleccionados: string[] = [];

  constructor(
    private fb: FormBuilder,
    private empleadosService: EmpleadosService,
    private router: Router
  ) {
    this.empleadoForm = this.createForm();
  }

  ngOnInit() {
    this.empleadoForm.get('tipoPermiso')?.valueChanges.subscribe(tipo => {
      this.tipoPermiso = tipo;
      if (tipo === 'administrador') {
        this.seleccionados = this.modulos.map(m => m.id);
      } else {
        this.seleccionados = [];
      }
    });
  }

  private createForm(): FormGroup {
    return this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      telefono: ['', Validators.required],
      email: [''],
      puesto: [''],
      departamento: [''],
      salario: [0],
      fechaIngreso: [''],
      activo: [true],
      tipoPermiso: ['', Validators.required]
    });
  }

  isInvalid(field: string): boolean {
    const control = this.empleadoForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  isSelected(moduloId: string): boolean {
    return this.seleccionados.includes(moduloId);
  }

  toggle(moduloId: string) {
    if (this.isSelected(moduloId)) {
      this.seleccionados = this.seleccionados.filter(id => id !== moduloId);
    } else {
      this.seleccionados = [...this.seleccionados, moduloId];
    }
  }

  getNombre(moduloId: string): string {
    const modulo = this.modulos.find(m => m.id === moduloId);
    return modulo ? modulo.nombre : moduloId;
  }

  isFormValid(): boolean {
    if (this.empleadoForm.invalid) return false;
    if (!this.tipoPermiso) return false;
    if ((this.tipoPermiso === 'operador' || this.tipoPermiso === 'personalizado') && this.seleccionados.length === 0) {
      return false;
    }
    return true;
  }

  onSubmit() {
    if (!this.isFormValid()) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    this.loading = true;
    
    const datos = {
      ...this.empleadoForm.value,
      tipoPermiso: this.tipoPermiso,
      modulosPermitidos: this.tipoPermiso === 'administrador' 
        ? this.modulos.map(m => m.id) 
        : this.seleccionados
    };

    console.log('Datos a enviar:', datos);

    this.empleadosService.create(datos).subscribe({
      next: () => {
        this.loading = false;
        alert('Empleado creado exitosamente');
        this.router.navigate(['/admin/empleados']);
      },
      error: (error) => {
        console.error('Error:', error);
        this.loading = false;
        alert('Error al crear el empleado');
      }
    });
  }

  cancel() {
    this.router.navigate(['/admin/empleados']);
  }
}
