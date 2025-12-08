import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { InventariosService, Categoria } from '../../../../services/inventarios.service';
import { NotificationService } from '../../../../services/notification.service';

@Component({
  selector: 'app-categorias-list',
  templateUrl: './categorias-list.component.html',
  styleUrls: ['./categorias-list.component.scss']
})
export class CategoriasListComponent implements OnInit {
  loading = false;
  categorias: Categoria[] = [];
  
  // Filtros
  filtroTipo = '';
  
  // Formulario de nueva categoría
  showForm = false;
  isEditMode = false;
  editingId: number | null = null;
  
  categoriaForm: any = {
    tipo: '',
    nombre: '',
    descripcion: '',
    campos_requeridos: [],
    orden: null
  };

  // Tipos disponibles
  tipos = [
    { value: 'venta', label: 'Productos para Venta', icon: 'fa-shopping-cart', color: 'success' },
    { value: 'insumo', label: 'Insumos Operativos', icon: 'fa-tools', color: 'primary' },
    { value: 'generico', label: 'Items Genéricos', icon: 'fa-cube', color: 'secondary' }
  ];

  // Campos dinámicos
  campoDinamico = {
    nombre: '',
    etiqueta: '',
    tipo: 'texto',
    requerido: false,
    opciones: ''
  };
  
  editandoCampoIndex: number | null = null;

  constructor(
    private router: Router,
    private inventariosService: InventariosService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadCategorias();
  }

