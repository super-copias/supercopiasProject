import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-proveedores-table',
  templateUrl: './proveedores-table.component.html',
  styleUrls: ['./proveedores-table.component.scss']
})
export class ProveedoresTableComponent {
  @Input() proveedores: any[] = [];
  @Output() detalles = new EventEmitter<any>();
  @Output() editar = new EventEmitter<any>();
  @Output() eliminar = new EventEmitter<any>();

  selectedProveedor: any = null;
  showDetalles = false;

  constructor(private notificationService: NotificationService) {}

  // Cerrar modal con tecla Escape
  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: KeyboardEvent) {
    if (this.showDetalles) {
      this.cerrarDetalles();
    }
  }

  verDetalles(proveedor: any) {
    this.selectedProveedor = proveedor;
    this.showDetalles = true;
    document.body.style.overflow = 'hidden';
  }

  cerrarDetalles() {
    this.showDetalles = false;
    this.selectedProveedor = null;
    document.body.style.overflow = 'auto';
  }

  editarProveedor(proveedor: any) {
    this.editar.emit(proveedor);
  }

  eliminarProveedor(proveedor: any) {
    const nombreProveedor = proveedor.nombre_comercial || proveedor.nombreComercial || 'este proveedor';
    if (confirm(`¿Desea desactivar a "${nombreProveedor}"?\n\nEl proveedor se marcará como inactivo.`)) {
      this.eliminar.emit(proveedor);
    }
  }

  getTipoProveedorBadgeClass(tipo: string): string {
    switch(tipo?.toLowerCase()) {
      case 'productos':
        return 'bg-primary';
      case 'servicios':
        return 'bg-info';
      case 'mixto':
        return 'bg-success';
      default:
        return 'bg-secondary';
    }
  }

  imprimirProveedor() {
    if (!this.selectedProveedor) return;
    
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;
    
    const printContent = this.generatePrintContent(this.selectedProveedor);
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  }

  private generatePrintContent(proveedor: any): string {
    const currentDate = new Date().toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const nombreComercial = proveedor.nombre_comercial || proveedor.nombreComercial || '';
    const razonSocial = proveedor.razon_social || proveedor.razonSocial || 'No especificada';
    const rfc = proveedor.rfc || 'No especificado';
    const tipoProveedor = proveedor.tipo_proveedor || proveedor.tipoProveedor || 'No especificado';
    const nombreContacto = proveedor.nombre_contacto || proveedor.nombreContacto || 'No especificado';
    const telefono = proveedor.telefono || 'No especificado';
    const email = proveedor.email || 'No especificado';
    const paginaWeb = proveedor.pagina_web || proveedor.paginaWeb || 'No especificada';
    
    const calleNumero = proveedor.calle_numero || proveedor.calleNumero || '';
    const colonia = proveedor.colonia || '';
    const ciudad = proveedor.ciudad || '';
    const estado = proveedor.estado || '';
    const cp = proveedor.codigo_postal || proveedor.codigoPostal || '';
    const pais = proveedor.pais || 'México';
    
    const direccionCompleta = [calleNumero, colonia, ciudad, estado, cp, pais]
      .filter(part => part && part.trim() !== '')
      .join(', ') || 'No especificada';
    
    const metodoPago = proveedor.metodo_pago_principal || proveedor.metodoPagoPrincipal || 'No especificado';
    const cuentaBancaria = proveedor.cuenta_bancaria || proveedor.cuentaBancaria || 'No especificada';
    const diasCredito = proveedor.dias_credito || proveedor.diasCredito || 0;
    const notas = proveedor.notas || 'Sin notas';

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Información del Proveedor - ${nombreComercial}</title>
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
          }
          .info-row {
            display: flex;
            margin-bottom: 8px;
            align-items: flex-start;
          }
          .info-label {
            font-weight: 600;
            color: #1a2a66;
            width: 140px;
            flex-shrink: 0;
          }
          .info-value {
            color: #333;
            flex: 1;
          }
          .rfc-badge {
            background: #ffd302;
            color: #333;
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 14px;
          }
          .tipo-badge {
            background: #003d80;
            color: white;
            padding: 4px 12px;
            border-radius: 4px;
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
          <div class="document-title">Información del Proveedor</div>
          <div class="print-date">Impreso el: ${currentDate}</div>
        </div>

        <div class="content">
          <div class="section">
            <div class="section-title">Información General</div>
            <div class="info-row">
              <div class="info-label">ID:</div>
              <div class="info-value">${proveedor.id}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Nombre Comercial:</div>
              <div class="info-value"><strong>${nombreComercial}</strong></div>
            </div>
            <div class="info-row">
              <div class="info-label">Razón Social:</div>
              <div class="info-value">${razonSocial}</div>
            </div>
            <div class="info-row">
              <div class="info-label">RFC:</div>
              <div class="info-value"><span class="rfc-badge">${rfc}</span></div>
            </div>
            <div class="info-row">
              <div class="info-label">Tipo:</div>
              <div class="info-value"><span class="tipo-badge">${tipoProveedor}</span></div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Contacto</div>
            <div class="info-row">
              <div class="info-label">Persona contacto:</div>
              <div class="info-value">${nombreContacto}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Teléfono:</div>
              <div class="info-value">${telefono}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Email:</div>
              <div class="info-value">${email}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Página Web:</div>
              <div class="info-value">${paginaWeb}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Dirección:</div>
              <div class="info-value">${direccionCompleta}</div>
            </div>
          </div>
        </div>

        <div class="content">
          <div class="section">
            <div class="section-title">Datos de Pago</div>
            <div class="info-row">
              <div class="info-label">Método de Pago:</div>
              <div class="info-value">${metodoPago}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Cuenta Bancaria:</div>
              <div class="info-value">${cuentaBancaria}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Días de Crédito:</div>
              <div class="info-value">${diasCredito} días</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Notas</div>
            <div class="info-value">${notas}</div>
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
}
