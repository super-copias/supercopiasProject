import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-empleados-table',
  templateUrl: './empleados-table.component.html',
  styleUrls: ['./empleados-table.component.scss']
})
export class EmpleadosTableComponent {
  @Input() empleados: any[] = [];
  @Output() detalles = new EventEmitter<any>();
  @Output() editar = new EventEmitter<any>();
  @Output() eliminar = new EventEmitter<any>();
  @Output() asignarRole = new EventEmitter<any>();

  selectedEmpleado: any = null;
  showDetalles = false;

  verDetalles(empleado: any) {
    this.selectedEmpleado = empleado;
    this.showDetalles = true;
  }

  cerrarDetalles() {
    this.showDetalles = false;
    this.selectedEmpleado = null;
  }

  editarEmpleado(empleado: any) {
    this.editar.emit(empleado);
  }

  eliminarEmpleado(empleado: any) {
    if (confirm(`¿Está seguro de eliminar al empleado "${empleado.nombre}"?`)) {
      this.eliminar.emit(empleado);
    }
  }

  asignarRoleEmpleado(empleado: any) {
    this.asignarRole.emit(empleado);
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
          .header h1 {
            color: #003d80;
            margin: 0 0 10px 0;
            font-size: 28px;
          }
          .header .subtitle {
            color: #666;
            font-size: 16px;
            margin: 5px 0;
          }
          .info-section {
            margin-bottom: 25px;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 5px;
            background: #f9f9f9;
          }
          .info-section h3 {
            color: #003d80;
            margin-top: 0;
            margin-bottom: 15px;
            font-size: 18px;
            border-bottom: 1px solid #003d80;
            padding-bottom: 5px;
          }
          .info-row {
            display: flex;
            margin-bottom: 8px;
          }
          .info-label {
            font-weight: bold;
            min-width: 150px;
            color: #444;
          }
          .info-value {
            flex: 1;
            color: #333;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 15px;
          }
          .status-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
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
        </div>

        <div class="info-section">
          <h3>Información Laboral</h3>
          <div class="info-row">
            <div class="info-label">Puesto:</div>
            <div class="info-value">${empleado.puesto || 'No especificado'}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Departamento:</div>
            <div class="info-value">${empleado.departamento || 'No especificado'}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Salario:</div>
            <div class="info-value">${this.formatearSalario(empleado.salario)}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Fecha de Ingreso:</div>
            <div class="info-value">${empleado.fechaIngreso ? new Date(empleado.fechaIngreso).toLocaleDateString('es-MX') : 'No especificada'}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Antigüedad:</div>
            <div class="info-value">${this.calcularAntiguedad(empleado.fechaIngreso)}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Rol del Sistema:</div>
            <div class="info-value">${empleado.role || 'Sin rol asignado'}</div>
          </div>
        </div>

        <div class="info-section">
          <h3>Información del Sistema</h3>
          <div class="info-row">
            <div class="info-label">Fecha de Registro:</div>
            <div class="info-value">${empleado.fechaRegistro ? new Date(empleado.fechaRegistro).toLocaleDateString('es-MX') : 'No disponible'}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Última Modificación:</div>
            <div class="info-value">${empleado.fechaModificacion ? new Date(empleado.fechaModificacion).toLocaleDateString('es-MX') : 'No modificado'}</div>
          </div>
        </div>

        <div class="footer">
          <p>Este documento fue generado automáticamente por el sistema Super Copias.</p>
          <p>Para más información, contacte al administrador del sistema.</p>
        </div>
      </body>
      </html>
    `;
  }
}