  loadCategorias(): void {
    this.loading = true;
    this.inventariosService.getCategorias(this.filtroTipo || undefined).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          // Forzar nueva referencia del array para detectar cambios
          this.categorias = [...(response.data || [])];
        }
      },
      error: (error) => {
        this.loading = false;
        this.notificationService.error('Error al cargar categorías');
        console.error('Error:', error);
      }
    });
  }

  onFilterChange(): void {
    this.loadCategorias();
  }

  onNueva(): void {
    this.showForm = true;
    this.isEditMode = false;
    this.resetForm();
  }

  onEditar(categoria: Categoria): void {
    this.showForm = true;
    this.isEditMode = true;
    this.editingId = categoria.id || null;
    
    this.categoriaForm = {
      tipo: categoria.tipo,
      nombre: categoria.nombre,
      descripcion: categoria.descripcion || '',
      campos_requeridos: categoria.campos_requeridos || [],
      orden: categoria.orden
    };
  }

  onEliminar(categoria: Categoria): void {
    if (!categoria.id) return;
    
    const mensaje = `¿Está seguro de eliminar PERMANENTEMENTE la categoría "${categoria.nombre}"?\n\nEsta acción NO se puede deshacer y el registro será eliminado de la base de datos.\n\nNOTA: No se pueden eliminar categorías con artículos asociados.`;
    
    if (!confirm(mensaje)) {
      return;
    }
    
    this.loading = true;
    this.inventariosService.deleteCategoria(categoria.id).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          this.notificationService.success('Categoría eliminada permanentemente');
          this.loadCategorias();
        }
      },
      error: (error) => {
        this.loading = false;
        const mensaje = error.error?.error?.message || error.error?.message || 'Error al eliminar la categoría';
        this.notificationService.error(mensaje);
        console.error('Error:', error);
      }
    });
  }

  onSubmit(): void {
    // Validaciones
    if (!this.categoriaForm.tipo) {
      this.notificationService.warning('Seleccione un tipo');
      return;
    }
    
    if (!this.categoriaForm.nombre || this.categoriaForm.nombre.trim() === '') {
      this.notificationService.warning('Ingrese el nombre de la categoría');
      return;
    }

    this.loading = true;
    
    if (this.isEditMode && this.editingId) {
      // Actualizar
      this.inventariosService.updateCategoriaById(this.editingId, this.categoriaForm).subscribe({
        next: (response) => {
          this.loading = false;
          if (response.success) {
            this.notificationService.success('Categoría actualizada correctamente');
            this.resetForm();
            this.showForm = false;
            this.isEditMode = false;
            this.editingId = null;
            this.loadCategorias();
          }
        },
        error: (error) => {
          this.loading = false;
          const mensaje = error.error?.message || 'Error al actualizar la categoría';
          this.notificationService.error(mensaje);
          console.error('Error:', error);
        }
      });
    } else {
      // Crear
      this.inventariosService.createCategoria(this.categoriaForm).subscribe({
        next: (response) => {
          this.loading = false;
          if (response.success) {
            this.notificationService.success('Categoría creada correctamente');
            this.showForm = false;
            this.loadCategorias();
          }
        },
        error: (error) => {
          this.loading = false;
          const mensaje = error.error?.message || 'Error al crear la categoría';
          this.notificationService.error(mensaje);
          console.error('Error:', error);
        }
      });
    }
  }

  onCancelar(): void {
    this.showForm = false;
    this.resetForm();
  }

  resetForm(): void {
    this.categoriaForm = {
      tipo: '',
      nombre: '',
      descripcion: '',
      campos_requeridos: [],
      orden: null
    };
    this.editingId = null;
  }

  // Gestión de campos dinámicos
  agregarCampoDinamico(): void {
    if (!this.campoDinamico.etiqueta) {
      this.notificationService.warning('La etiqueta del campo es requerida');
      return;
    }

    const campo: any = {
      nombre: this.generarNombreTecnico(this.campoDinamico.etiqueta), // Generar automáticamente
      etiqueta: this.campoDinamico.etiqueta,
      tipo: this.campoDinamico.tipo,
      requerido: this.campoDinamico.requerido
    };

    // Si tiene opciones, convertir a array
    if (this.campoDinamico.opciones) {
      campo.opciones = this.campoDinamico.opciones.split(',').map((o: string) => o.trim());
    }

    this.categoriaForm.campos_requeridos.push(campo);
    
    // Reset
    this.campoDinamico = {
      nombre: '',
      etiqueta: '',
      tipo: 'texto',
      requerido: false,
      opciones: ''
    };
  }

  eliminarCampoDinamico(index: number): void {
    this.categoriaForm.campos_requeridos.splice(index, 1);
  }
  
  editarCampoDinamico(index: number): void {
    const campo = this.categoriaForm.campos_requeridos[index];
    this.editandoCampoIndex = index;
    this.campoDinamico = {
      nombre: campo.nombre,
      etiqueta: campo.etiqueta,
      tipo: campo.tipo,
      requerido: campo.requerido,
      opciones: campo.opciones ? campo.opciones.join(', ') : ''
    };
  }
  
  actualizarCampoDinamico(): void {
    if (!this.campoDinamico.etiqueta) {
      this.notificationService.warning('La etiqueta del campo es requerida');
      return;
    }
    
    const campo: any = {
      nombre: this.generarNombreTecnico(this.campoDinamico.etiqueta),
      etiqueta: this.campoDinamico.etiqueta,
      tipo: this.campoDinamico.tipo,
      requerido: this.campoDinamico.requerido
    };
    
    if (this.campoDinamico.opciones) {
      campo.opciones = this.campoDinamico.opciones.split(',').map((o: string) => o.trim());
    }
    
    if (this.editandoCampoIndex !== null) {
      this.categoriaForm.campos_requeridos[this.editandoCampoIndex] = campo;
      this.editandoCampoIndex = null;
    }
    
    // Reset
    this.campoDinamico = {
      nombre: '',
      etiqueta: '',
      tipo: 'texto',
      requerido: false,
      opciones: ''
    };
  }
  
  cancelarEdicionCampo(): void {
    this.editandoCampoIndex = null;
    this.campoDinamico = {
      nombre: '',
      etiqueta: '',
      tipo: 'texto',
      requerido: false,
      opciones: ''
    };
  }

  volver(): void {
    this.router.navigate(['/admin/inventarios']);
  }

  // Generar nombre técnico desde etiqueta
  generarNombreTecnico(etiqueta: string): string {
    if (!etiqueta) return '';
    return etiqueta
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Quitar tildes
      .replace(/[^a-z0-9\s]/g, '') // Quitar caracteres especiales
      .trim()
      .replace(/\s+/g, '_'); // Reemplazar espacios por guiones bajos
  }

  // Helpers
  getTipoInfo(tipo: string): any {
    return this.tipos.find(t => t.value === tipo) || { label: tipo, icon: 'fa-tag', color: 'secondary' };
  }

  getTipoBadge(tipo: string): string {
    const info = this.getTipoInfo(tipo);
    return `badge bg-${info.color}`;
  }

  getCantidadPorTipo(tipo: string): number {
    return this.categorias.filter(c => c.tipo === tipo).length;
  }
}
