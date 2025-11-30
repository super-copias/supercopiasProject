/**
 * Componente de Formulario de Proveedores
 * Permite crear y editar proveedores del sistema SuperCopias
 */

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ProveedoresService } from '../../services/proveedores.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-proveedores-form',
  template: `
  <div class="p-4">
    <h3>{{isEdit ? 'Editar Proveedor' : 'Nuevo Proveedor'}}</h3>
    
    <!-- Indicador de carga -->
    <div class="alert alert-info" *ngIf="loading">
      <i class="fas fa-spinner fa-spin"></i> Cargando datos del proveedor...
    </div>
    
    <form (ngSubmit)="save()" *ngIf="!loading">
      <!-- Datos Generales -->
      <div class="card mb-3">
        <div class="card-header bg-primary text-white">
          <h5 class="mb-0"><i class="fas fa-building me-2"></i>Datos Generales</h5>
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-md-6 mb-2">
              <label>Nombre Comercial <span class="text-danger">*</span></label>
              <input class="form-control" [(ngModel)]="model.nombreComercial" name="nombreComercial" required placeholder="Nombre como se conoce al proveedor" />
            </div>
            <div class="col-md-6 mb-2">
              <label>Razón Social</label>
              <input class="form-control" [(ngModel)]="model.razonSocial" name="razonSocial" placeholder="Razón social legal" />
            </div>
          </div>
          <div class="row">
            <div class="col-md-6 mb-2">
              <label>RFC</label>
              <input class="form-control" [(ngModel)]="model.rfc" name="rfc" maxlength="13" placeholder="XAXX010101000" style="text-transform: uppercase;" />
            </div>
            <div class="col-md-6 mb-2">
              <label>Tipo de Proveedor <span class="text-danger">*</span></label>
              <select class="form-select" [(ngModel)]="model.tipoProveedor" name="tipoProveedor" required>
                <option value="">Seleccione tipo...</option>
                <option *ngFor="let tipo of tiposProveedor" [value]="tipo.value">{{tipo.label}}</option>
              </select>
            </div>
          </div>
          <div class="row">
            <div class="col-md-12 mb-2">
              <label>Estatus</label>
              <div class="form-check">
                <input class="form-check-input" type="checkbox" [(ngModel)]="model.activo" name="activo" id="activo">
                <label class="form-check-label" for="activo">
                  <span class="badge" [ngClass]="model.activo ? 'bg-success' : 'bg-secondary'">
                    {{model.activo ? 'Activo' : 'Inactivo'}}
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Datos de Contacto -->
      <div class="card mb-3">
        <div class="card-header bg-info text-white">
          <h5 class="mb-0"><i class="fas fa-address-book me-2"></i>Datos de Contacto</h5>
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-md-6 mb-2">
              <label>Nombre de Contacto</label>
              <input class="form-control" [(ngModel)]="model.nombreContacto" name="nombreContacto" placeholder="Persona de contacto principal" />
            </div>
            <div class="col-md-6 mb-2">
              <label>Teléfono</label>
              <input class="form-control" [(ngModel)]="model.telefono" name="telefono" placeholder="555-1234" />
            </div>
          </div>
          <div class="row">
            <div class="col-md-6 mb-2">
              <label>Correo Electrónico</label>
              <input class="form-control" [(ngModel)]="model.email" name="email" type="email" placeholder="contacto@proveedor.com" />
            </div>
            <div class="col-md-6 mb-2">
              <label>Página Web</label>
              <input class="form-control" [(ngModel)]="model.paginaWeb" name="paginaWeb" placeholder="www.proveedor.com" />
            </div>
          </div>
        </div>
      </div>

      <!-- Dirección -->
      <div class="card mb-3">
        <div class="card-header bg-success text-white">
          <h5 class="mb-0"><i class="fas fa-map-marked-alt me-2"></i>Dirección</h5>
        </div>
        <div class="card-body">
          <div class="mb-2">
            <label>Dirección Completa</label>
            <div class="input-group">
              <input class="form-control" [(ngModel)]="model.direccion" name="direccion" placeholder="Escriba la dirección completa o seleccione en el mapa" />
              <button class="btn btn-outline-primary" type="button" (click)="toggleSelectorMapa()" title="Seleccionar en mapa">
                <i class="fas fa-map-marked-alt"></i>
              </button>
            </div>
            
            <!-- Selector de mapa expandible (sin modal) -->
            <div class="card mt-2" *ngIf="showMapSelector" style="border: 2px solid #28a745;">
              <div class="card-header bg-success text-white">
                <h6 class="mb-0">
                  <i class="fas fa-map-marked-alt me-2"></i>
                  Seleccionar Ubicación con Google Maps
                  <button type="button" class="btn-close btn-close-white float-end" (click)="cerrarSelector()"></button>
                </h6>
              </div>
              <div class="card-body">
                <div class="row">
                  <div class="col-md-6">
                    <label class="form-label">1. Buscar dirección:</label>
                    <div class="input-group mb-3">
                      <input type="text" class="form-control" [(ngModel)]="busquedaDireccion" name="busquedaDireccion" placeholder="Ej: Av. Central 123, Tuxtla Gutiérrez">
                      <button class="btn btn-success" type="button" (click)="abrirGoogleMaps()">
                        <i class="fas fa-external-link-alt me-1"></i>Abrir Maps
                      </button>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">2. Pegar dirección exacta y presionar Enter:</label>
                    <textarea class="form-control" rows="3" 
                              [(ngModel)]="direccionCopiada" 
                              name="direccionCopiada"
                              placeholder="Pegue aquí la dirección exacta de Google Maps..."
                              (keydown.enter)="aplicarDireccion()"
                              style="resize: vertical;"></textarea>
                    <small class="text-muted">Presione Enter para aplicar</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Datos de Pago -->
      <div class="card mb-3">
        <div class="card-header bg-warning text-dark">
          <h5 class="mb-0"><i class="fas fa-credit-card me-2"></i>Datos de Pago</h5>
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-md-6 mb-2">
              <label>Método de Pago Principal</label>
              <select class="form-select" [(ngModel)]="model.metodoPagoPrincipal" name="metodoPagoPrincipal">
                <option value="">Seleccione método...</option>
                <option *ngFor="let metodo of metodosPago" [value]="metodo.value">{{metodo.label}}</option>
              </select>
            </div>
            <div class="col-md-6 mb-2">
              <label>Días de Crédito</label>
              <input class="form-control" type="number" [(ngModel)]="model.diasCredito" name="diasCredito" min="0" placeholder="0" />
            </div>
          </div>
          <div class="row">
            <div class="col-md-12 mb-2">
              <label>Cuenta Bancaria / CLABE</label>
              <input class="form-control" [(ngModel)]="model.cuentaBancaria" name="cuentaBancaria" maxlength="50" placeholder="Opcional" />
            </div>
          </div>
        </div>
      </div>

      <!-- Otros -->
      <div class="card mb-3">
        <div class="card-header bg-secondary text-white">
          <h5 class="mb-0"><i class="fas fa-sticky-note me-2"></i>Notas Internas</h5>
        </div>
        <div class="card-body">
          <div class="mb-2">
            <label>Notas</label>
            <textarea class="form-control" [(ngModel)]="model.notas" name="notas" rows="3" placeholder="Información adicional relevante..."></textarea>
          </div>
        </div>
      </div>

      <!-- Botones -->
      <div class="mt-3">
        <button class="btn btn-primary" type="submit" [disabled]="loading">
          <i class="fas fa-save me-1"></i>{{isEdit ? 'Actualizar' : 'Guardar'}}
        </button>
        <button class="btn btn-secondary ms-2" type="button" (click)="cancel()">
          <i class="fas fa-times me-1"></i>Cancelar
        </button>
      </div>
    </form>
  </div>
  `,
  styles: [`
    .card-header h5 {
      font-size: 1rem;
    }
  `]
})
export class ProveedoresFormComponent implements OnInit {
  // Modelo de datos del proveedor
  model: any = {
    nombreComercial: '',
    razonSocial: '',
    rfc: '',
    tipoProveedor: 'Mixto',
    activo: true,
    nombreContacto: '',
    telefono: '',
    email: '',
    paginaWeb: '',
    direccion: '',
    metodoPagoPrincipal: '',
    cuentaBancaria: '',
    diasCredito: 0,
    notas: ''
  };
  
