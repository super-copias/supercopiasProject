/**
 * Componente de Formulario de Clientes
 * Permite crear y editar clientes del sistema SuperCopias
 * Incluye funcionalidad de selección de dirección con Google Maps
 */

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ClientesService } from '../../services/clientes.service';
import { CatalogosService } from '../../services/catalogos.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-clientes-form',
  template: `
  <div class="p-4">
    <h3>{{isEdit ? 'Editar Cliente' : 'Nuevo Cliente'}}</h3>
    
    <!-- Indicador de carga -->
    <div class="alert alert-info" *ngIf="loading">
      <i class="fas fa-spinner fa-spin"></i> Cargando datos del cliente...
    </div>
    
    <form (ngSubmit)="save()" *ngIf="!loading">
      <div class="mb-2">
        <label>Nombre comercial <span class="text-danger">*</span></label>
        <input class="form-control" [(ngModel)]="model.nombreComercial" name="nombreComercial" required />
      </div>
      <div class="mb-2">
        <label>Teléfono <span class="text-danger">*</span></label>
        <input class="form-control" [(ngModel)]="model.telefono" name="telefono" required />
      </div>
      <div class="mb-2">
        <label>Segundo teléfono</label>
        <input class="form-control" [(ngModel)]="model.segundoTelefono" name="segundoTelefono" />
      </div>
      <div class="mb-2">
        <label>Correo</label>
        <input class="form-control" [(ngModel)]="model.email" name="email" type="email" placeholder="correo@ejemplo.com" />
      </div>
      <div class="mb-2">
        <label>Segundo correo</label>
        <input class="form-control" [(ngModel)]="model.segundoEmail" name="segundoEmail" type="email" placeholder="correo2@ejemplo.com" />
      </div>
      
      <!-- Campo de dirección de entrega con selector de Google Maps -->
      <div class="mb-2">
        <label>Dirección de entrega</label>
        <div class="input-group">
          <input class="form-control" [(ngModel)]="model.direccionEntrega" name="direccionEntrega" placeholder="Escriba la dirección de entrega o seleccione en el mapa" />
          <button class="btn btn-outline-primary" type="button" (click)="toggleSelectorMapa()" title="Seleccionar en mapa">
            <i class="fas fa-map-marked-alt"></i>
          </button>
        </div>
        
        <!-- Selector de mapa expandible (sin modal) -->
        <div class="card mt-2" *ngIf="showMapSelector" style="border: 2px solid #007bff;">
          <div class="card-header bg-primary text-white">
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
      
      <h5>Datos de facturación</h5>
      <div class="mb-2"><label>Razón social</label><input class="form-control" [(ngModel)]="model.razonSocial" name="razonSocial" /></div>
      <div class="mb-2"><label>RFC</label><input class="form-control" [(ngModel)]="model.rfc" name="rfc" maxlength="13" placeholder="XAXX010101000" /></div>
      <div class="mb-2">
        <label>Régimen Fiscal</label>
        <select class="form-select" [(ngModel)]="model.regimenFiscal" name="regimenFiscal" (focus)="loadRegimenesFiscales()">
          <option value="">Seleccione un régimen fiscal...</option>
          <option *ngFor="let regimen of regimenesFiscales" [value]="regimen.codigo">
            {{regimen.codigo}} - {{regimen.descripcion}}
          </option>
        </select>
      </div>
      <div class="mb-2"><label>Dirección de facturación</label><input class="form-control" [(ngModel)]="model.direccionFacturacion" name="direccionFacturacion" placeholder="Dirección para facturación" /></div>
      <div class="mb-2"><label>Código Postal</label><input class="form-control" [(ngModel)]="model.direccionCodigoPostal" name="direccionCodigoPostal" maxlength="5" placeholder="29000" /></div>
      <div class="mb-2">
        <label>Uso CFDI</label>
        <select class="form-select" [(ngModel)]="model.usoCfdi" name="usoCfdi" (focus)="loadUsosCFDI()">
          <option value="">Seleccione un uso CFDI...</option>
          <option *ngFor="let uso of usosCFDI" [value]="uso.codigo">
            {{uso.codigo}} - {{uso.descripcion}}
          </option>
        </select>
      </div>
      <div class="mt-3">
        <button class="btn btn-primary" type="submit">{{isEdit ? 'Actualizar' : 'Guardar'}}</button>
        <button class="btn btn-secondary ms-2" type="button" (click)="cancel()">Cancelar</button>
      </div>
    </form>
  </div>
  `
})
export class ClientesFormComponent implements OnInit {
  // Modelo de datos del cliente
  model: any = {
    nombreComercial: '',
    telefono: '',
    segundoTelefono: '',
    email: '',
    segundoEmail: '',
    direccionEntrega: '',
    razonSocial: '',
    rfc: '',
    regimenFiscal: '',
    direccionFacturacion: '',
    direccionCodigoPostal: '',
    usoCfdi: ''
  };
  isEdit = false;
  clienteId: number | null = null;
  loading = false;
  
