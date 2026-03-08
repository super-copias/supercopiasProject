import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { InventariosService, Inventario, Movimiento } from '../../../../services/inventarios.service';
import { NotificationService } from '../../../../services/notification.service';

@Component({
  selector: 'app-inventario-detalle',
  templateUrl: './inventario-detalle.component.html',
  styleUrls: ['./inventario-detalle.component.scss']
})
export class InventarioDetalleComponent implements OnInit {
  loading = false;
  inventarioId: number | null = null;
  inventario: Inventario | null = null;
  
  // Exponer Object.keys para usar en el template
  Object = Object;
  
  // Pestañas
  activeTab = 'info'; // 'info', 'caracteristicas', 'movimientos', 'estadisticas'
  
  // Movimientos
  movimientos: Movimiento[] = [];
  movimientosLoading = false;
  movimientosPage = 1;
  movimientosLimit = 10;
  movimientosTotal = 0;
  movimientosPages = 0;
  
  // Formulario de movimiento
  showMovimientoForm = false;
  movimientoForm: any = {
    tipo_movimiento: '',
    concepto: '',
    cantidad: 0,
    notas: ''
  };

  // Opciones para el formulario de movimiento
  tiposMovimiento = [
    { value: 'entrada', label: 'Entrada', icon: 'fa-arrow-up', class: 'success' },
    { value: 'salida', label: 'Salida', icon: 'fa-arrow-down', class: 'danger' },
    { value: 'ajuste', label: 'Ajuste', icon: 'fa-sync', class: 'warning' }
  ];