  isEdit = false;
  proveedorId: number | null = null;
  loading = false;
  
  // Catálogos
  tiposProveedor: any[] = [];
  metodosPago: any[] = [];
  
  // Variables para el selector de mapa (accordion expandible)
  showMapSelector = false;
  busquedaDireccion = '';
  direccionCopiada = '';

  constructor(
    private svc: ProveedoresService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private notificationService: NotificationService
  ) { }

  ngOnInit() {
    this.loadCatalogos();
    this.route.queryParams.subscribe(params => {
      if (params['id']) {
        const id = parseInt(params['id'], 10);
        if (!isNaN(id) && id > 0) {
          this.proveedorId = id;
          this.isEdit = true;
          this.loadProveedor();
        } else {
          this.notificationService.error('El ID del proveedor no es válido', 'ID inválido');
          this.router.navigate(['/admin/proveedores']);
        }
      }
    });
  }

  /**
   * Cargar catálogos desde el backend
   */
  loadCatalogos() {
    // Cargar tipos de proveedor
    this.svc.getTipos().subscribe({
      next: (tipos) => {
        if (tipos && Array.isArray(tipos)) {
          this.tiposProveedor = tipos;
        }
      },
      error: (error) => {
        console.error('Error cargando tipos de proveedor:', error);
      }
    });

    // Cargar métodos de pago
    this.svc.getMetodosPago().subscribe({
      next: (metodos) => {
        if (metodos && Array.isArray(metodos)) {
          this.metodosPago = metodos;
        }
      },
      error: (error) => {
        console.error('Error cargando métodos de pago:', error);
      }
    });
  }

