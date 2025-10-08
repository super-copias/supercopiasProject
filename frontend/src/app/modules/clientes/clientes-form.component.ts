import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ClientesService } from '../../services/clientes.service';

@Component({
  selector: 'app-clientes-form',
  template: `
  <div class="p-4">
    <h3>{{isEdit ? 'Editar Cliente' : 'Nuevo Cliente'}}</h3>
    <form (ngSubmit)="save()">
      <div class="mb-2"><label>Nombre completo</label><input class="form-control" [(ngModel)]="model.nombre" name="nombre" required /></div>
      <div class="mb-2"><label>Teléfono</label><input class="form-control" [(ngModel)]="model.telefono" name="telefono" /></div>
      <div class="mb-2"><label>Segundo teléfono</label><input class="form-control" [(ngModel)]="model.segundoTelefono" name="segundoTelefono" /></div>
      <div class="mb-2"><label>Correo</label><input class="form-control" [(ngModel)]="model.email" name="email" type="email" /></div>
      <div class="mb-2">
        <label>Dirección</label>
        <div class="input-group">
          <input class="form-control" [(ngModel)]="model.direccion" name="direccion" placeholder="Escriba la dirección o seleccione en el mapa" />
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
      <div class="mb-2"><label>RFC</label><input class="form-control" [(ngModel)]="model.rfc" name="rfc" /></div>
      <div class="mb-2"><label>Régimen Fiscal</label><input class="form-control" [(ngModel)]="model.regimen" name="regimen" /></div>
      <div class="mb-2"><label>Código Postal</label><input class="form-control" [(ngModel)]="model.cp" name="cp" /></div>
      <div class="mb-2">
        <label>Uso CFDI</label>
        <select class="form-select" [(ngModel)]="model.cfdi" name="cfdi">
          <option value="">Seleccione un uso CFDI...</option>
          <option *ngFor="let uso of usosCFDI" [value]="uso.codigo + ' - ' + uso.descripcion">
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
  model: any = {};
  isEdit = false;
  clienteId: string | null = null;
  usosCFDI: any[] = [];
  
  // Variables para el selector de mapa (sin modal)
  showMapSelector = false;
  busquedaDireccion = '';
  direccionCopiada = '';

  constructor(
    private svc: ClientesService, 
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadUsosCFDI();
    this.route.queryParams.subscribe(params => {
      if (params['id']) {
        this.clienteId = params['id'];
        this.isEdit = true;
        this.loadCliente();
      }
    });
  }

  loadUsosCFDI() {
    this.svc.getUsosCFDI().subscribe(usos => {
      this.usosCFDI = usos;
    });
  }

  loadCliente() {
    if (this.clienteId) {
      this.svc.getById(this.clienteId).subscribe(cliente => {
        if (cliente) {
          this.model = { ...cliente };
        }
      });
    }
  }

  save() {
    if (this.isEdit && this.clienteId) {
      this.svc.update(this.clienteId, this.model).subscribe(() => {
        this.router.navigate(['/admin/clientes']);
      });
    } else {
      this.svc.create(this.model).subscribe(() => {
        this.router.navigate(['/admin/clientes']);
      });
    }
  }
  
  cancel() { 
    this.router.navigate(['/admin/clientes']); 
  }

  // Métodos para el selector de mapa
  // Métodos para el selector de mapa (sin modal)
  toggleSelectorMapa() {
    this.showMapSelector = !this.showMapSelector;
    if (this.showMapSelector) {
      this.busquedaDireccion = this.model.direccion || '';
      this.direccionCopiada = '';
    }
  }

  cerrarSelector() {
    this.showMapSelector = false;
    this.busquedaDireccion = '';
    this.direccionCopiada = '';
  }

  abrirGoogleMaps() {
    const direccionBusqueda = this.busquedaDireccion?.trim() || 'Ciudad de México';
    const googleMapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(direccionBusqueda)}`;
    window.open(googleMapsUrl, '_blank', 'width=1200,height=800');
  }

  aplicarDireccion() {
    if (this.direccionCopiada?.trim()) {
      this.model.direccion = this.direccionCopiada.trim();
      this.showMapSelector = false;
    }
  }
}
