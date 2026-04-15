import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EmpleadosService } from '../../services/empleados.service';
import { CatalogosService, Sucursal, Puesto } from '../../services/catalogos.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-empleados-form',
  template: `
    <div class="container-fluid p-4">
      <h3 class="mb-4">
        <i class="fas fa-user-tie me-2"></i>
        {{isEditing ? 'Editar Empleado' : 'Nuevo Empleado'}}
        <small class="text-muted ms-2" *ngIf="isEditing && empleadoActual">
          ({{empleadoActual.nombre}} - {{empleadoActual.id}})
        </small>
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
                    <span *ngIf="empleadoForm.get('nombre')?.errors?.['required']">El nombre es requerido</span>
                    <span *ngIf="empleadoForm.get('nombre')?.errors?.['minlength']">El nombre debe tener al menos 3 caracteres</span>
                    <span *ngIf="empleadoForm.get('nombre')?.errors?.['maxlength']">El nombre no puede exceder 100 caracteres</span>
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
                    <span *ngIf="empleadoForm.get('telefono')?.errors?.['required']">El teléfono es requerido</span>
                    <span *ngIf="empleadoForm.get('telefono')?.errors?.['pattern']">Formato de teléfono inválido</span>
                  </div>
                </div>

                <div class="mb-3">
                  <label class="form-label">Email</label>
                  <input 
                    type="email" 
                    class="form-control" 
                    formControlName="email"
                    [class.is-invalid]="isInvalid('email')"
                    placeholder="empleado@supercopias.com">
                  <div class="invalid-feedback" *ngIf="isInvalid('email')">
                    <span *ngIf="empleadoForm.get('email')?.errors?.['email']">Formato de email inválido</span>
                  </div>
                </div>

                <div class="mb-3">
                  <label class="form-label">Estado</label>
                  <select class="form-select" formControlName="activo" (change)="onEstadoChange($event)">
                    <option value="true">Activo</option>
                    <option value="false">Inactivo</option>
                  </select>
                </div>

                <!-- Campo Fecha de Baja - Solo visible cuando estado es Inactivo -->
                <div class="mb-3" *ngIf="empleadoForm.get('activo')?.value === false">
                  <label class="form-label">Fecha de Baja *</label>
                  <input 
                    type="date" 
                    class="form-control" 
                    formControlName="fechaBaja"
                    [class.is-invalid]="isInvalid('fechaBaja')">
                  <div class="invalid-feedback" *ngIf="isInvalid('fechaBaja')">
                    La fecha de baja es requerida cuando el empleado está inactivo
                  </div>
                  <small class="form-text text-muted">
                    Fecha en que el empleado causó baja de la empresa
                  </small>
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
                  <label class="form-label">Puesto *</label>
                  <select 
                    class="form-select" 
                    formControlName="puesto"
                    [class.is-invalid]="isInvalid('puesto')">
                    <option value="">Seleccione un puesto</option>
                    <option *ngFor="let puesto of puestos" [value]="puesto.id">
                      {{puesto.nombre}}
                    </option>
                  </select>
                  <div class="invalid-feedback" *ngIf="isInvalid('puesto')">
                    Debe seleccionar un puesto
                  </div>
                </div>

                <div class="mb-3">
                  <label class="form-label">Sucursal *</label>
                  <select 
                    class="form-select" 
                    formControlName="sucursal"
                    [class.is-invalid]="isInvalid('sucursal')">
                    <option value="">Seleccione una sucursal</option>
                    <option *ngFor="let sucursal of sucursales" [value]="sucursal.id">
                      {{sucursal.nombre}}
                    </option>
                  </select>
                  <div class="invalid-feedback" *ngIf="isInvalid('sucursal')">
                    Debe seleccionar una sucursal
                  </div>
                </div>

                <div class="mb-3">
                  <label class="form-label">Turno *</label>
                  <select 
                    class="form-select" 
                    formControlName="turno"
                    [class.is-invalid]="isInvalid('turno')">
                    <option value="">Seleccione un turno</option>
                    <option value="Matutino">Matutino</option>
                    <option value="Vespertino">Vespertino</option>
                  </select>
                  <div class="invalid-feedback" *ngIf="isInvalid('turno')">
                    Debe seleccionar un turno
                  </div>
                </div>

                <div class="mb-3">
                  <label class="form-label">Salario Mensual *</label>
                  <div class="input-group">
                    <span class="input-group-text">$</span>
                    <input 
                      type="number" 
                      class="form-control" 
                      formControlName="salario"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      [class.is-invalid]="isInvalid('salario')">
                    <span class="input-group-text">MXN</span>
                  </div>
                  <div class="invalid-feedback" *ngIf="isInvalid('salario')">
                    El salario es requerido y debe ser mayor a 0
                  </div>
                </div>

                <div class="mb-3">
                  <label class="form-label">Fecha de Ingreso *</label>
                  <input 
                    type="date" 
                    class="form-control" 
                    formControlName="fechaIngreso"
                    [class.is-invalid]="isInvalid('fechaIngreso')">
                  <div class="invalid-feedback" *ngIf="isInvalid('fechaIngreso')">
                    La fecha de ingreso es requerida
                  </div>
                </div>

                <div class="mb-3">
                  <label class="form-label">
                    Días de Vacaciones Sugeridos
                    <i class="fas fa-info-circle text-muted ms-1" 
                       title="Días de vacaciones anuales sugeridos. El sistema permite flexibilidad en el registro."></i>
                  </label>
                  <input 
                    type="number" 
                    class="form-control" 
                    formControlName="diasVacacionesSugeridos"
                    placeholder="12"
                    min="0"
                    max="99">
                  <small class="form-text text-muted">
                    Solo como referencia. El sistema permite registrar más días si es necesario.
                  </small>
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
                          value="sin_permisos" 
                          id="tipoSinPermisos">
                        <label class="form-check-label" for="tipoSinPermisos">
                          <i class="fas fa-times-circle me-1 text-secondary"></i>
                          <strong>Sin Permisos</strong>
                          <br>
                          <small class="text-muted">Sin acceso a ningún módulo del sistema</small>
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

                <div *ngIf="tipoPermiso === 'personalizado'">
                  <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    <strong>Asignación de Módulos:</strong> Seleccione los módulos a los que este empleado tendrá acceso. 
                    Esta configuración es independiente del puesto asignado - el administrador decide los permisos.
                  </div>
                  
                  <label class="form-label">Módulos Permitidos</label>
                  <div class="row">
                    <div class="col-md-6 col-lg-3 mb-3" *ngFor="let modulo of modulos">
                      <div class="card h-100" [class.border-primary]="isSelected(modulo.clave)">
                        <div class="card-body p-3">
                          <div class="form-check">
                            <input 
                              class="form-check-input" 
                              type="checkbox" 
                              [id]="'mod_' + modulo.clave"
                              [checked]="isSelected(modulo.clave)"
                              (change)="toggle(modulo.clave)">
                            <label class="form-check-label" [for]="'mod_' + modulo.clave">
                              <i [class]="modulo.icono + ' me-2 text-primary'"></i>
                              <strong>{{modulo.nombre}}</strong>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Mensaje para Sin Permisos -->
                <div *ngIf="tipoPermiso === 'sin_permisos'" class="mt-3">
                  <div class="alert alert-secondary">
                    <i class="fas fa-info-circle me-2"></i>
                    <strong>Sin Permisos:</strong> Este empleado no tendrá acceso a ningún módulo del sistema. No se creará usuario de acceso.
                  </div>
                </div>

                <!-- Mensaje para Administrador -->
                <div *ngIf="tipoPermiso === 'administrador'" class="mt-3">
                  <div class="alert alert-warning border-warning">
                    <i class="fas fa-crown me-2"></i>
                    <strong>👑 Acceso de Administrador:</strong> Este empleado tendrá acceso completo a todos los módulos del sistema con permisos de administrador. Podrá gestionar empleados, clientes, proveedores, inventarios, equipos y reportes.
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
            [disabled]="!empleadoForm.valid || loading">
            <span *ngIf="loading">
              <i class="fas fa-spinner fa-spin me-1"></i>
              {{isEditing ? 'Actualizando...' : 'Guardando...'}}
            </span>
            <span *ngIf="!loading">
              <i class="fas fa-save me-1"></i>
              {{isEditing ? 'Actualizar' : 'Guardar'}}
            </span>
          </button>

          <!-- Botón de contraseña temporal — solo en edición con usuario asociado -->
          <button
            *ngIf="isEditing && tipoPermiso !== 'sin_permisos'"
            type="button"
            class="btn btn-outline-warning"
            (click)="abrirModalPassword()">
            <i class="fas fa-key me-1"></i>
            Contraseña temporal
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
      
      <!-- ===================================================== -->
      <!-- MODAL: Asignar contraseña temporal                     -->
      <!-- ===================================================== -->
      <div class="modal-backdrop-custom" *ngIf="mostrarModalPassword" (click)="cerrarModalPassword()"></div>
      <div class="modal-custom" *ngIf="mostrarModalPassword" role="dialog" aria-modal="true">
        <div class="modal-custom-dialog" (click)="$event.stopPropagation()">
          <div class="modal-custom-header">
            <h5 class="modal-custom-title">
              <i class="fas fa-key me-2 text-warning"></i>
              Asignar Contraseña Temporal
            </h5>
            <button type="button" class="btn-close" (click)="cerrarModalPassword()"></button>
          </div>
          <div class="modal-custom-body">
            <div class="alert alert-info">
              <i class="fas fa-info-circle me-2"></i>
              Asigna una contraseña temporal al empleado
              <strong *ngIf="empleadoActual">{{empleadoActual.nombre}}</strong>.
              Al iniciar sesión, el sistema le solicitará cambiarla obligatoriamente.
            </div>
            <div class="mb-3">
              <label class="form-label">Nueva contraseña temporal *</label>
              <input
                type="password"
                class="form-control"
                [(ngModel)]="resetPwd"
                [ngModelOptions]="{ standalone: true }"
                placeholder="Mínimo 8 caracteres"
                autocomplete="new-password">
            </div>
            <div class="mb-3">
              <label class="form-label">Confirmar contraseña *</label>
              <input
                type="password"
                class="form-control"
                [class.is-invalid]="resetPwd && resetPwdConfirm && resetPwd !== resetPwdConfirm"
                [(ngModel)]="resetPwdConfirm"
                [ngModelOptions]="{ standalone: true }"
                placeholder="Repite la contraseña"
                autocomplete="new-password">
              <div class="invalid-feedback">Las contraseñas no coinciden</div>
            </div>
          </div>
          <div class="modal-custom-footer">
            <button
              type="button"
              class="btn btn-outline-secondary"
              (click)="cerrarModalPassword()"
              [disabled]="loadingReset">
              Cancelar
            </button>
            <button
              type="button"
              class="btn btn-warning"
              (click)="onResetPassword()"
              [disabled]="loadingReset || !resetPwd || resetPwd.length < 8 || resetPwd !== resetPwdConfirm">
              <span *ngIf="loadingReset">
                <i class="fas fa-spinner fa-spin me-1"></i>Guardando...
              </span>
              <span *ngIf="!loadingReset">
                <i class="fas fa-key me-1"></i>Asignar contraseña
              </span>
            </button>
          </div>
        </div>
      </div>

      <!-- Modal de credenciales -->
      <app-credenciales-modal
        [visible]="mostrarModalCredenciales"
        [empleadoNombre]="credencialesGeneradas.empleadoNombre"
        [empleadoEmail]="credencialesGeneradas.empleadoEmail"
        [username]="credencialesGeneradas.username"
        [password]="credencialesGeneradas.password"
        [tipoPermiso]="credencialesGeneradas.tipoPermiso"
        (cerrarModal)="onCerrarModalCredenciales()">
      </app-credenciales-modal>
    </div>
  `,
  styleUrls: ['./empleados-form.component.css']
})
export class EmpleadosFormComponent implements OnInit {
  empleadoForm: FormGroup;
  loading = false;
  modulos: any[] = [];
  tipoPermiso = 'sin_permisos'; // Valor inicial por defecto
  seleccionados: string[] = [];
  seleccionadosPersonalizados: string[] = []; // Mantiene los módulos seleccionados para personalizado
  sucursales: Sucursal[] = [];
  puestos: Puesto[] = [];
  
