import { Component } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ClientesService } from '../../services/clientes.service';
import { NotificationService } from '../../services/notification.service';

/**
 * Componente para carga masiva de clientes desde archivo Excel
 * Permite subir archivos .xlsx/.xls con validación y feedback de progreso
 */
@Component({
  selector: 'app-clientes-upload',
  template: `
    <div class="p-4">
      <!-- Breadcrumb navigation -->
      <nav aria-label="breadcrumb" class="mb-3">
        <ol class="breadcrumb">
          <li class="breadcrumb-item">
            <a href="javascript:void(0)" (click)="regresarAClientes()" class="text-decoration-none">
              <i class="fas fa-users me-1"></i>
              Clientes
            </a>
          </li>
          <li class="breadcrumb-item active" aria-current="page">
            <i class="fas fa-file-excel me-1"></i>
            Alta Masiva
          </li>
        </ol>
      </nav>
      
      <!-- Header con navegación -->
      <div class="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4">
        <h3 class="mb-2 mb-md-0">
          <i class="fas fa-file-excel text-success me-2"></i>
          Alta Masiva de Clientes
        </h3>
        <div class="d-flex gap-2">
          <button 
            class="btn btn-outline-secondary btn-sm"
            (click)="regresarAClientes()"
            [disabled]="uploading">
            <i class="fas fa-arrow-left me-1"></i>
            <span class="d-none d-sm-inline">Regresar a </span>Clientes
          </button>
        </div>
      </div>
      
      <!-- Instrucciones -->
      <div class="alert alert-info">
        <h6><i class="fas fa-info-circle me-1"></i> Instrucciones:</h6>
        <p class="mb-2">El archivo Excel debe contener las siguientes columnas exactas:</p>
        <ul class="mb-2">
          <li><strong>nombre</strong> - Nombre del cliente <span class="text-danger">(requerido)</span></li>
          <li><strong>telefono</strong> - Teléfono principal <span class="text-danger">(requerido, solo dígitos sin guiones)</span></li>
          <li><strong>correo</strong> - Email del cliente</li>
          <li><strong>segundo telefono</strong> - Teléfono secundario (solo dígitos sin guiones)</li>
          <li><strong>direccion de entrega</strong> - Dirección completa donde se entregan los productos</li>
          <li><strong>razon social</strong> - Razón social para facturación</li>
          <li><strong>rfc</strong> - RFC para facturación</li>
          <li><strong>regimen fiscal</strong> - Código de régimen fiscal (ej: <code>612</code>, <code>601</code>)</li>
          <li><strong>direccion de facturacion</strong> - Dirección de facturación (para emisión de facturas)</li>
          <li><strong>codigo postal</strong> - Código postal</li>
          <li><strong>uso cfdi</strong> - Código de Uso CFDI (ej: <code>G01</code>, <code>G03</code>, <code>D01</code>)</li>
        </ul>
        
        <div class="alert alert-warning mb-2">
          <small>
            <strong><i class="fas fa-exclamation-triangle me-1"></i> Importante:</strong>
            <ul class="mb-0 mt-1">
              <li><strong>Direcciones:</strong> El sistema maneja dos direcciones separadas: <code>direccion de entrega</code> (para envíos) y <code>direccion de facturacion</code> (para facturas)</li>
              <li>Los teléfonos deben ser <strong>solo números</strong>, sin guiones ni espacios (ej: <code>9611234567</code>)</li>
              <li><strong>uso cfdi</strong> debe ser solo el <strong>código</strong> (ej: <code>G03</code>), no incluir la descripción</li>
              <li><strong>regimen fiscal</strong> debe ser solo el <strong>código numérico</strong> (ej: <code>612</code>), no incluir la descripción</li>
            </ul>
          </small>
        </div>
        
        <!-- Botón de descarga de plantilla -->
        <div class="d-grid gap-2 d-md-flex justify-content-md-end">
          <button 
            class="btn btn-success btn-sm"
            (click)="descargarPlantilla()"
            [disabled]="descargandoPlantilla">
            <span *ngIf="!descargandoPlantilla">
              <i class="fas fa-download me-1"></i>
              Descargar plantilla Excel
            </span>
            <span *ngIf="descargandoPlantilla">
              <i class="fas fa-spinner fa-spin me-1"></i>
              Generando...
            </span>
          </button>
        </div>
      </div>

      <!-- Selector de archivo -->
      <div class="card">
        <div class="card-body">
          <div class="mb-3">
            <label for="excelFile" class="form-label">
              <i class="fas fa-upload me-1"></i>
              Seleccionar archivo Excel
            </label>
            <input 
              type="file" 
              class="form-control" 
              id="excelFile"
              (change)="onFileSelected($event)" 
              accept=".xlsx,.xls,.csv"
              [disabled]="uploading" />
          </div>

          <!-- Información del archivo seleccionado -->
          <div *ngIf="selectedFile" class="alert alert-secondary">
            <i class="fas fa-file-alt me-1"></i>
            <strong>Archivo seleccionado:</strong> {{selectedFile.name}}
            <br>
            <small>Tamaño: {{formatFileSize(selectedFile.size)}}</small>
          </div>

          <!-- Botón de subida -->
          <button 
            class="btn btn-primary me-2"
            [disabled]="!selectedFile || uploading"
            (click)="uploadFile()">
            <span *ngIf="uploading">
              <i class="fas fa-spinner fa-spin me-1"></i>
              Procesando...
            </span>
            <span *ngIf="!uploading">
              <i class="fas fa-cloud-upload-alt me-1"></i>
              Subir y Procesar
            </span>
          </button>

          <button 
            class="btn btn-outline-secondary"
            [disabled]="uploading"
            (click)="clearFile()">
            <i class="fas fa-times me-1"></i>
            Limpiar
          </button>
        </div>
      </div>

      <!-- Barra de progreso -->
      <div *ngIf="uploading" class="mt-3">
        <div class="progress">
          <div class="progress-bar progress-bar-striped progress-bar-animated" 
               role="progressbar" 
               style="width: 100%">
            Procesando archivo...
          </div>
        </div>
      </div>

      <!-- Resultados -->
      <div *ngIf="result" class="mt-3">
        <!-- Éxito -->
        <div *ngIf="result.success" class="alert alert-success">
          <h6><i class="fas fa-check-circle me-1"></i> ¡Carga masiva completada!</h6>
          
          <!-- Resumen detallado -->
          <div class="row mb-3">
            <div class="col-md-6">
              <div class="d-flex align-items-center">
                <i class="fas fa-users text-success me-2" style="font-size: 2rem;"></i>
                <div>
                  <h4 class="mb-0 text-success">{{result.insertados || 0}}</h4>
                  <small class="text-muted">Clientes agregados</small>
                </div>
              </div>
            </div>
            <div class="col-md-6" *ngIf="result.total && result.total > 0">
              <div class="d-flex align-items-center">
                <i class="fas fa-file-excel text-info me-2" style="font-size: 2rem;"></i>
                <div>
                  <h5 class="mb-0 text-info">{{result.total}}</h5>
                  <small class="text-muted">Registros procesados</small>
                </div>
              </div>
            </div>
          </div>

          <!-- Mensaje de éxito -->
          <p class="mb-3" *ngIf="result.insertados > 0">
            <i class="fas fa-info-circle me-1"></i>
            Los clientes se han agregado exitosamente a la base de datos.
          </p>
          
          <!-- Botón para regresar al módulo de clientes -->
          <button 
            class="btn btn-primary"
            (click)="regresarAClientes()">
            <i class="fas fa-arrow-left me-1"></i>
            Ver Clientes Registrados
          </button>
        </div>

        <!-- Errores de validación -->
        <div *ngIf="result.errores && result.errores.length > 0" class="alert alert-warning mt-2">
          <h6><i class="fas fa-exclamation-triangle me-1"></i> Errores de validación encontrados:</h6>
          <p class="mb-3">
            <strong>{{result.errores.length}}</strong> registros con errores no fueron procesados:
          </p>
          
          <!-- Lista de errores detallados -->
          <div class="error-list" style="max-height: 400px; overflow-y: auto;">
            <div *ngFor="let error of result.errores; let i = index" class="error-item p-3 mb-2 border-start border-4 border-danger bg-white rounded shadow-sm">
              <div class="d-flex align-items-start">
                <span class="badge bg-danger me-3 mt-1" style="min-width: 40px; font-size: 0.9rem;">{{i + 1}}</span>
                <div class="flex-grow-1">
                  <!-- Encabezado: Fila X: Columna Y -->
                  <div class="mb-2">
                    <span class="fw-bold text-dark" style="font-size: 1.1rem;">
                      <i class="fas fa-table text-success me-1"></i>
                      {{getFilaNumero(error)}}:
                    </span>
                    <span class="text-danger fw-bold ms-1" style="font-size: 1.1rem;">
                      Columna "{{getColumna(error)}}"
                    </span>
                  </div>
                  
                  <!-- Descripción del error -->
                  <div class="text-muted">
                    <i class="fas fa-info-circle me-1"></i>
                    {{getDescripcionError(error)}}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Resumen de tipos de errores -->
          <div class="mt-3 p-3 bg-light rounded">
            <div class="mb-2">
              <strong><i class="fas fa-chart-pie me-1"></i> Resumen de errores:</strong>
            </div>
            <div class="row g-2">
              <div class="col-md-4" *ngFor="let tipo of getErrorSummary()">
                <div class="d-flex align-items-center">
                  <span class="badge bg-secondary me-2">{{tipo.count}}</span>
                  <small>{{tipo.type}}</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Error general -->
        <div *ngIf="!result.success && result.message" class="alert alert-danger">
          <h6><i class="fas fa-times-circle me-1"></i> Error en el procesamiento</h6>
          <p class="mb-0">{{result.message}}</p>
          
          <!-- Botón de regreso en caso de error -->
          <div class="mt-3">
            <button 
              class="btn btn-outline-primary btn-sm"
              (click)="regresarAClientes()">
              <i class="fas fa-arrow-left me-1"></i>
              Regresar a Clientes
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ClientesUploadComponent {
  selectedFile: File | null = null;
  uploading = false;
  descargandoPlantilla = false;
  result: any = null;

  constructor(
    private clientesService: ClientesService,
    private router: Router,
    private route: ActivatedRoute,
    private notificationService: NotificationService
  ) {}

  /**
   * Maneja la selección de archivo
   * Valida el tipo y tamaño del archivo
   */
  onFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo (incluyendo CSV)
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
      'application/csv' // .csv (variante)
    ];

    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    const fileName = file.name.toLowerCase();
    const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));

    if (!allowedTypes.includes(file.type) && !hasValidExtension) {
      this.notificationService.warning(
        'Por favor selecciona un archivo válido (.xlsx, .xls o .csv)',
        'Formato no válido'
      );
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      this.notificationService.warning(
        'El archivo es demasiado grande. El tamaño máximo es 5MB.',
        'Archivo muy grande'
      );
      return;
    }

    this.selectedFile = file;
    this.result = null; // Limpiar resultados anteriores
  }

  /**
   * Sube y procesa el archivo Excel
   */
  uploadFile(): void {
    if (!this.selectedFile) {
      this.notificationService.warning('Por favor selecciona un archivo primero', 'Archivo requerido');
      return;
    }

    this.uploading = true;
    this.result = null;

    this.clientesService.uploadExcel(this.selectedFile).subscribe({
      next: (response) => {
        this.uploading = false;
        
        // Adaptar la respuesta para el template
        this.result = {
          success: response.success,
          insertados: response.data?.importados || 0,
          total: response.data?.creados?.length || 0,
          errores: response.data?.errores || [],
          message: response.message
        };
        
        // Mostrar notificación de éxito
        if (response.success) {
          const insertados = response.data?.importados || 0;
          if (insertados > 0) {
            this.notificationService.success(
              `Se importaron ${insertados} clientes correctamente`,
              'Importación exitosa'
            );
          }
          
          // Si hay errores, también mostrar una advertencia
          const errores = response.data?.errores?.length || 0;
          if (errores > 0) {
            this.notificationService.warning(
              `${errores} registros tuvieron errores. Revisa los detalles abajo.`,
              'Algunos errores encontrados'
            );
          }
          
          this.selectedFile = null;
          // Limpiar el input file
          const fileInput = document.getElementById('excelFile') as HTMLInputElement;
          if (fileInput) fileInput.value = '';
        }
      },
      error: (error) => {
        this.uploading = false;
        
        const errorMsg = error.error?.message || 'Error al procesar el archivo. Por favor intenta nuevamente.';
        
        this.result = {
          success: false,
          message: errorMsg
        };
        
        this.notificationService.error(errorMsg, 'Error en la importación');
      }
    });
  }

  /**
   * Limpia la selección de archivo
   */
  clearFile(): void {
    this.selectedFile = null;
    this.result = null;
    
    // Limpiar el input file
    const fileInput = document.getElementById('excelFile') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  /**
   * Formatea el tamaño del archivo para mostrar
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Regresa al módulo principal de clientes
   * Navega a la lista para ver los nuevos clientes registrados
   */
  regresarAClientes(): void {
    // Navegar de vuelta al listado de clientes (ruta relativa)
    this.router.navigate(['../'], { relativeTo: this.route });
  }

  /**
   * Descarga la plantilla Excel de ejemplo
   * Usa HttpClient para incluir el token de autenticación en la petición
   */
  descargarPlantilla(): void {
    this.descargandoPlantilla = true;

    this.clientesService.descargarPlantillaExcel().subscribe({

      next: (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'plantilla_clientes.xlsx';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        this.notificationService.info(
          'La plantilla se está descargando',
          'Descarga iniciada'
        );
        this.descargandoPlantilla = false;
      },
      error: () => {
        this.notificationService.error(
          'No se pudo descargar la plantilla',
          'Error de descarga'
        );
        this.descargandoPlantilla = false;
      }
    });
  }

  /**
   * Extrae el número de fila del mensaje de error
   */
  getFilaNumero(error: string): string {
    const match = error.match(/Fila (\d+):/);
    return match ? `Fila ${match[1]}` : 'Fila desconocida';
  }

  /**
   * Extrae la columna del mensaje de error
   */
  getColumna(error: string): string {
    // Buscar patrón "Columna "nombre_columna""
    const columnaMatch = error.match(/Columna "([^"]+)"/);
    if (columnaMatch) {
      return columnaMatch[1].charAt(0).toUpperCase() + columnaMatch[1].slice(1);
    }
    
    // Fallback: detectar por palabras clave
    if (error.includes('Nombre')) return 'nombre';
    if (error.includes('Teléfono') || error.includes('telefono')) return 'telefono';
    if (error.includes('correo') || error.includes('Email') || error.includes('email')) return 'correo';
    if (error.includes('RFC') || error.includes('rfc')) return 'rfc';
    if (error.includes('uso cfdi') || error.includes('CFDI')) return 'uso cfdi';
    if (error.includes('regimen fiscal') || error.includes('régimen')) return 'regimen fiscal';
    if (error.includes('direccion de entrega')) return 'direccion de entrega';
    if (error.includes('direccion facturacion')) return 'direccion';
    if (error.includes('direccion') || error.includes('dirección')) return 'direccion';
    
    return 'Campo no especificado';
  }

  /**
   * Extrae la descripción limpia del error
   */
  getDescripcionError(error: string): string {
    // Remover el prefijo "Fila X:"
    let descripcion = error.replace(/^Fila \d+:\s*/, '');
    
    // Si tiene el formato "Columna "xxx" - descripción", extraer solo la descripción
    const match = descripcion.match(/Columna "[^"]+" - (.+)$/);
    if (match) {
      return match[1];
    }
    
    return descripcion;
  }

  /**
   * Genera un resumen agrupado de errores por tipo
   */
  getErrorSummary(): Array<{type: string, count: number}> {
    if (!this.result?.errores) return [];
    
    const contadores: {[key: string]: number} = {};
    
    this.result.errores.forEach((error: string) => {
      const columna = this.getColumna(error);
      contadores[columna] = (contadores[columna] || 0) + 1;
    });
    
    return Object.entries(contadores)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count); // Ordenar por cantidad descendente
  }

  /**
   * Obtiene el título del error (DEPRECATED - usar getColumna)
   */
  getErrorTitle(error: string): string {
    return this.getColumna(error);
  }

  /**
   * Obtiene la descripción del error (DEPRECATED - usar getDescripcionError)
   */
  getErrorDescription(error: string): string {
    return this.getDescripcionError(error);
  }

  /**
   * Obtiene los tipos únicos de errores (DEPRECATED - usar getErrorSummary)
   */
  getErrorTypes(): string[] {
    if (!this.result?.errores) return [];
    
    const tipos = new Set<string>();
    this.result.errores.forEach((error: string) => {
      tipos.add(this.getColumna(error));
    });
    
    return Array.from(tipos);
  }
}
