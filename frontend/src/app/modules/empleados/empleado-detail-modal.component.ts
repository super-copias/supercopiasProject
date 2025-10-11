import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-empleado-detail-modal',
  template: `
    <!-- Modal -->
    <div class="modal" [class.show]="visible" [style.display]="visible ? 'block' : 'none'" 
         style="z-index: 1060;" *ngIf="visible">
      <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header bg-primary text-white">
            <h5 class="modal-title">
              <i class="fas fa-user-circle me-2"></i>
              Detalle del Empleado
            </h5>
            <button type="button" class="btn-close btn-close-white" (click)="cerrar()"></button>
          </div>
          <div class="modal-body p-3" *ngIf="empleado">
            <!-- Header con información básica -->
            <div class="row mb-3">
              <div class="col-12">
                <div class="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 class="mb-1">{{empleado.nombre}}</h6>
                    <small class="text-muted">ID: {{empleado.id}}</small>
                  </div>
                  <div class="text-end">
                    <span class="badge" [class]="empleado.activo ? 'bg-success' : 'bg-danger'">
                      {{empleado.activo ? 'Activo' : 'Inactivo'}}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Información en Grid Compacto -->
            <div class="row g-2">
              <!-- Columna Izquierda -->
              <div class="col-md-6">
                <div class="info-section">
                  <h6 class="section-title"><i class="fas fa-user me-1"></i> Personal</h6>
                  
                  <div class="info-grid">
                    <div class="info-item">
                      <span class="label">Email:</span>
                      <span class="value">
                        <a [href]="'mailto:' + empleado.email" *ngIf="empleado.email">{{empleado.email}}</a>
                        <span *ngIf="!empleado.email" class="text-muted">No registrado</span>
                      </span>
                    </div>
                    
                    <div class="info-item">
                      <span class="label">Teléfono:</span>
                      <span class="value">
                        <a [href]="'tel:' + empleado.telefono" *ngIf="empleado.telefono">{{empleado.telefono}}</a>
                        <span *ngIf="!empleado.telefono" class="text-muted">No registrado</span>
                      </span>
                    </div>
                    
                    <div class="info-item" *ngIf="!empleado.activo && empleado.fechaBaja">
                      <span class="label">Fecha de Baja:</span>
                      <span class="value">{{formatDate(empleado.fechaBaja)}}</span>
                    </div>
                  </div>
                </div>

                <div class="info-section">
                  <h6 class="section-title"><i class="fas fa-briefcase me-1"></i> Laboral</h6>
                  
                  <div class="info-grid">
                    <div class="info-item">
                      <span class="label">Puesto:</span>
                      <span class="value">{{empleado.puesto || 'No definido'}}</span>
                    </div>
                    
                    <div class="info-item">
                      <span class="label">Sucursal:</span>
                      <span class="value">{{getSucursalNombre(empleado.sucursal) || 'No asignada'}}</span>
                    </div>
                    
                    <div class="info-item">
                      <span class="label">Salario:</span>
                      <span class="value">
                        <span *ngIf="empleado.salario">{{empleado.salario | currency:'MXN':'symbol':'1.0-0'}}</span>
                        <span *ngIf="!empleado.salario" class="text-muted">No definido</span>
                      </span>
                    </div>
                    
                    <div class="info-item">
                      <span class="label">Ingreso:</span>
                      <span class="value">{{formatDate(empleado.fechaIngreso)}}</span>
                    </div>
                    
                    <div class="info-item">
                      <span class="label">Antigüedad:</span>
                      <span class="value">{{getAntiguedad(empleado.fechaIngreso)}}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Columna Derecha -->
              <div class="col-md-6">
                <div class="info-section">
                  <h6 class="section-title"><i class="fas fa-key me-1"></i> Sistema</h6>
                  
                  <div class="info-grid">
                    <div class="info-item">
                      <span class="label">Tipo de Acceso:</span>
                      <span class="value">
                        <span class="badge" [class]="getTipoAccesoBadgeClass(empleado.tipoAcceso)">
                          {{getTipoAccesoLabel(empleado.tipoAcceso)}}
                        </span>
                      </span>
                    </div>
                    
                    <div class="info-item">
                      <span class="label">Usuario:</span>
                      <span class="value">
                        <span class="badge" [class]="empleado.usuarioId ? 'bg-success' : 'bg-secondary'">
                          {{empleado.usuarioId ? 'Sí' : 'No'}}
                        </span>
                      </span>
                    </div>
                  </div>
                  
                  <!-- Módulos en formato compacto -->
                  <div *ngIf="empleado.modulos && hasModulosActivos()" class="mt-2">
                    <small class="text-muted">Módulos:</small>
                    <div class="mt-1">
                      <span *ngFor="let modulo of getModulosActivos()" 
                            class="badge bg-primary me-1 mb-1" style="font-size: 0.7rem;">
                        {{getModuloLabel(modulo)}}
                      </span>
                    </div>
                  </div>
                </div>

                <div class="info-section">
                  <h6 class="section-title"><i class="fas fa-clock me-1"></i> Registro</h6>
                  
                  <div class="info-grid">
                    <div class="info-item">
                      <span class="label">Registrado:</span>
                      <span class="value">{{formatDate(empleado.fechaRegistro)}}</span>
                    </div>
                    
                    <div class="info-item" *ngIf="empleado.fechaModificacion">
                      <span class="label">Modificado:</span>
                      <span class="value">{{formatDate(empleado.fechaModificacion)}}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="cerrar()">
              <i class="fas fa-times me-1"></i>
              Cerrar
            </button>
            <button type="button" class="btn btn-primary" (click)="imprimir()" *ngIf="empleado">
              <i class="fas fa-print me-1"></i>
              Imprimir
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Backdrop -->
    <div class="modal-backdrop fade" [class.show]="visible" *ngIf="visible" 
         style="z-index: 1055;" (click)="cerrar()"></div>
  `,
  styles: [`
    .modal {
      overflow-y: auto;
    }
    
    .info-section {
      background: #f8f9fa;
      border-radius: 0.375rem;
      padding: 0.75rem;
      margin-bottom: 1rem;
    }
    
    .section-title {
      font-size: 0.9rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
      color: #495057;
      border-bottom: 1px solid #dee2e6;
      padding-bottom: 0.25rem;
    }
    
    .info-grid {
      display: grid;
      gap: 0.5rem;
    }
    
    .info-item {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 0.25rem 0;
    }
    
    .info-item .label {
      font-weight: 500;
      color: #6c757d;
      font-size: 0.85rem;
      min-width: 80px;
      flex-shrink: 0;
    }
    
    .info-item .value {
      font-size: 0.9rem;
      color: #212529;
      text-align: right;
      flex-grow: 1;
    }
    
    .badge {
      font-size: 0.75rem;
    }
    
    a {
      text-decoration: none;
      color: #0d6efd;
    }
    
    a:hover {
      text-decoration: underline;
    }
    
    /* Optimización para impresión en carta */
    @media print {
      .modal-dialog {
        max-width: 100% !important;
        margin: 0 !important;
        width: 100% !important;
        height: auto !important;
      }
      
      .modal-content {
        border: none !important;
        box-shadow: none !important;
        width: 100% !important;
        max-height: none !important;
      }
      
      .modal-header, .modal-footer {
        display: none !important;
      }
      
      .modal-body {
        padding: 1rem !important;
        font-size: 11px !important;
        line-height: 1.3 !important;
      }
      
      .info-section {
        border: 1px solid #dee2e6 !important;
        margin-bottom: 0.75rem !important;
        page-break-inside: avoid;
        background: white !important;
        padding: 0.5rem !important;
      }
      
      .section-title {
        font-size: 12px !important;
        font-weight: bold !important;
        margin-bottom: 0.25rem !important;
      }
      
      .info-item {
        padding: 0.15rem 0 !important;
        font-size: 10px !important;
      }
      
      .info-item .label {
        font-size: 10px !important;
        min-width: 60px !important;
      }
      
      .info-item .value {
        font-size: 10px !important;
      }
      
      .badge {
        font-size: 9px !important;
        padding: 0.2em 0.4em !important;
        border: 1px solid #6c757d !important;
        color: #000 !important;
        background: white !important;
      }
      
      .row {
        margin-bottom: 0.5rem !important;
      }
      
      /* Header especial para impresión */
      .modal-body::before {
        content: "DETALLE DE EMPLEADO - SUPERCOPIAS";
        display: block;
        text-align: center;
        font-weight: bold;
        font-size: 14px;
        margin-bottom: 1rem;
        padding-bottom: 0.5rem;
        border-bottom: 2px solid #000;
      }
      
      /* Evitar saltos de página problemáticos */
      .col-md-6 {
        break-inside: avoid;
      }
      
      /* Ajustar espaciado para carta */
      @page {
        size: letter;
        margin: 0.5in;
      }
    }
  `]
})
export class EmpleadoDetailModalComponent {
  @Input() visible = false;
  @Input() empleado: any = null;
  @Input() sucursales: any[] = [];
  