  /**
   * Cargar datos del proveedor para edición
   */
  loadProveedor() {
    if (this.proveedorId) {
      this.loading = true;
      this.svc.getById(this.proveedorId).subscribe({
        next: (response) => {
          if (response && response.success && response.data) {
            const data = response.data as any;
            
            // Convertir tipo_proveedor de descripción a clave para el select
            let tipoProveedor = data.tipo_proveedor || 'MIXTO';
            if (tipoProveedor === 'Productos') tipoProveedor = 'PRODUCTOS';
            if (tipoProveedor === 'Servicios') tipoProveedor = 'SERVICIOS';
            if (tipoProveedor === 'Mixto') tipoProveedor = 'MIXTO';
            
            // Convertir metodo_pago_principal de descripción a clave
            let metodoPago = data.metodo_pago_principal || '';
            const mapeoMetodos: any = {
              'Efectivo': 'EFECTIVO',
              'Transferencia': 'TRANSFERENCIA',
              'Transferencia bancaria': 'TRANSFERENCIA',
              'Cheque': 'CHEQUE',
              'Tarjeta de crédito': 'TARJETA_CREDITO',
              'Tarjeta de débito': 'TARJETA_DEBITO',
              'Otro': 'OTRO'
            };
            if (metodoPago && mapeoMetodos[metodoPago]) {
              metodoPago = mapeoMetodos[metodoPago];
            }
            
            this.model = {
              nombreComercial: data.nombre_comercial || '',
              razonSocial: data.razon_social || '',
              rfc: data.rfc || '',
              tipoProveedor: tipoProveedor,
              activo: data.activo !== false,
              nombreContacto: data.nombre_contacto || '',
              telefono: data.telefono || '',
              email: data.email || '',
              paginaWeb: data.pagina_web || '',
              direccion: data.direccion || '',
              metodoPagoPrincipal: metodoPago,
              cuentaBancaria: data.cuenta_bancaria || '',
              diasCredito: data.dias_credito || 0,
              notas: data.notas || ''
            };
            this.cdr.detectChanges();
          } else {
            this.notificationService.error(
              response.message || 'No se encontró el proveedor',
              'Error al cargar'
            );
            this.router.navigate(['/admin/proveedores']);
          }
          this.loading = false;
        },
        error: (error) => {
          this.notificationService.error(
            error.error?.message || error.message || 'Error desconocido',
            'Error al cargar proveedor'
          );
          this.loading = false;
          this.router.navigate(['/admin/proveedores']);
        }
      });
    }
  }