  // Modal de credenciales
  mostrarModalCredenciales = false;
  credencialesGeneradas = {
    empleadoNombre: '',
    empleadoEmail: '',
    username: '',
    password: '',
    tipoPermiso: ''
  };
  
  // Variables para edición
  isEditing = false;
  empleadoId: number | null = null;
  empleadoActual: any = null;

  // Seguridad de cuenta — reset de contraseña temporal
  resetPwd = '';
  resetPwdConfirm = '';
  loadingReset = false;
  mostrarModalPassword = false;

  abrirModalPassword() {
    this.resetPwd = '';
    this.resetPwdConfirm = '';
    this.mostrarModalPassword = true;
  }

  cerrarModalPassword() {
    if (this.loadingReset) return;
    this.resetPwd = '';
    this.resetPwdConfirm = '';
    this.mostrarModalPassword = false;
  }

  constructor(
    private fb: FormBuilder,
    private empleadosService: EmpleadosService,
    private catalogosService: CatalogosService,
    private router: Router,
    private route: ActivatedRoute,
    private notificationService: NotificationService
  ) {
    this.empleadoForm = this.createForm();
  }

  ngOnInit() {
    // Primero cargar catálogos
    this.loadCatalogos();
    
    // Detectar si estamos en modo edición
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditing = true;
        this.empleadoId = +params['id'];
        // Esperar a que los catálogos estén cargados antes de cargar el empleado
        this.waitForModulos().then(() => {
          this.loadEmpleado(this.empleadoId);
        });
      }
    });
    
    this.empleadoForm.get('tipoPermiso')?.valueChanges.subscribe(tipo => {
      // Si el tipo ANTERIOR era personalizado, guardamos las selecciones antes del cambio
      if (this.tipoPermiso === 'personalizado') {
        this.seleccionadosPersonalizados = [...this.seleccionados];
      }
      
      // Ahora cambiamos el tipo
      this.tipoPermiso = tipo;
      
      if (tipo === 'administrador') {
        this.seleccionados = this.modulos.map(m => m.clave);
      } else if (tipo === 'sin_permisos') {
        this.seleccionados = []; // Sin módulos
      } else if (tipo === 'personalizado') {
        // Restaurar las selecciones previas de personalizado
        this.seleccionados = [...this.seleccionadosPersonalizados];
      }
    });

    // Valor inicial para depuración removido
  }

  /**
   * Esperar a que los módulos estén cargados
   */
  private waitForModulos(): Promise<void> {
    return new Promise((resolve) => {
      // Si ya están cargados, resolver inmediatamente
      if (this.modulos && this.modulos.length > 0) {
        resolve();
        return;
      }
      
      // Esperar hasta que estén cargados (revisar cada 50ms, máximo 3 segundos)
      let attempts = 0;
      const maxAttempts = 60; // 60 * 50ms = 3 segundos
      
      const checkInterval = setInterval(() => {
        attempts++;
        if (this.modulos && this.modulos.length > 0) {
          clearInterval(checkInterval);
          resolve();
        } else if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 50);
    });
  }

  private loadCatalogos() {
    // Limpiar caché para asegurar datos frescos
    this.catalogosService.clearCache();
    
    // Cargar módulos del sistema (sin caché)
    // getModulos retorna Modulo[] directamente, no ApiResponse
    this.catalogosService.getModulos(false).subscribe({
      next: (modulos) => {
        console.log('Módulos cargados:', modulos);
        this.modulos = modulos.filter(m => m.activo);
      },
      error: (error) => {
        console.error('Error cargando módulos:', error);
        this.modulos = [];
      }
    });

    // Cargar sucursales - retorna ApiResponse<Sucursal[]>
    this.catalogosService.getSucursales().subscribe({
      next: (response) => {
        console.log('Sucursales cargadas:', response);
        if (response && response.success && Array.isArray(response.data)) {
          this.sucursales = response.data.filter(s => s.activa);
        } else {
          this.sucursales = [];
        }
      },
      error: (error) => {
        console.error('Error cargando sucursales:', error);
        this.sucursales = [];
      }
    });

    // Cargar puestos - retorna ApiResponse<Puesto[]>
    this.catalogosService.getPuestos().subscribe({
      next: (response) => {
        console.log('Puestos cargados:', response);
        if (response && response.success && Array.isArray(response.data)) {
          this.puestos = response.data.filter(p => p.activo);
        } else {
          this.puestos = [];
        }
      },
      error: (error) => {
        console.error('Error cargando puestos:', error);
        this.puestos = [];
      }
    });
  }

  /**
   * Cargar datos de empleado para edición
   */
  private loadEmpleado(id: number) {
    this.loading = true;
    this.empleadosService.getEmpleado(id).subscribe({
      next: (response) => {
        if (response && response.success && response.data) {
          this.empleadoActual = response.data;
          this.populateForm(this.empleadoActual);
        } else {
          this.router.navigate(['/admin/empleados']);
        }
        this.loading = false;
      },
      error: (error) => {
        this.router.navigate(['/admin/empleados']);
        this.loading = false;
      }
    });
  }

  /**
   * Llenar el formulario con datos del empleado
   */
  private populateForm(empleado: any) {
    this.empleadoForm.patchValue({
      nombre: empleado.nombre,
      telefono: empleado.telefono,
      email: empleado.email,
      puesto: empleado.puesto,
      sucursal: empleado.sucursal,
      turno: empleado.turno || 'Matutino',
      salario: empleado.salario,
      fechaIngreso: empleado.fechaIngreso,
      activo: empleado.activo,
      fechaBaja: empleado.fechaBaja || '',
      tipoPermiso: empleado.tipoPermiso || 'sin_permisos'
    });

    // Configurar módulos seleccionados y tipo de permiso
    this.tipoPermiso = empleado.tipoPermiso || 'sin_permisos';
    
    if (empleado.modulosPermitidos && Array.isArray(empleado.modulosPermitidos)) {
      // Asegurarse de que todos los elementos sean strings
      this.seleccionados = empleado.modulosPermitidos.map((m: any) => String(m));
      
      // Si el tipo es personalizado, también inicializar la copia
      if (this.tipoPermiso === 'personalizado') {
        this.seleccionadosPersonalizados = [...this.seleccionados];
      }
    } else {
      this.seleccionados = [];
      this.seleccionadosPersonalizados = [];
    }
  }

  private createForm(): FormGroup {
    return this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      telefono: ['', [Validators.required, Validators.pattern(/^[\d\s\-\(\)\+]+$/)]],
      email: ['', [Validators.email]],
      puesto: ['', Validators.required],
      sucursal: ['', Validators.required],
      turno: ['Matutino', Validators.required],
      salario: [0, [Validators.required, Validators.min(1)]],
      fechaIngreso: [this.getCurrentDate(), Validators.required],
      diasVacacionesSugeridos: [12, [Validators.min(0), Validators.max(99)]],
      activo: [true],
      fechaBaja: [''], // Se validará dinámicamente cuando activo sea false
      tipoPermiso: ['sin_permisos', Validators.required] // Valor por defecto
    });
  }

  onTipoPermisoChange(tipo: string) {
    this.tipoPermiso = tipo;
    
    // Si selecciona "Sin Permisos", limpiar módulos seleccionados
    if (tipo === 'sin_permisos') {
      this.seleccionados = [];
    }
    
    // Si selecciona "Administrador", seleccionar todos los módulos automáticamente
    if (tipo === 'admin') {
      this.seleccionados = this.modulos.map(m => m.clave);
    }
  }

  onEstadoChange(event: any) {
    const value = event.target.value;
    const booleanValue = value === 'true';
    
    // Actualizar el FormControl con valor boolean
    this.empleadoForm.get('activo')?.setValue(booleanValue, { emitEvent: false });
    
    // Manejar validación de fechaBaja
    const fechaBajaControl = this.empleadoForm.get('fechaBaja');
    if (!booleanValue) { // Si está inactivo
      fechaBajaControl?.setValidators([Validators.required]);
    } else { // Si está activo
      fechaBajaControl?.clearValidators();
      fechaBajaControl?.setValue('');
    }
    fechaBajaControl?.updateValueAndValidity();
  }

  getCurrentDate(): string {
    return new Date().toISOString().split('T')[0];
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
    
    // Si estamos en modo personalizado, actualizar también la copia
    if (this.tipoPermiso === 'personalizado') {
      this.seleccionadosPersonalizados = [...this.seleccionados];
    }
  }

  getNombre(moduloClave: string): string {
    const modulo = this.modulos.find(m => m.clave === moduloClave);
    return modulo ? modulo.nombre : moduloClave;
  }

  isFormValid(): boolean {
    if (this.empleadoForm.invalid) return false;
    if (!this.tipoPermiso) return false;
    if (this.tipoPermiso === 'personalizado' && this.seleccionados.length === 0) {
      return false;
    }
    return true;
  }

  onSubmit() {
    if (!this.isFormValid()) {
      this.notificationService.warning(
        'Por favor completa todos los campos requeridos correctamente',
        'Formulario incompleto'
      );
      return;
    }

    this.loading = true;
    
    const datos = {
      ...this.empleadoForm.value,
      tipoPermiso: this.tipoPermiso,
      modulosPermitidos: this.tipoPermiso === 'administrador' 
        ? this.modulos.map(m => m.clave) 
        : this.seleccionados
    };
    
    if (this.isEditing && this.empleadoId) {
      this.updateEmpleado(datos);
    } else {
      this.createEmpleado(datos);
    }
  }

  private createEmpleado(datos: any) {
    
    this.empleadosService.create(datos).subscribe({
      next: (response: any) => {
        this.loading = false;
        
        
        // Verificar si se crearon credenciales de usuario
        if (response.data?.usuario) {
          const usuario = response.data.usuario;
          const empleado = response.data.empleado;
          
          
          // Configurar datos para el modal de credenciales
          this.credencialesGeneradas = {
            empleadoNombre: empleado.nombre,
            empleadoEmail: empleado.email,
            username: usuario.username,
            password: usuario.password,
            tipoPermiso: usuario.tipoPermiso
          };
          
          
          // Mostrar modal con las credenciales
          this.mostrarModalCredenciales = true;
        } else {
          // Si no se crearon credenciales, mostrar mensaje normal y redirigir
          this.notificationService.success(
            'El empleado ha sido creado exitosamente',
            'Empleado creado'
          );
          this.router.navigate(['/admin/empleados']);
        }
      },
      error: (error) => {
        this.loading = false;
        
        // Manejo de errores más específico
        if (error.status === 400 && error.error?.error?.message) {
          this.notificationService.error(
            error.error.error.message,
            'Error de validación'
          );
        } else if (error.status === 409) {
          this.notificationService.error(
            'Ya existe un empleado con ese email o número de empleado',
            'Empleado duplicado'
          );
        } else if (error.status === 500) {
          this.notificationService.error(
            'Error interno del servidor. Por favor intente nuevamente',
            'Error del servidor'
          );
        } else {
          this.notificationService.error(
            'Por favor verifique los datos e intente nuevamente',
            'Error al crear empleado'
          );
        }
      }
    });
  }

  private updateEmpleado(datos: any) {
    this.empleadosService.update(this.empleadoId!, datos).subscribe({
      next: (response) => {
        this.loading = false;
        
        // Verificar si se devolvieron credenciales de usuario
        const responseData = response as any;
        if (responseData && responseData.data && responseData.data.usuario) {
          // Se creó un usuario nuevo durante la actualización
          const empleado = responseData.data.empleado;
          const usuario = responseData.data.usuario;
          
          this.credencialesGeneradas = {
            empleadoNombre: empleado.nombre,
            empleadoEmail: empleado.email,
            username: usuario.username,
            password: usuario.password,
            tipoPermiso: empleado.tipoPermiso
          };
          
          // Mostrar modal con las credenciales
          this.mostrarModalCredenciales = true;
        } else {
          // Si no se crearon credenciales, mostrar mensaje normal y redirigir
          this.notificationService.success(
            'El empleado ha sido actualizado exitosamente',
            'Empleado actualizado'
          );
          this.router.navigate(['/admin/empleados']);
        }
      },
      error: (error) => {
        this.loading = false;
        this.notificationService.error(
          error.error?.message || 'Error al actualizar el empleado',
          'Error al actualizar'
        );
      }
    });
  }

  onResetPassword() {
    if (!this.empleadoId || !this.resetPwd || this.resetPwd !== this.resetPwdConfirm) return;

    this.loadingReset = true;
    this.empleadosService.resetPassword(this.empleadoId, this.resetPwd).subscribe({
      next: () => {
        this.loadingReset = false;
        this.mostrarModalPassword = false;
        this.resetPwd = '';
        this.resetPwdConfirm = '';
        this.notificationService.success(
          'Contraseña temporal asignada. El empleado deberá cambiarla en su próximo acceso.',
          'Contraseña actualizada'
        );
      },
      error: (error: any) => {
        this.loadingReset = false;
        this.notificationService.error(
          error?.error?.message || 'Error al asignar la contraseña temporal',
          'Error'
        );
      }
    });
  }

  cancel() {
    this.router.navigate(['/admin/empleados']);
  }

  onCerrarModalCredenciales() {
    this.mostrarModalCredenciales = false;
    // Redirigir a la lista de empleados después de cerrar el modal
    this.router.navigate(['/admin/empleados']);
  }

}