  conceptos = {
    entrada: [
      { value: 'compra', label: 'Compra' },
      { value: 'devolucion', label: 'Devolución' },
      { value: 'ajuste_entrada', label: 'Ajuste Entrada' }
    ],
    salida: [
      { value: 'venta', label: 'Venta' },
      { value: 'uso_operativo', label: 'Uso Operativo' },
      { value: 'servicio_tecnico', label: 'Servicio Técnico' },
      { value: 'merma', label: 'Merma' },
      { value: 'ajuste_salida', label: 'Ajuste Salida' },
      { value: 'transferencia', label: 'Transferencia' }
    ],
    ajuste: [
      { value: 'ajuste_entrada', label: 'Ajuste Entrada' },
      { value: 'ajuste_salida', label: 'Ajuste Salida' }
    ]
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private inventariosService: InventariosService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.inventarioId = +params['id'];
        this.loadInventario();
        this.loadMovimientos();
      }
    });
  }

  loadInventario(): void {
    if (!this.inventarioId) return;
    
    this.loading = true;
    this.inventariosService.getInventarioById(this.inventarioId).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          this.inventario = response.data;
          
          // Si características es un string JSON, parsearlo
          if (this.inventario.caracteristicas && typeof this.inventario.caracteristicas === 'string') {
            try {
              this.inventario.caracteristicas = JSON.parse(this.inventario.caracteristicas);
            } catch (e) {
              console.error('Error al parsear características:', e);
              this.inventario.caracteristicas = {};
            }
          }
        }
      },
      error: (error) => {
        this.loading = false;
        this.notificationService.error('Error al cargar el artículo');
        console.error('Error:', error);
      }
    });
  }

  loadMovimientos(): void {
    if (!this.inventarioId) return;
    
    this.movimientosLoading = true;
    this.inventariosService.getMovimientos(
      this.inventarioId,
      { page: this.movimientosPage, limit: this.movimientosLimit }
    ).subscribe({
      next: (response) => {
        this.movimientosLoading = false;
        if (response.success) {
          this.movimientos = response.data || [];
          if (response.pagination) {
            this.movimientosTotal = response.pagination.total || 0;
            this.movimientosPages = response.pagination.pages || 0;
          }
        }
      },
      error: (error) => {
        this.movimientosLoading = false;
        console.error('Error cargando movimientos:', error);
      }
    });
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  onEditar(): void {
    if (this.inventarioId) {
      this.router.navigate(['/admin/inventarios/editar', this.inventarioId]);
    }
  }

  onVolver(): void {
    this.router.navigate(['/admin/inventarios']);
  }

  // =====================================================
  // Movimientos
  // =====================================================

  toggleMovimientoForm(): void {
    this.showMovimientoForm = !this.showMovimientoForm;
    if (this.showMovimientoForm) {
      this.resetMovimientoForm();
    }
  }

  resetMovimientoForm(): void {
    this.movimientoForm = {
      tipo_movimiento: '',
      concepto: '',
      cantidad: 0,
      notas: ''
    };
  }

  onTipoMovimientoChange(): void {
    // Resetear concepto al cambiar tipo
    this.movimientoForm.concepto = '';
  }

  getConceptosDisponibles(): { value: string; label: string; }[] {
    const tipo = this.movimientoForm.tipo_movimiento;
    return this.conceptos[tipo as keyof typeof this.conceptos] || [];
  }

  onGuardarMovimiento(): void {
    if (!this.inventarioId) return;
    
    // Validaciones
    if (!this.movimientoForm.tipo_movimiento) {
      this.notificationService.warning('Seleccione el tipo de movimiento');
      return;
    }
    
    if (!this.movimientoForm.concepto) {
      this.notificationService.warning('Seleccione el concepto');
      return;
    }
    
    if (!this.movimientoForm.cantidad || this.movimientoForm.cantidad <= 0) {
      this.notificationService.warning('Ingrese una cantidad válida');
      return;
    }

    this.loading = true;
    this.inventariosService.addMovimiento(this.inventarioId, this.movimientoForm).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          this.notificationService.success('Movimiento registrado correctamente');
          this.showMovimientoForm = false;
          this.loadInventario(); // Recargar para actualizar stock
          this.loadMovimientos(); // Recargar historial
        }
      },
      error: (error) => {
        this.loading = false;
        this.notificationService.error('Error al registrar el movimiento');
        console.error('Error:', error);
      }
    });
  }

  goMovimientos(page: number): void {
    if (page < 1 || page > this.movimientosPages) return;
    this.movimientosPage = page;
    this.loadMovimientos();
  }

  // =====================================================
  // Helpers
  // =====================================================

  getStockBadge(item: any): string {
    const existencia = item.existencia_actual || 0;
    const minimo = item.stock_minimo || 0;
    
    if (existencia === 0) {
      return 'badge bg-danger';
    } else if (existencia <= minimo) {
      return 'badge bg-warning text-dark';
    } else {
      return 'badge bg-success';
    }
  }

  getTipoIcon(tipo: string): string {
    switch (tipo) {
      case 'venta':
        return 'fas fa-shopping-cart text-success';
      case 'insumo':
        return 'fas fa-tools text-primary';
      case 'generico':
        return 'fas fa-cube text-secondary';
      default:
        return 'fas fa-box text-muted';
    }
  }

  getTipoMovimientoClass(tipo: string): string {
    switch (tipo) {
      case 'entrada':
        return 'text-success';
      case 'salida':
        return 'text-danger';
      case 'ajuste':
        return 'text-warning';
      default:
        return 'text-muted';
    }
  }

  getTipoMovimientoIcon(tipo: string): string {
    switch (tipo) {
      case 'entrada':
        return 'fas fa-arrow-up';
      case 'salida':
        return 'fas fa-arrow-down';
      case 'ajuste':
        return 'fas fa-sync';
      default:
        return 'fas fa-exchange-alt';
    }
  }

  formatCurrency(value: number | null | undefined): string {
    if (value === null || value === undefined) return 'N/A';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(value);
  }

  formatQuantity(value: number | null | undefined): string {
    if (value === null || value === undefined) return '0';
    // Mostrar sin decimales si es número entero
    const num = Number(value);
    return Number.isInteger(num) ? num.toString() : num.toFixed(2);
  }

  getTipoMovimientoLabel(tipo: string): string {
    const tipoObj = this.tiposMovimiento.find(t => t.value === tipo);
    return tipoObj ? tipoObj.label : tipo;
  }

  getConceptoLabel(concepto: string): string {
    const allConceptos = [
      ...this.conceptos.entrada,
      ...this.conceptos.salida,
      ...this.conceptos.ajuste
    ];
    const conceptoObj = allConceptos.find(c => c.value === concepto);
    return conceptoObj ? conceptoObj.label : concepto;
  }

  formatLabel(value: string): string {
    if (!value) return '';
    // Capitalizar y reemplazar guiones bajos con espacios
    return value
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  formatDate(date: Date | string | null | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  Math = Math;
}