  @Output() cerrarModal = new EventEmitter<void>();

  cerrar() {
    this.visible = false;
    this.cerrarModal.emit();
  }

  imprimir() {
    window.print();
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'No registrada';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  }

  getAntiguedad(fechaIngreso: string): string {
    if (!fechaIngreso) return 'No calculable';
    
    try {
      const ingreso = new Date(fechaIngreso);
      const hoy = new Date();
      const diffTime = Math.abs(hoy.getTime() - ingreso.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const años = Math.floor(diffDays / 365);
      const meses = Math.floor((diffDays % 365) / 30);
      
      if (años > 0) {
        return `${años}a ${meses}m`;
      } else if (meses > 0) {
        return `${meses} meses`;
      } else {
        return `${diffDays} días`;
      }
    } catch {
      return 'No calculable';
    }
  }

  getSucursalNombre(sucursalId: string): string {
    if (!sucursalId || !this.sucursales) return '';
    
    const sucursal = this.sucursales.find(s => s.id === sucursalId);
    return sucursal ? sucursal.nombre : sucursalId;
  }

  getTipoAccesoLabel(tipo: string): string {
    switch (tipo) {
      case 'administrador':
        return 'Administrador';
      case 'personalizado':
        return 'Personalizado';
      case 'inactivo':
        return 'Sin Acceso';
      default:
        return 'No definido';
    }
  }

  getTipoAccesoBadgeClass(tipo: string): string {
    switch (tipo) {
      case 'administrador':
        return 'bg-danger';
      case 'personalizado':
        return 'bg-primary';
      case 'inactivo':
        return 'bg-secondary';
      default:
        return 'bg-secondary';
    }
  }

  hasModulosActivos(): boolean {
    return this.getModulosActivos().length > 0;
  }

  getModulosActivos(): string[] {
    if (!this.empleado?.modulos) return [];
    
    return Object.keys(this.empleado.modulos).filter(modulo => 
      this.empleado.modulos[modulo]?.acceso === true
    );
  }

  getModuloLabel(modulo: string): string {
    const labels: any = {
      dashboard: 'Dashboard',
      empleados: 'Empleados',
      clientes: 'Clientes',
      proveedores: 'Proveedores',
      inventarios: 'Inventarios',
      equipos: 'Equipos',
      reportes: 'Reportes',
      configuracion: 'Configuración'
    };
    
    return labels[modulo] || modulo;
  }

  getModuloIcon(modulo: string): string {
    const icons: any = {
      dashboard: 'fa-tachometer-alt',
      empleados: 'fa-users',
      clientes: 'fa-user-friends',
      proveedores: 'fa-truck',
      inventarios: 'fa-boxes',
      equipos: 'fa-desktop',
      reportes: 'fa-chart-bar',
      configuracion: 'fa-cogs'
    };
    
    return icons[modulo] || 'fa-circle';
  }
}