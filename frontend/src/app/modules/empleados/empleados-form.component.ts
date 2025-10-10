/**
 * Componente de Formulario de Empleados
 * Permite crear y editar empleados del sistema SuperCopias
 * Incluye validaciones y gestión de puestos
 */

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EmpleadosService } from '../../services/empleados.service';

@Component({
  selector: 'app-empleados-form',
  template: `
    <div class="p-4">
      <h3 class="mb-4">
        <i class="fas fa-user-tie me-2"></i>
        {{isEdit ? 'Editar Empleado' : 'Nuevo Empleado'}}
      </h3>
      
      <form [formGroup]="empleadoForm" (ngSubmit)="save()">
        <div class="row">
          <!-- Información Personal -->
          <div class="col-md-6">
            <div class="card mb-3">
              <div class="card-header">
                <h6 class="mb-0">
                  <i class="fas fa-user me-1"></i>
                  Información Personal
                </h6>
              </div>
              <div class="card-body">
                <div class="mb-3">
                  <label class="form-label">Nombre completo *</label>
                  <input 
                    type="text" 
                    class="form-control" 
                    formControlName="nombre"
                    [class.is-invalid]="isFieldInvalid('nombre')"
                    placeholder="Ej: Juan Pérez García" />
                  <div class="invalid-feedback" *ngIf="isFieldInvalid('nombre')">
                    El nombre es requerido (mínimo 3 caracteres)
                  </div>
                </div>

                <div class="mb-3">
                  <label class="form-label">Teléfono *</label>
                  <input 
                    type="tel" 
                    class="form-control" 
                    formControlName="telefono"
                    [class.is-invalid]="isFieldInvalid('telefono')"
                    placeholder="Ej: 555-123-4567" />
                  <div class="invalid-feedback" *ngIf="isFieldInvalid('telefono')">
                    El teléfono es requerido
                  </div>
                </div>

                <div class="mb-3">
                  <label class="form-label">Email</label>
                  <input 
                    type="email" 
                    class="form-control" 
                    formControlName="email"
                    [class.is-invalid]="isFieldInvalid('email')"
                    placeholder="empleado@supercopias.com" />
                  <div class="invalid-feedback" *ngIf="isFieldInvalid('email')">
                    Ingrese un email válido
                  </div>
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

          <!-- Información Laboral -->
          <div class="col-md-6">
            <div class="card mb-3">
              <div class="card-header">
                <h6 class="mb-0">
                  <i class="fas fa-briefcase me-1"></i>
                  Información Laboral
                </h6>
              </div>
              <div class="card-body">
                <div class="mb-3">
                  <label class="form-label">Puesto</label>
                  <select class="form-select" formControlName="puesto">
                    <option value="">Seleccione un puesto...</option>
                    <option *ngFor="let puesto of puestos" [value]="puesto.id">
                      {{puesto.nombre}}
                    </option>
                  </select>
                </div>

                <div class="mb-3">
                  <label class="form-label">Departamento</label>
                  <input 
                    type="text" 
                    class="form-control" 
                    formControlName="departamento"
                    placeholder="Ej: Administración, Ventas, Producción" />
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
                      min="0" />
                    <span class="input-group-text">MXN</span>
                  </div>
                </div>

                <div class="mb-3">
                  <label class="form-label">Fecha de Ingreso</label>
                  <input 
                    type="date" 
                    class="form-control" 
                    formControlName="fechaIngreso" />
                </div>

                <div class="mb-3" *ngIf="isEdit">
                  <label class="form-label">Rol del Sistema</label>
                  <select class="form-select" formControlName="role">
                    <option value="">Sin rol asignado</option>
                    <option value="admin">Administrador</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="operador">Operador</option>
                    <option value="cajero">Cajero</option>
                  </select>
                  <small class="form-text text-muted">
                    El rol determina los permisos del empleado en el sistema
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Botones de acción -->
        <div class="d-flex gap-2 mt-4">
          <button 
            type="submit" 
            class="btn btn-primary"
            [disabled]="loading || empleadoForm.invalid">
            <span *ngIf="loading">
              <i class="fas fa-spinner fa-spin me-1"></i>
              Guardando...
            </span>
            <span *ngIf="!loading">
              <i class="fas fa-save me-1"></i>
              {{isEdit ? 'Actualizar' : 'Guardar'}}
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

          <button 
            type="button" 
            class="btn btn-outline-info"
            *ngIf="isEdit && empleadoForm.value.id"
            (click)="verDetalles()"
            [disabled]="loading">
            <i class="fas fa-eye me-1"></i>
            Ver Detalles
          </button>
        </div>
      </form>

      <!-- Información adicional para empleado existente -->
      <div class="card mt-4" *ngIf="isEdit && empleadoForm.value.fechaRegistro">
        <div class="card-header">
          <h6 class="mb-0">
            <i class="fas fa-info-circle me-1"></i>
            Información del Sistema
          </h6>
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-md-6">
              <strong>Fecha de Registro:</strong>
              <div>{{empleadoForm.value.fechaRegistro | date:'dd/MM/yyyy HH:mm'}}</div>
            </div>
            <div class="col-md-6">
              <strong>Última Modificación:</strong>
              <div>{{empleadoForm.value.fechaModificacion | date:'dd/MM/yyyy HH:mm' || 'No modificado'}}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class EmpleadosFormComponent implements OnInit {
  empleadoForm: FormGroup;
  isEdit = false;
  empleadoId: string | null = null;
  loading = false;
  puestos: any[] = [];

  constructor(
    private fb: FormBuilder,
    private empleadosService: EmpleadosService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.empleadoForm = this.createForm();
  }

  ngOnInit() {
    // Cargar catálogo de puestos
    this.loadPuestos();
    
    // Verificar si es edición
    this.empleadoId = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!this.empleadoId;
    
    if (this.isEdit && this.empleadoId) {
      this.loadEmpleado(this.empleadoId);
    }
  }

  private createForm(): FormGroup {
    return this.fb.group({
      id: [''],
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      telefono: ['', Validators.required],
      email: ['', [Validators.email]],
      puesto: [''],
      departamento: [''],
      salario: [0, [Validators.min(0)]],
      fechaIngreso: [''],
      activo: [true],
      role: [''],
      fechaRegistro: [''],
      fechaModificacion: ['']
    });
  }

  private loadPuestos() {
    this.empleadosService.getPuestos().subscribe({
      next: (response) => {
        this.puestos = response.data;
      },
      error: (error) => {
        console.error('Error loading puestos:', error);
      }
    });
  }

  private loadEmpleado(id: string) {
    this.loading = true;
    this.empleadosService.getById(id).subscribe({
      next: (empleado) => {
        if (empleado) {
          this.empleadoForm.patchValue(empleado);
        } else {
          console.error('Empleado no encontrado');
          this.router.navigate(['/admin/empleados']);
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading empleado:', error);
        this.loading = false;
        this.router.navigate(['/admin/empleados']);
      }
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.empleadoForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  save() {
    if (this.empleadoForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.loading = true;
    const empleadoData = this.empleadoForm.value;

    if (this.isEdit) {
      // Actualizar empleado existente
      this.empleadosService.update(this.empleadoId!, empleadoData).subscribe({
        next: (result) => {
          console.log('Empleado actualizado:', result);
          this.loading = false;
          this.router.navigate(['/admin/empleados']);
        },
        error: (error) => {
          console.error('Error updating empleado:', error);
          this.loading = false;
          alert('Error al actualizar el empleado');
        }
      });
    } else {
      // Crear nuevo empleado
      this.empleadosService.create(empleadoData).subscribe({
        next: (result) => {
          console.log('Empleado creado:', result);
          this.loading = false;
          this.router.navigate(['/admin/empleados']);
        },
        error: (error) => {
          console.error('Error creating empleado:', error);
          this.loading = false;
          alert('Error al crear el empleado');
        }
      });
    }
  }

  cancel() {
    this.router.navigate(['/admin/empleados']);
  }

  verDetalles() {
    // Implementar vista de detalles o navegar a lista
    this.router.navigate(['/admin/empleados']);
  }

  private markFormGroupTouched() {
    Object.keys(this.empleadoForm.controls).forEach(key => {
      const control = this.empleadoForm.get(key);
      if (control) {
        control.markAsTouched();
      }
    });
  }
}