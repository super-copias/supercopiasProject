import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { NotificationService } from '../../../services/notification.service';
import { CatalogosService } from '../../../services/catalogos.service';

@Component({
  selector: 'app-clientes-table',
  templateUrl: './clientes-table.component.html',
  styleUrls: ['./clientes-table.component.scss']
})
export class ClientesTableComponent {
  @Input() clientes: any[] = [];
  @Output() detalles = new EventEmitter<any>();
  @Output() editar = new EventEmitter<any>();
  @Output() eliminar = new EventEmitter<any>();

  selectedCliente: any = null;
  showDetalles = false;
  usosCFDI: any[] = [];
  catalogosCargados = false;

  constructor(
    private notificationService: NotificationService,
    private catalogosService: CatalogosService
  ) {}

  cargarUsosCFDI() {
    if (this.catalogosCargados) return;
    this.catalogosService.getUsosCFDI().subscribe({
      next: (usos) => {
        this.usosCFDI = usos;
        this.catalogosCargados = true;
      },
      error: (error) => {
        console.error('Error al cargar usos CFDI:', error);
      }
    });
  }

  getUsoCFDIDescripcion(codigo: string): string {
    if (!codigo) return 'No especificado';
    const uso = this.usosCFDI.find(u => u.codigo === codigo);
    return uso ? `${uso.codigo} - ${uso.descripcion}` : codigo;
  }

  // Cerrar modal con tecla Escape
  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: KeyboardEvent) {
    if (this.showDetalles) {
      this.cerrarDetalles();
    }
  }

  verDetalles(cliente: any) {
    this.selectedCliente = cliente;
    this.showDetalles = true;
    // Cargar catálogos solo cuando se necesiten
    this.cargarUsosCFDI();
    // Prevenir scroll del body cuando el modal está abierto
    document.body.style.overflow = 'hidden';
  }

  cerrarDetalles() {
    this.showDetalles = false;
    this.selectedCliente = null;
    // Restaurar scroll del body
    document.body.style.overflow = 'auto';
  }

  editarCliente(cliente: any) {
    this.editar.emit(cliente);
  }

  eliminarCliente(cliente: any) {
    const nombreCliente = cliente.nombreComercial || 'este cliente';
    if (confirm(`¿Desea desactivar a "${nombreCliente}"?\n\nEl cliente se marcará como inactivo.`)) {
      this.eliminar.emit(cliente);
    }
  }

  verUbicacion(cliente: any) {
    if (!cliente.direccionEntrega || cliente.direccionEntrega.trim() === '') {
      this.notificationService.warning(
        'Este cliente no tiene una dirección registrada',
        'Dirección no disponible'
      );
      return;
    }

    // Codificar la dirección para URL
    const direccionCodificada = encodeURIComponent(cliente.direccionEntrega.trim());
    
    // Crear URL de Google Maps
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${direccionCodificada}`;
    
    // Abrir en nueva ventana
    window.open(googleMapsUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
  }

  imprimirCliente() {
    if (!this.selectedCliente) return;
    
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;
    
    const printContent = this.generatePrintContent(this.selectedCliente);
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    
    // Dar tiempo para que cargue el contenido antes de imprimir
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  }

  private generatePrintContent(cliente: any): string {
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
        <title>Información del Cliente - ${cliente.nombreComercial}</title>
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
          .rfc-badge {
            background: #ffd302;
            color: #333;
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 14px;
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
          <div class="document-title">Información del Cliente</div>
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
              <div class="info-value">${cliente.id}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Nombre Comercial:</div>
              <div class="info-value">${cliente.nombreComercial}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Teléfono:</div>
              <div class="info-value">${cliente.telefono}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Segundo Tel:</div>
              <div class="info-value">${cliente.segundoTelefono || 'No especificado'}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Correo:</div>
              <div class="info-value">${cliente.email}</div>
            </div>
            ${cliente.segundoEmail ? `
            <div class="info-row">
              <div class="info-label">Segundo correo:</div>
              <div class="info-value">${cliente.segundoEmail}</div>
            </div>` : ''}
            <div class="info-row">
              <div class="info-label">Dirección de entrega:</div>
              <div class="info-value">${cliente.direccionEntrega}</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">
              <i class="fas fa-file-invoice"></i>
              Datos de Facturación
            </div>
            <div class="info-row">
              <div class="info-label">RFC:</div>
              <div class="info-value"><span class="rfc-badge">${cliente.rfc}</span></div>
            </div>
            <div class="info-row">
              <div class="info-label">Razón Social:</div>
              <div class="info-value">${cliente.razonSocial || 'No especificada'}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Régimen:</div>
              <div class="info-value">${cliente.regimenFiscal || 'No especificado'}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Dirección de facturación:</div>
              <div class="info-value">${cliente.direccionFacturacion || 'No especificada'}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Código Postal:</div>
              <div class="info-value">${cliente.direccionCodigoPostal || 'No especificado'}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Uso CFDI:</div>
              <div class="info-value">${this.getUsoCFDIDescripcion(cliente.usoCfdi)}</div>
            </div>
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
