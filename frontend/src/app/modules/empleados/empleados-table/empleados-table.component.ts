import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-empleados-table',
  templateUrl: './empleados-table.component.html',
  styleUrls: ['./empleados-table.component.scss']
})
export class EmpleadosTableComponent {
  @Input() empleados: any[] = [];
  @Output() detalles = new EventEmitter<any>();
  @Output() verDetalle = new EventEmitter<any>();
  @Output() editar = new EventEmitter<any>();
  @Output() eliminar = new EventEmitter<any>();
  @Output() asignarRole = new EventEmitter<any>();
  @Output() toggleEstado = new EventEmitter<any>();

  selectedEmpleado: any = null;
  showDetalles = false;

  verDetalles(empleado: any) {
    // Emitir para el modal de detalle
    this.verDetalle.emit(empleado);
  }

  cerrarDetalles() {
    this.showDetalles = false;
    this.selectedEmpleado = null;
  }

  editarEmpleado(empleado: any) {
    this.editar.emit(empleado);
  }

  eliminarEmpleado(empleado: any, event?: Event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    
    // Emitir directamente sin confirm, el componente padre maneja la confirmación
    this.eliminar.emit(empleado);
  }

  asignarRoleEmpleado(empleado: any) {
    this.asignarRole.emit(empleado);
  }

  onToggleEstado(empleado: any) {
    this.toggleEstado.emit(empleado);
  }

