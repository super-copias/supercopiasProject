import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { InventariosService } from '../../../../services/inventarios.service';
import { NotificationService } from '../../../../services/notification.service';
import { ProveedoresService } from '../../../../services/proveedores.service';

@Component({
  selector: 'app-inventario-form',
  templateUrl: './inventario-form.component.html',
  styleUrls: ['./inventario-form.component.scss']
})
export class InventarioFormComponent implements OnInit {
  loading = false;
  isEditMode = false;
  inventarioId: number | null = null;

  // Datos del formulario
  inventario: any = {
    tipo: '',
    categoria: '',
    nombre: '',
    descripcion: '',
    codigo_sku: '',
    marca: '',
    modelo: '',
    unidad_medida: '',
    existencia_actual: 0,
    stock_minimo: 0,
    stock_maximo: 0,
    costo_compra: null,
    precio_venta: null,
    ubicacion_fisica: '',
    proveedor_id: null,
    caracteristicas: {},
    notas: ''
  };

  // Listas para los selects
  categorias: any[] = [];
  proveedores: any[] = [];
  
  // Campos dinámicos según categoría
  camposCategoria: any[] = [];
  
  // Tipos de inventario
  tipos = [
    { value: 'venta', label: 'Producto para Venta' },
    { value: 'insumo', label: 'Insumo Operativo' },
    { value: 'generico', label: 'Item Genérico' }
  ];