  /**
   * Guardar proveedor (crear o actualizar)
   */
  save() {
    // Validaciones del lado del cliente
    if (!this.model.nombreComercial || this.model.nombreComercial.trim().length === 0) {
      this.notificationService.warning('El nombre comercial es requerido', 'Campo requerido');
      return;
    }

    if (!this.model.tipoProveedor || this.model.tipoProveedor.trim().length === 0) {
      this.notificationService.warning('El tipo de proveedor es requerido', 'Campo requerido');
      return;
    }

    // Validar formato de email solo si se proporciona
    if (this.model.email && this.model.email.trim().length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(this.model.email)) {
        this.notificationService.warning('El formato del correo electrónico es inválido', 'Formato inválido');
        return;
      }
    }

    // Validar RFC si se proporciona
    if (this.model.rfc && this.model.rfc.trim().length > 0) {
      const rfcRegex = /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/;
      if (!rfcRegex.test(this.model.rfc.toUpperCase())) {
        this.notificationService.warning('El formato del RFC es inválido. Debe tener 12 o 13 caracteres', 'Formato inválido');
        return;
      }
    }

    this.loading = true;
    const request$ = this.isEdit && this.proveedorId
      ? this.svc.update(this.proveedorId, this.model)
      : this.svc.create(this.model);
      
    request$.subscribe({
      next: (response) => {
        if (response && response.success) {
          this.notificationService.success(
            response.message || (this.isEdit ? 'Proveedor actualizado correctamente' : 'Proveedor creado correctamente'),
            this.isEdit ? 'Actualización exitosa' : 'Creación exitosa'
          );
          this.router.navigate(['/admin/proveedores']);
        } else {
          this.notificationService.error(
            response.message || 'Error al guardar el proveedor',
            'Error'
          );
        }
        this.loading = false;
      },
      error: (error) => {
        this.notificationService.error(
          error.error?.error?.message || error.message || 'Error desconocido al guardar el proveedor',
          'Error al guardar'
        );
        this.loading = false;
      }
    });
  }

  /**
   * Cancelar y volver a la lista
   */
  cancel() {
    this.router.navigate(['/admin/proveedores']);
  }

  // === MÉTODOS PARA SELECTOR DE GOOGLE MAPS ===
  
  /**
   * Mostrar/ocultar el selector de mapa (accordion expandible)
   * Inicializa campos con datos actuales del formulario
   */
  toggleSelectorMapa() {
    this.showMapSelector = !this.showMapSelector;
    if (this.showMapSelector) {
      this.busquedaDireccion = this.model.direccion || '';
      this.direccionCopiada = '';
    }
  }

  /**
   * Cerrar el selector de mapa y limpiar campos temporales
   */
  cerrarSelector() {
    this.showMapSelector = false;
    this.busquedaDireccion = '';
    this.direccionCopiada = '';
  }

  /**
   * Abrir Google Maps en nueva ventana con la dirección de búsqueda
   * Permite al usuario navegar y obtener la dirección exacta
   */
  abrirGoogleMaps() {
    const direccionBusqueda = this.busquedaDireccion?.trim() || 'México';
    const googleMapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(direccionBusqueda)}`;
    window.open(googleMapsUrl, '_blank', 'width=1200,height=800');
  }

  /**
   * Aplicar la dirección copiada de Google Maps al formulario principal
   * Se ejecuta al presionar Enter en el textarea de dirección
   */
  aplicarDireccion() {
    if (this.direccionCopiada?.trim()) {
      this.model.direccion = this.direccionCopiada.trim();
      this.showMapSelector = false;
    }
  }
}