  imprimirEmpleado() {
    if (!this.selectedEmpleado) return;
    
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;
    
    const printContent = this.generatePrintContent(this.selectedEmpleado);
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    
    // Dar tiempo para que cargue el contenido antes de imprimir
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
      
      // Quitar el foco del botón para evitar que se quede azul
      const activeElement = document.activeElement as HTMLElement;
      if (activeElement && activeElement.blur) {
        activeElement.blur();
      }
    }, 250);
  }

  calcularAntiguedad(fechaIngreso: string): string {
    if (!fechaIngreso) return 'No especificada';
    
    const fecha = new Date(fechaIngreso);
    const hoy = new Date();
    const diff = hoy.getTime() - fecha.getTime();
    const dias = Math.floor(diff / (1000 * 3600 * 24));
    
    if (dias < 30) {
      return `${dias} días`;
    } else if (dias < 365) {
      const meses = Math.floor(dias / 30);
      return `${meses} mes${meses !== 1 ? 'es' : ''}`;
    } else {
      const años = Math.floor(dias / 365);
      const mesesRestantes = Math.floor((dias % 365) / 30);
      return `${años} año${años !== 1 ? 's' : ''}${mesesRestantes > 0 ? ` y ${mesesRestantes} mes${mesesRestantes !== 1 ? 'es' : ''}` : ''}`;
    }
  }

  formatearSalario(salario: number): string {
    if (!salario) return 'No especificado';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(salario);
  }

  getTipoPermisoLabel(tipoPermiso: string): string {
    const labels: { [key: string]: string } = {
      'sin_permisos': 'Sin Permisos',
      'administrador': 'Administrador', 
      'personalizado': 'Personalizado'
    };
    return labels[tipoPermiso] || tipoPermiso;
  }

  getModuloLabel(modulo: string): string {
    const labels: { [key: string]: string } = {
      'dashboard': 'Dashboard',
      'empleados': 'Empleados',
      'clientes': 'Clientes',
      'proveedores': 'Proveedores',
      'inventarios': 'Inventarios',
      'equipos': 'Equipos',
      'reportes': 'Reportes',
      'punto_venta': 'Punto de Venta'
    };
    return labels[modulo] || modulo;
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
          @page {
            size: letter;
            margin: 1in 0.75in;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 0;
            background: white;
            color: #333;
            line-height: 1.4;
            font-size: 11pt;
            max-width: 100%;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #003d80;
            padding-bottom: 15px;
            margin-bottom: 20px;
          }
          .header h1 {
            color: #003d80;
            margin: 0 0 8px 0;
            font-size: 22pt;
            font-weight: bold;
          }
          .header .subtitle {
            color: #666;
            font-size: 12pt;
            margin: 3px 0;
          }
          .info-section {
            margin-bottom: 15px;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background: #f8f9fa;
            page-break-inside: avoid;
          }
          .info-section h3 {
            color: #003d80;
            margin-top: 0;
            margin-bottom: 10px;
            font-size: 14pt;
            border-bottom: 1px solid #003d80;
            padding-bottom: 3px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 15px;
          }
          .info-row {
            margin-bottom: 6px;
          }
          .info-label {
            font-weight: bold;
            color: #444;
            display: inline-block;
            min-width: 100px;
          }
          .info-value {
            color: #333;
          }
          .footer {
            margin-top: 20px;
            text-align: center;
            font-size: 9pt;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 10px;
            page-break-inside: avoid;
          }
          .status-badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 9pt;
            font-weight: bold;
            text-transform: uppercase;
          }
          .status-activo {
            background: #d4edda;
            color: #155724;
          }
          .status-inactivo {
            background: #f8d7da;
            color: #721c24;
          }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Super Copias</h1>
          <div class="subtitle">Información del Empleado</div>
          <div class="subtitle">Generado el ${currentDate}</div>
        </div>

        <div class="info-grid">
          <div class="info-section">
            <h3>Información Personal</h3>
            <div class="info-row">
              <div class="info-label">Nombre:</div>
              <div class="info-value">${empleado.nombre || 'No especificado'}</div>
            </div>
            <div class="info-row">
              <div class="info-label">ID Empleado:</div>
              <div class="info-value">${empleado.id || 'No asignado'}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Teléfono:</div>
              <div class="info-value">${empleado.telefono || 'No especificado'}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Email:</div>
              <div class="info-value">${empleado.email || 'No especificado'}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Estado:</div>
              <div class="info-value">
                <span class="status-badge ${empleado.activo ? 'status-activo' : 'status-inactivo'}">
                  ${empleado.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
            ${empleado.fechaBaja && !empleado.activo ? `
            <div class="info-row">
              <div class="info-label">Fecha de Baja:</div>
              <div class="info-value" style="color: #dc3545; font-weight: bold;">
                ${new Date(empleado.fechaBaja).toLocaleDateString('es-MX')}
              </div>
            </div>
            ` : ''}
          </div>

          <div class="info-section">
            <h3>Información Laboral</h3>
            <div class="info-row">
              <div class="info-label">Puesto:</div>
              <div class="info-value">${empleado.puesto || 'No especificado'}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Sucursal:</div>
              <div class="info-value">${empleado.sucursal || 'No especificado'}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Turno:</div>
              <div class="info-value">${empleado.turno || 'No especificado'}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Fecha de Ingreso:</div>
              <div class="info-value">${empleado.fechaIngreso ? new Date(empleado.fechaIngreso).toLocaleDateString('es-MX') : 'No especificada'}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Salario:</div>
              <div class="info-value">${empleado.salario ? this.formatearSalario(empleado.salario) : 'No especificado'}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Antigüedad:</div>
              <div class="info-value">${this.calcularAntiguedad(empleado.fechaIngreso)}</div>
            </div>
          </div>
        </div>

        <div class="info-section">
          <h3>Permisos y Accesos</h3>
          <div class="info-row">
            <div class="info-label">Tipo de Permisos:</div>
            <div class="info-value">
              <span class="status-badge ${empleado.tipoPermiso === 'administrador' ? 'status-activo' : empleado.tipoPermiso === 'sin_permisos' ? 'status-inactivo' : 'status-badge'}">
                ${this.getTipoPermisoLabel(empleado.tipoPermiso || 'No especificado')}
              </span>
            </div>
          </div>
          ${empleado.modulosPermitidos && empleado.modulosPermitidos.length > 0 ? `
          <div class="info-row">
            <div class="info-label">Módulos Permitidos:</div>
            <div class="info-value">
              ${empleado.modulosPermitidos.map((mod: string) => this.getModuloLabel(mod)).join(', ')}
            </div>
          </div>
          ` : ''}
        <div class="footer">
          <p>Este documento fue generado automáticamente por el sistema Super Copias.</p>
          <p>Para más información, contacte al administrador del sistema.</p>
        </div>
      </body>
      </html>
    `;
  }
}