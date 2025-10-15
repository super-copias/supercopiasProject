/**
 * Componente de Formulario de Clientes
 * Permite crear y editar clientes del sistema SuperCopias
 * Incluye funcionalidad de selección de dirección con Google Maps
 */

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ClientesService } from '../../services/clientes.service';
import { CatalogosService } from '../../services/catalogos.service';

@Component({
  selector: 'app-clientes-form',
  template: `
  <div class="p-4">
    <h3>{{isEdit ? 'Editar Cliente' : 'Nuevo Cliente'}}</h3>
    <form (ngSubmit)="save()">
      <div class="mb-2">
        <label>Nombre completo <span class="text-danger">*</span></label>
        <input class="form-control" [(ngModel)]="model.nombre" name="nombre" required />
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
      <div class="mb-2"><label>Razón social</label><input class="form-control" [(ngModel)]="model.razon" name="razon" /></div>
      <div class="mb-2"><label>RFC</label><input class="form-control" [(ngModel)]="model.rfc" name="rfc" maxlength="13" placeholder="XAXX010101000" /></div>
      <div class="mb-2">
        <label>Régimen Fiscal</label>
        <select class="form-select" [(ngModel)]="model.regimen" name="regimen">
          <option value="">Seleccione un régimen fiscal...</option>
          <option *ngFor="let regimen of regimenesFiscales" [value]="regimen.codigo">
            {{regimen.codigo}} - {{regimen.descripcion}}
          </option>
        </select>
      </div>
      <div class="mb-2"><label>Dirección</label><input class="form-control" [(ngModel)]="model.direccion" name="direccion" placeholder="Dirección para facturación" /></div>
      <div class="mb-2"><label>Código Postal</label><input class="form-control" [(ngModel)]="model.cp" name="cp" maxlength="5" placeholder="29000" /></div>
      <div class="mb-2">
        <label>Uso CFDI</label>
        <select class="form-select" [(ngModel)]="model.cfdi" name="cfdi">
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
    nombre: '',
    telefono: '',
    segundoTelefono: '',
    email: '',
    direccionEntrega: '',
    razon: '',
    rfc: '',
    regimen: '',
    direccion: '',
    cp: '',
    cfdi: ''
  };
  isEdit = false;
  clienteId: number | null = null;
  loading = false;
  
  // Catálogos SAT
  usosCFDI: any[] = [];
  regimenesFiscales: any[] = [];
  
  // Variables para el selector de mapa (accordion expandible)
  showMapSelector = false;
  busquedaDireccion = '';
  direccionCopiada = '';

  constructor(
    private svc: ClientesService, 
    private catalogosService: CatalogosService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) { }

  /**
   * Inicialización del componente
   * Carga los catálogos SAT y verifica si es modo edición
   */
  ngOnInit() {
    this.loadUsosCFDI();
    this.loadRegimenesFiscales();
    this.route.queryParams.subscribe(params => {
      if (params['id']) {
        this.clienteId = params['id'];
        this.isEdit = true;
        this.loadCliente();
      }
    });
  }

  /**
   * Cargar catálogo de Regímenes Fiscales desde el backend
   */
  loadRegimenesFiscales() {
    this.catalogosService.getRegimenesFiscales().subscribe({
      next: (regimenes) => {
        if (regimenes) this.regimenesFiscales = regimenes;
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
    this.catalogosService.getUsosCFDI().subscribe({
      next: (usos) => {
        if (usos) this.usosCFDI = usos;
      },
      error: (error) => {
      }
    });
  }

  /**
   * Cargar datos del cliente para edición
   */
  loadCliente() {
    if (this.clienteId) {
      this.loading = true;
      this.svc.getById(this.clienteId).subscribe({
        next: (response) => {
          if (response && response.success && response.data) {
            this.model = { ...response.data };
          }
          this.loading = false;
        },
        error: (error) => {
          this.loading = false;
        }
      });
    }
  }

  /**
   * Guardar cliente (crear o actualizar)
   */
  save() {
    // Validaciones del lado del cliente
    if (!this.model.nombre || this.model.nombre.trim().length === 0) {
      alert('El nombre es requerido');
      return;
    }

    if (!this.model.telefono || this.model.telefono.trim().length === 0) {
      alert('El teléfono es requerido');
      return;
    }

    // Validar formato de email solo si se proporciona
    if (this.model.email && this.model.email.trim().length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(this.model.email)) {
        alert('El formato del correo electrónico es inválido');
        return;
      }
    }

    // Validar formato de teléfono
    const telefonoRegex = /^[\d\-\+\(\)\s]+$/;
    if (!telefonoRegex.test(this.model.telefono)) {
      alert('El formato del teléfono es inválido');
      return;
    }

    // Validar RFC si se proporciona
    if (this.model.rfc && this.model.rfc.trim().length > 0) {
      const rfcRegex = /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/;
      if (!rfcRegex.test(this.model.rfc.toUpperCase())) {
        alert('El formato del RFC es inválido');
        return;
      }
    }

    this.loading = true;
    const request$ = this.isEdit && this.clienteId
      ? this.svc.update(this.clienteId, this.model)
      : this.svc.create(this.model);
      
    request$.subscribe({
      next: (response) => {
        if (response && response.success) {
          this.router.navigate(['/admin/clientes']);
        } else {
          alert('Error guardando cliente: ' + (response.message || 'Error desconocido'));
        }
        this.loading = false;
      },
      error: (error) => {
        const errorMsg = error.error?.message || error.message || 'Error desconocido';
        alert('Error guardando cliente: ' + errorMsg);
        this.loading = false;
      }
    });
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
