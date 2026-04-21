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
            <!-- Tabs de navegación -->
            <ul class="nav nav-tabs mb-3" role="tablist">
              <li class="nav-item" role="presentation">
                <button class="nav-link" [class.active]="tabActivo === 'informacion'" 
                        (click)="tabActivo = 'informacion'" type="button">
                  <i class="fas fa-user me-1"></i> Información
                </button>
              </li>
              <li class="nav-item" role="presentation">
                <button class="nav-link" [class.active]="tabActivo === 'eventos'" 
                        (click)="tabActivo = 'eventos'" type="button">
                  <i class="fas fa-calendar-alt me-1"></i> Eventos de Personal
                </button>
              </li>
            </ul>

            <!-- Tab: Información General -->
            <div *ngIf="tabActivo === 'informacion'">
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
                      <span class="value">{{empleado.puestoNombre || empleado.puesto || 'No definido'}}</span>
                    </div>
                    
                    <div class="info-item">
                      <span class="label">Sucursal:</span>
                      <span class="value">{{empleado.sucursalNombre || getSucursalNombre(empleado.sucursal) || 'No asignada'}}</span>
                    </div>
                    
                    <div class="info-item">
                      <span class="label">Turno:</span>
                      <span class="value">{{empleado.turno || 'No definido'}}</span>
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
                        <span class="badge" [class]="getTipoAccesoBadgeClass(empleado.tipoPermiso || empleado.tipoAcceso)">
                          {{getTipoAccesoLabel(empleado.tipoPermiso || empleado.tipoAcceso)}}
                        </span>
                      </span>
                    </div>
                    
                    <div class="info-item">
                      <span class="label">Usuario:</span>
                      <span class="value">
                        <span class="badge" [class]="(empleado.usuario?.id || empleado.usuarioId) ? 'bg-success' : 'bg-secondary'">
                          {{(empleado.usuario?.id || empleado.usuarioId) ? (empleado.usuario?.username || 'Sí') : 'No'}}
                        </span>
                      </span>
                    </div>
                  </div>
                  
                  <!-- Módulos en formato compacto -->
                  <div *ngIf="hasModulosActivos()" class="mt-2">
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
            </div><!-- Fin Tab Información -->

            <!-- Tab: Eventos de Personal -->
            <div *ngIf="tabActivo === 'eventos'">
              <app-eventos-personal [empleadoId]="empleado.id"></app-eventos-personal>
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
    
    /* Estilos básicos para impresión */
    @media print {
      .modal-header, .modal-footer {
        display: none !important;
      }
      
      .modal-dialog {
        max-width: 100% !important;
        margin: 0 !important;
      }
      
      .modal-content {
        border: none !important;
        box-shadow: none !important;
      }
      
      .modal-body {
        padding: 20px !important;
      }
    }
  `]
})
export class EmpleadoDetailModalComponent {
  @Input() visible = false;
  @Input() empleado: any = null;
  @Input() sucursales: any[] = [];
  
  @Output() cerrarModal = new EventEmitter<void>();

  tabActivo: 'informacion' | 'eventos' = 'informacion';

  cerrar() {
    this.visible = false;
    this.tabActivo = 'informacion'; // Resetear tab al cerrar
    this.cerrarModal.emit();
  }

  imprimir() {
    if (!this.empleado) return;
    
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;
    
    const printContent = this.generatePrintContent(this.empleado);
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    
    // Dar tiempo para que cargue el contenido antes de imprimir
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  }

  private generatePrintContent(empleado: any): string {
    const currentDate = new Date().toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Información del Empleado - ${empleado.nombre}</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 20px;
            background: white;
            color: #333;
            line-height: 1.6;
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #003d80;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .company-name {
            font-size: 28px;
            font-weight: bold;
            color: #003d80;
            margin-bottom: 5px;
          }
          .document-title {
            font-size: 18px;
            color: #1a2a66;
            margin-bottom: 10px;
          }
          .print-date {
            font-size: 12px;
            color: #666;
          }
          .content {
            display: flex;
            gap: 30px;
            margin-bottom: 30px;
          }
          .section {
            flex: 1;
            background: #f3f3f2;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #ffd302;
          }
          .section-title {
            font-size: 16px;
            font-weight: bold;
            color: #003d80;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
          }
          .section-title i {
            margin-right: 8px;
            color: #ffd302;
          }
          .info-row {
            display: flex;
            margin-bottom: 8px;
            align-items: flex-start;
          }
          .info-label {
            font-weight: 600;
            color: #1a2a66;
            width: 120px;
            flex-shrink: 0;
          }
          .info-value {
            color: #333;
            flex: 1;
          }
          .status-badge {
            background: ${empleado.activo ? '#28a745' : '#dc3545'};
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 12px;
          }
          .access-badge {
            background: #007bff;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 12px;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            color: #666;
            font-size: 12px;
          }
          @media print {
            body { margin: 0; }
            .header { page-break-inside: avoid; }
            .content { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">SuperCopias</div>
          <div class="document-title">Información del Empleado</div>
          <div class="print-date">Impreso el: ${currentDate}</div>
        </div>

        <div class="content">
          <div class="section">
            <div class="section-title">
              <i class="fas fa-user"></i>
              Información Personal
            </div>
            <div class="info-row">
              <div class="info-label">ID:</div>
              <div class="info-value">${empleado.id}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Nombre:</div>
              <div class="info-value">${empleado.nombre}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Email:</div>
              <div class="info-value">${empleado.email || 'No registrado'}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Teléfono:</div>
              <div class="info-value">${empleado.telefono || 'No registrado'}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Estado:</div>
              <div class="info-value">
                <span class="status-badge">${empleado.activo ? 'ACTIVO' : 'INACTIVO'}</span>
              </div>
            </div>
            ${!empleado.activo && empleado.fechaBaja ? `
            <div class="info-row">
              <div class="info-label">Fecha Baja:</div>
              <div class="info-value">${this.formatDate(empleado.fechaBaja)}</div>
            </div>
            ` : ''}
          </div>

          <div class="section">
            <div class="section-title">
              <i class="fas fa-briefcase"></i>
              Información Laboral
            </div>
            <div class="info-row">
              <div class="info-label">Puesto:</div>
              <div class="info-value">${empleado.puestoNombre || empleado.puesto || 'No definido'}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Sucursal:</div>
              <div class="info-value">${empleado.sucursalNombre || this.getSucursalNombre(empleado.sucursal) || 'No asignada'}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Salario:</div>
              <div class="info-value">${empleado.salario ? '$' + empleado.salario.toLocaleString('es-MX') : 'No definido'}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Fecha Ingreso:</div>
              <div class="info-value">${this.formatDate(empleado.fechaIngreso)}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Antigüedad:</div>
              <div class="info-value">${this.getAntiguedad(empleado.fechaIngreso)}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Acceso Sistema:</div>
              <div class="info-value">
                <span class="access-badge">${this.getTipoAccesoLabel(empleado.tipoPermiso || empleado.tipoAcceso)}</span>
              </div>
            </div>
            ${this.hasModulosActivos() ? `
            <div class="info-row">
              <div class="info-label">Módulos:</div>
              <div class="info-value">${this.getModulosActivos().map(m => this.getModuloLabel(m)).join(', ')}</div>
            </div>
            ` : ''}
          </div>
        </div>

        <div class="footer">
          <p>Este documento fue generado automáticamente por el sistema SuperCopias</p>
          <p>Para más información, contacte con nuestro equipo de soporte</p>
        </div>
      </body>
      </html>
    `;
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
    if (!tipo) return 'No definido';
    
    switch (tipo) {
      case 'administrador':
      case 'completo':
        return 'Administrador';
      case 'personalizado':
      case 'limitado':
        return 'Personalizado';
      case 'sin_permisos':
      case 'solo_lectura':
      case 'inactivo':
        return 'Sin Acceso';
      default:
        return 'No definido';
    }
  }

  getTipoAccesoBadgeClass(tipo: string): string {
    if (!tipo) return 'bg-secondary';
    
    switch (tipo) {
      case 'administrador':
      case 'completo':
        return 'bg-danger';
      case 'personalizado':
      case 'limitado':
        return 'bg-primary';
      case 'sin_permisos':
      case 'solo_lectura':
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
    if (!this.empleado) return [];
    
    // Si tiene modulosPermitidos como array (formato del backend)
    if (this.empleado.modulosPermitidos && Array.isArray(this.empleado.modulosPermitidos)) {
      const modulos = this.empleado.modulosPermitidos.map((m: any) => String(m));
      return modulos;
    }
    
    // Si tiene modulos como objeto (formato antiguo)
    if (this.empleado.modulos && typeof this.empleado.modulos === 'object') {
      return Object.keys(this.empleado.modulos).filter(modulo => 
        this.empleado.modulos[modulo]?.acceso === true
      );
    }
    
    return [];
  }

  getModuloLabel(modulo: string): string {
    const labels: any = {
      dashboard: 'Dashboard',
      empleados: 'Empleados',
      clientes: 'Clientes',
      proveedores: 'Proveedores',
      inventarios: 'Inventarios',
      equipos: 'Equipos',
      punto_venta: 'Punto de Venta',
      reportes: 'Reportes'
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
      reportes: 'fa-chart-bar'
    };
    
    return icons[modulo] || 'fa-circle';
  }
}