  // Unidades de medida comunes
  unidadesMedida = [
    { value: 'pieza', label: 'Pieza' },
    { value: 'paquete', label: 'Paquete' },
    { value: 'caja', label: 'Caja' },
    { value: 'resma', label: 'Resma' },
    { value: 'litro', label: 'Litro' },
    { value: 'kilogramo', label: 'Kilogramo' },
    { value: 'metro', label: 'Metro' },
    { value: 'rollo', label: 'Rollo' },
    { value: 'cartucho', label: 'Cartucho' },
    { value: 'toner', label: 'Tóner' },
    { value: 'unidad', label: 'Unidad' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private inventariosService: InventariosService,
    private notificationService: NotificationService,
    private proveedoresService: ProveedoresService
  ) {}

  ngOnInit(): void {
    this.loadCategorias();
    this.loadProveedores();
    
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode = true;
        this.inventarioId = +params['id'];
        // SOLO cargar el inventario si ya tenemos las categorías
        if (this.categorias.length > 0) {
          this.loadInventario(this.inventarioId);
        }
        // Si no, se cargará después cuando lleguen las categorías
      }
    });
  }

  loadCategorias(): void {
    this.inventariosService.getCategorias().subscribe({
      next: (response) => {
        if (response.success) {
          this.categorias = response.data || [];
          
          // Si estamos en modo edición y el inventario aún no se ha cargado, cargarlo ahora
          if (this.isEditMode && this.inventarioId && !this.inventario.id) {
            this.loadInventario(this.inventarioId);
          }
        }
      },
      error: (error) => {
        console.error('Error cargando categorías:', error);
      }
    });
  }

  loadProveedores(): void {
    this.proveedoresService.getList({ activo: true, limit: 1000 }).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.proveedores = response.data;
        }
      },
      error: (error) => {
        console.error('Error cargando proveedores:', error);
        this.notificationService.error('Error al cargar proveedores');
        this.proveedores = [];
      }
    });
  }

  loadInventario(id: number): void {
    this.loading = true;
    this.inventariosService.getInventarioById(id).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          this.inventario = response.data;
          
          // Si características es string JSON, parsearlo
          if (this.inventario.caracteristicas && typeof this.inventario.caracteristicas === 'string') {
            try {
              this.inventario.caracteristicas = JSON.parse(this.inventario.caracteristicas);
            } catch (e) {
              console.error('Error al parsear características:', e);
              this.inventario.caracteristicas = {};
            }
          }
          
          // Si no hay características, inicializar como objeto vacío
          if (!this.inventario.caracteristicas) {
            this.inventario.caracteristicas = {};
          }
          
          // Formatear precios al cargar
          this.formatPrecio('costo_compra');
          this.formatPrecio('precio_venta');
          
          // Cargar los campos de la categoría
          this.onCategoriaChange();
        }
      },
      error: (error) => {
        this.loading = false;
        this.notificationService.error('Error al cargar el artículo');
        console.error('Error:', error);
      }
    });
  }

  onTipoChange(): void {
    // Al cambiar tipo, resetear categoría
    this.inventario.categoria = '';
    this.camposCategoria = [];
    this.inventario.caracteristicas = {};
  }

  onCategoriaChange(): void {
    // Obtener campos dinámicos para la categoría seleccionada
    const categoriaSeleccionada = this.categorias.find(
      c => c.nombre === this.inventario.categoria
    );
    
    if (categoriaSeleccionada && categoriaSeleccionada.campos_requeridos) {
      this.camposCategoria = categoriaSeleccionada.campos_requeridos;
      
      // Inicializar características si no existen
      if (!this.inventario.caracteristicas) {
        this.inventario.caracteristicas = {};
      }
      
      // Agregar campos faltantes SOLO si no existen (preserva valores existentes)
      this.camposCategoria.forEach(campo => {
        if (!(campo.nombre in this.inventario.caracteristicas)) {
          this.inventario.caracteristicas[campo.nombre] = '';
        }
      });
    } else {
      this.camposCategoria = [];
    }
  }

  onSubmit(): void {
    // Validaciones básicas
    if (!this.inventario.tipo) {
      this.notificationService.warning('Seleccione un tipo de artículo');
      return;
    }
    
    if (!this.inventario.categoria) {
      this.notificationService.warning('Seleccione una categoría');
      return;
    }
    
    if (!this.inventario.nombre || this.inventario.nombre.trim() === '') {
      this.notificationService.warning('Ingrese el nombre del artículo');
      return;
    }
    
    if (!this.inventario.unidad_medida) {
      this.notificationService.warning('Seleccione una unidad de medida');
      return;
    }

    // Validar que existencia_actual sea un número válido
    if (this.inventario.existencia_actual === null || this.inventario.existencia_actual === undefined) {
      this.inventario.existencia_actual = 0;
    }

    // Validar que stock_minimo sea un número válido
    if (this.inventario.stock_minimo === null || this.inventario.stock_minimo === undefined) {
      this.inventario.stock_minimo = 0;
    }

    this.loading = true;
    
    if (this.isEditMode && this.inventarioId) {
      // Actualizar
      this.inventariosService.updateInventario(this.inventarioId, this.inventario).subscribe({
        next: (response) => {
          this.loading = false;
          if (response.success) {
            this.notificationService.success('Artículo actualizado correctamente');
            this.router.navigate(['/admin/inventarios']);
          }
        },
        error: (error) => {
          this.loading = false;
          this.notificationService.error('Error al actualizar el artículo');
          console.error('Error:', error);
        }
      });
    } else {
      // Crear nuevo
      this.inventariosService.createInventario(this.inventario).subscribe({
        next: (response) => {
          this.loading = false;
          if (response.success) {
            this.notificationService.success('Artículo creado correctamente');
            this.router.navigate(['/admin/inventarios']);
          }
        },
        error: (error) => {
          this.loading = false;
          this.notificationService.error('Error al crear el artículo');
          console.error('Error:', error);
        }
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/admin/inventarios']);
  }

  // Helper para obtener categorías filtradas por tipo
  getCategoriasFiltradas(): any[] {
    if (!this.inventario.tipo) {
      return [];
    }
    return this.categorias.filter(c => c.tipo === this.inventario.tipo);
  }

  // Helper para determinar el tipo de input de un campo dinámico
  getInputType(tipoCampo: string): string {
    switch (tipoCampo) {
      case 'numero':
        return 'number';
      case 'fecha':
        return 'date';
      case 'email':
        return 'email';
      default:
        return 'text';
    }
  }

  // Formatear precio al perder el foco (blur)
  formatPrecio(campo: 'costo_compra' | 'precio_venta'): void {
    const valor = this.inventario[campo];
    if (valor !== null && valor !== undefined && valor !== '') {
      const numerico = typeof valor === 'string' ? parseFloat(valor) : valor;
      if (!isNaN(numerico) && numerico >= 0) {
        this.inventario[campo] = numerico.toFixed(2);
      }
    }
  }
}
