/**
 * Componente para carga masiva de empleados desde archivo Excel
 * Permite subir archivos .xlsx/.xls con validación y feedback de progreso
 */

import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { EmpleadosService } from '../../services/empleados.service';

@Component({
  selector: 'app-empleados-upload',
  template: `
    <div class="p-4">
      <h3 class="mb-3">
        <i class="fas fa-file-excel text-success me-2"></i>
        Alta Masiva de Empleados
      </h3>
      
      <!-- Instrucciones -->
      <div class="alert alert-info">
        <h6><i class="fas fa-info-circle me-1"></i> Instrucciones:</h6>
        <p class="mb-2">El archivo Excel debe contener las siguientes columnas exactas:</p>
        <ul class="mb-0">
          <li><strong>nombre</strong> - Nombre completo del empleado (requerido)</li>
          <li><strong>telefono</strong> - Teléfono principal (requerido)</li>
          <li><strong>email</strong> - Email del empleado</li>
          <li><strong>puesto</strong> - Puesto del empleado</li>
          <li><strong>departamento</strong> - Departamento donde trabaja</li>
          <li><strong>salario</strong> - Salario mensual (número)</li>
          <li><strong>fechaIngreso</strong> - Fecha de ingreso (YYYY-MM-DD)</li>
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
        <div *ngIf="result.imported > 0" class="alert alert-success">
          <h6><i class="fas fa-check-circle me-1"></i> ¡Importación exitosa!</h6>
          <p class="mb-2">Se importaron <strong>{{result.imported}}</strong> empleados correctamente.</p>
          <button class="btn btn-success btn-sm" (click)="goToList()">
            <i class="fas fa-list me-1"></i>
            Ver lista de empleados
          </button>
        </div>

        <!-- Errores -->
        <div *ngIf="result.errors && result.errors.length > 0" class="alert alert-warning">
          <h6><i class="fas fa-exclamation-triangle me-1"></i> Errores encontrados:</h6>
          <ul class="mb-2">
            <li *ngFor="let error of result.errors">{{error}}</li>
          </ul>
          <small class="text-muted">
            Los empleados con errores no fueron importados. Corrija los datos y vuelva a intentar.
          </small>
        </div>

        <!-- Sin resultados -->
        <div *ngIf="result.imported === 0 && (!result.errors || result.errors.length === 0)" class="alert alert-info">
          <h6><i class="fas fa-info-circle me-1"></i> Sin datos para importar</h6>
          <p class="mb-0">No se encontraron datos válidos en el archivo para importar.</p>
        </div>
      </div>

      <!-- Ejemplo de plantilla -->
      <div class="card mt-4">
        <div class="card-header">
          <h6 class="mb-0">
            <i class="fas fa-download me-1"></i>
            Plantilla de ejemplo
          </h6>
        </div>
        <div class="card-body">
          <p class="text-muted mb-3">
            Descargue una plantilla de ejemplo para facilitar la carga masiva de empleados:
          </p>
          <button class="btn btn-outline-success" (click)="downloadTemplate()">
            <i class="fas fa-file-excel me-1"></i>
            Descargar plantilla Excel
          </button>
        </div>
      </div>

      <!-- Botones de navegación -->
      <div class="mt-4">
        <button class="btn btn-outline-primary" (click)="goBack()">
          <i class="fas fa-arrow-left me-1"></i>
          Volver a empleados
        </button>
      </div>
    </div>
  `
})
export class EmpleadosUploadComponent {
  selectedFile: File | null = null;
  uploading = false;
  result: any = null;

  constructor(
    private empleadosService: EmpleadosService,
    private router: Router
  ) {}

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      // Validar tipo de archivo
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv'
      ];
      
      if (allowedTypes.includes(file.type) || file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) {
        this.selectedFile = file;
        this.result = null; // Limpiar resultados anteriores
      } else {
        alert('Por favor seleccione un archivo Excel (.xlsx, .xls) o CSV (.csv)');
        this.clearFile();
      }
    }
  }

  uploadFile() {
    if (!this.selectedFile) {
      alert('Por favor seleccione un archivo');
      return;
    }

    this.uploading = true;
    this.result = null;

    this.empleadosService.uploadExcel(this.selectedFile).subscribe({
      next: (response) => {
        console.log('Upload response:', response);
        this.result = response;
        this.uploading = false;
        this.clearFile(); // Limpiar selector después del éxito
      },
      error: (error) => {
        console.error('Upload error:', error);
        this.uploading = false;
        
        // Manejar diferentes tipos de error
        let errorMessage = 'Error al procesar el archivo';
        if (error.error && error.error.message) {
          errorMessage = error.error.message;
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        this.result = {
          imported: 0,
          errors: [errorMessage],
          message: 'Error en la carga masiva'
        };
      }
    });
  }

  clearFile() {
    this.selectedFile = null;
    const fileInput = document.getElementById('excelFile') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  downloadTemplate() {
    // Crear datos de ejemplo para la plantilla
    const templateData = [
      {
        nombre: 'Juan Pérez García',
        telefono: '555-123-4567',
        email: 'juan.perez@supercopias.com',
        puesto: 'gerente',
        departamento: 'Administración',
        salario: 25000,
        fechaIngreso: '2023-01-15'
      },
      {
        nombre: 'María Elena Sánchez',
        telefono: '555-234-5678',
        email: 'maria.sanchez@supercopias.com',
        puesto: 'cajero',
        departamento: 'Ventas',
        salario: 12000,
        fechaIngreso: '2023-06-20'
      },
      {
        nombre: 'Carlos Martínez Ruiz',
        telefono: '555-345-6789',
        email: 'carlos.martinez@supercopias.com',
        puesto: 'supervisor',
        departamento: 'Operaciones',
        salario: 18000,
        fechaIngreso: '2023-03-10'
      }
    ];

    // Convertir a CSV para descarga
    const csvContent = this.convertToCSV(templateData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'plantilla_empleados.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    
    const csvRows = data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escapar comillas y envolver en comillas si contiene comas
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return '"' + value.replace(/"/g, '""') + '"';
        }
        return value;
      }).join(',')
    );
    
    return [csvHeaders, ...csvRows].join('\\n');
  }

  goToList() {
    this.router.navigate(['/admin/empleados']);
  }

  goBack() {
    this.router.navigate(['/admin/empleados']);
  }
}