import { Component } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ClientesService } from '../../services/clientes.service';

/**
 * Componente para carga masiva de clientes desde archivo Excel
 * Permite subir archivos .xlsx/.xls con validación y feedback de progreso
 */
@Component({
  selector: 'app-clientes-upload',
  template: `
    <div class="p-4">
      <h3 class="mb-3">
        <i class="fas fa-file-excel text-success me-2"></i>
        Alta Masiva de Clientes
      </h3>
      
      <!-- Instrucciones -->
      <div class="alert alert-info">
        <h6><i class="fas fa-info-circle me-1"></i> Instrucciones:</h6>
        <p class="mb-2">El archivo Excel debe contener las siguientes columnas exactas:</p>
        <ul class="mb-0">
          <li><strong>nombre</strong> - Nombre del cliente (requerido)</li>
          <li><strong>telefono</strong> - Teléfono principal (requerido)</li>
          <li><strong>segundo telefono</strong> - Teléfono secundario</li>
          <li><strong>correo</strong> - Email del cliente</li>
          <li><strong>direccion</strong> - Dirección completa</li>
          <li><strong>razon social</strong> - Razón social para facturación</li>
          <li><strong>rfc</strong> - RFC para facturación</li>
          <li><strong>regimen fiscal</strong> - Régimen fiscal</li>
          <li><strong>codigo postal</strong> - Código postal</li>
          <li><strong>uso cfdi</strong> - Uso CFDI (código como G01, D01, etc.)</li>
        </ul>
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
          <p class="mb-2">
            <strong>{{result.errores.length}}</strong> registros con errores no fueron procesados:
          </p>
          <ul class="mb-0">
            <li *ngFor="let error of result.errores">
              <strong>Fila {{error.fila}}:</strong> {{error.mensaje}}
            </li>
          </ul>
        </div>

        <!-- Error general -->
        <div *ngIf="!result.success && result.message" class="alert alert-danger">
          <h6><i class="fas fa-times-circle me-1"></i> Error en el procesamiento</h6>
          <p class="mb-0">{{result.message}}</p>
        </div>
      </div>
    </div>
  `
})
export class ClientesUploadComponent {
  selectedFile: File | null = null;
  uploading = false;
  result: any = null;

  constructor(
    private clientesService: ClientesService,
    private router: Router,
    private route: ActivatedRoute
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
      alert('Por favor selecciona un archivo válido (.xlsx, .xls o .csv)');
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('El archivo es demasiado grande. El tamaño máximo es 5MB.');
      return;
    }

    this.selectedFile = file;
    this.result = null; // Limpiar resultados anteriores
  }

  /**
   * Sube y procesa el archivo Excel
   */
  uploadFile(): void {
    if (!this.selectedFile) return;

    console.log('🚀 Iniciando upload de archivo:', this.selectedFile.name);
    console.log('📁 Tipo MIME:', this.selectedFile.type);
    console.log('📏 Tamaño:', this.selectedFile.size);

    this.uploading = true;
    this.result = null;

    this.clientesService.uploadExcel(this.selectedFile).subscribe({
      next: (response) => {
        console.log('✅ Respuesta del servidor:', response);
        this.uploading = false;
        this.result = response;
        
        // Si fue exitoso, limpiar la selección
        if (response.success) {
          this.selectedFile = null;
          // Limpiar el input file
          const fileInput = document.getElementById('excelFile') as HTMLInputElement;
          if (fileInput) fileInput.value = '';
        }
      },
      error: (error) => {
        console.error('❌ Error uploading file:', error);
        this.uploading = false;
        
        this.result = {
          success: false,
          message: error.error?.message || 'Error al procesar el archivo. Por favor intenta nuevamente.'
        };
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
}