  // Catálogos SAT
  usosCFDI: any[] = [];
  regimenesFiscales: any[] = [];
  regimenesCargados = false;
  usosCfdiCargados = false;
  
  // Variables para el selector de mapa (accordion expandible)
  showMapSelector = false;
  busquedaDireccion = '';
  direccionCopiada = '';

  constructor(
    private svc: ClientesService, 
    private catalogosService: CatalogosService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private notificationService: NotificationService
  ) { }

  /**
   * Inicialización del componente
   * Carga los catálogos SAT y verifica si es modo edición
   */
  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['id']) {
        const id = parseInt(params['id'], 10);
        if (!isNaN(id) && id > 0) {
          this.clienteId = id;
          this.isEdit = true;
          this.loadCliente();
        } else {
          this.notificationService.error('El ID del cliente no es válido', 'ID inválido');
          this.router.navigate(['/admin/clientes']);
        }
      }
    });
  }

  /**
   * Cargar catálogo de Regímenes Fiscales desde el backend
   */
  loadRegimenesFiscales() {
    if (this.regimenesCargados) return;
    this.catalogosService.getRegimenesFiscales().subscribe({
      next: (regimenes) => {
        if (regimenes) {
          this.regimenesFiscales = regimenes;
          this.regimenesCargados = true;
        }
      },
      error: (error) => {
        console.error('Error cargando regímenes fiscales:', error);
      }
    });
  }

  /**
   * Cargar catálogo de Usos CFDI desde el backend
   */
  loadUsosCFDI() {
    if (this.usosCfdiCargados) return;
    this.catalogosService.getUsosCFDI().subscribe({
      next: (usos) => {
        if (usos) {
          this.usosCFDI = usos;
          this.usosCfdiCargados = true;
        }
      },
      error: (error) => {
        console.error('Error cargando usos CFDI:', error);
      }
    });
  }

  /**
   * Cargar datos del cliente para edición
   */
  loadCliente() {
    if (this.clienteId) {
      this.loading = true;
      // Cargar catálogos primero si estamos en modo edición
      this.loadUsosCFDI();
      this.loadRegimenesFiscales();
      
      this.svc.getById(this.clienteId).subscribe({
        next: (response) => {
          if (response && response.success && response.data) {
            const clienteData = response.data;
            this.model = {
              nombreComercial: clienteData.nombreComercial || '',
              telefono: clienteData.telefono || '',
              segundoTelefono: clienteData.segundoTelefono || '',
              email: clienteData.email || '',
              segundoEmail: clienteData.segundoEmail || '',
              direccionEntrega: clienteData.direccionEntrega || '',
              razonSocial: clienteData.razonSocial || '',
              rfc: clienteData.rfc || '',
              regimenFiscal: this.extractCode(clienteData.regimenFiscal) || '',
              direccionFacturacion: clienteData.direccionFacturacion || '',
              direccionCodigoPostal: clienteData.direccionCodigoPostal || '',
              usoCfdi: this.extractCode(clienteData.usoCfdi) || ''
            };
            this.cdr.detectChanges();
          } else {
            this.notificationService.error(
              response.message || 'No se encontró el cliente',
              'Error al cargar'
            );
            this.router.navigate(['/admin/clientes']);
          }
          this.loading = false;
        },
        error: (error) => {
          this.notificationService.error(
            error.error?.message || error.message || 'Error desconocido',
            'Error al cargar cliente'
          );
          this.loading = false;
          this.router.navigate(['/admin/clientes']);
        }
      });
    }
  }

  /**
   * Guardar cliente (crear o actualizar)
   */
  save() {
    // Validaciones del lado del cliente
    if (!this.model.nombreComercial || this.model.nombreComercial.trim().length === 0) {
      this.notificationService.warning('El nombre comercial del cliente es requerido', 'Campo requerido');
      return;
    }

    if (!this.model.telefono || this.model.telefono.trim().length === 0) {
      this.notificationService.warning('El teléfono es requerido', 'Campo requerido');
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

    // Validar formato de teléfono
    const telefonoRegex = /^[\d\-\+\(\)\s]+$/;
    if (!telefonoRegex.test(this.model.telefono)) {
      this.notificationService.warning('El formato del teléfono es inválido. Use solo números y caracteres: - + ( )', 'Formato inválido');
      return;
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
    
    // Preparar datos para enviar al backend
    // Extraer solo el código de regimenFiscal y usoCfdi si vienen con formato "CODIGO - Descripción"
    const dataToSend = {
      ...this.model,
      regimenFiscal: this.extractCode(this.model.regimenFiscal),
      usoCfdi: this.extractCode(this.model.usoCfdi)
    };
    
    const request$ = this.isEdit && this.clienteId
      ? this.svc.update(this.clienteId, dataToSend)
      : this.svc.create(dataToSend);
      
    request$.subscribe({
      next: (response) => {
        if (response && response.success) {
          const mensaje = this.isEdit 
            ? 'El cliente ha sido actualizado correctamente' 
            : 'El cliente ha sido creado correctamente';
          const titulo = this.isEdit ? 'Cliente actualizado' : 'Cliente creado';
          
          this.notificationService.success(mensaje, titulo);
          
          // Redirigir después de un pequeño delay para que el usuario vea la notificación
          setTimeout(() => {
            this.router.navigate(['/admin/clientes']);
          }, 500);
        } else {
          this.notificationService.error(
            response.message || 'Error desconocido al guardar el cliente',
            'Error al guardar'
          );
        }
        this.loading = false;
      },
      error: (error) => {
        const errorMsg = error.error?.message || error.message || 'Error desconocido';
        this.notificationService.error(
          errorMsg,
          'Error al guardar cliente'
        );
        this.loading = false;
      }
    });
  }
  
  /**
   * Extraer solo el código de un valor que puede venir en formato "CODIGO - Descripción" o solo "CODIGO"
   */
  private extractCode(value: string | undefined): string {
    if (!value || value.trim().length === 0) {
      return '';
    }
    // Si tiene el formato "CODIGO - Descripción", extraer solo el código
    const match = value.match(/^([A-Z0-9]+)\s*-/);
    return match ? match[1] : value.trim();
  }
  
  /**
   * Cancelar operación y regresar a la lista de clientes
   */
  cancel() { 
    this.router.navigate(['/admin/clientes']); 
  }

  // === MÉTODOS PARA SELECTOR DE GOOGLE MAPS ===
  
  /**
   * Mostrar/ocultar el selector de mapa (accordion expandible)
   * Inicializa campos con datos actuales del formulario
   */
  toggleSelectorMapa() {
    this.showMapSelector = !this.showMapSelector;
    if (this.showMapSelector) {
      this.busquedaDireccion = this.model.direccionEntrega || '';
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
    const direccionBusqueda = this.busquedaDireccion?.trim() || 'Ciudad de México';
    const googleMapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(direccionBusqueda)}`;
    window.open(googleMapsUrl, '_blank', 'width=1200,height=800');
  }

  /**
   * Aplicar la dirección copiada de Google Maps al formulario principal
   * Se ejecuta al presionar Enter en el textarea de dirección
   */
  aplicarDireccion() {
    if (this.direccionCopiada?.trim()) {
      this.model.direccionEntrega = this.direccionCopiada.trim();
      this.showMapSelector = false;
    }
  }
}
