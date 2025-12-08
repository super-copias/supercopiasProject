import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, finalize, switchMap, takeUntil } from 'rxjs/operators';
import { Router } from '@angular/router';
import { InventariosService } from '../../../../services/inventarios.service';
import { NotificationService } from '../../../../services/notification.service';

@Component({
  selector: 'app-inventarios-list',
  templateUrl: './inventarios-list.component.html',
  styleUrls: ['./inventarios-list.component.scss']
})
export class InventariosListComponent implements OnInit, OnDestroy {
  inventarios: any[] = [];
  alertas: any[] = [];
  estadisticas: any = null;
  mostrarAlertas = true;
  Math = Math;
  q = '';
  searchTerm = '';
  loading = false;
  loadingStats = false;
  pageChange$ = new Subject<number>();
  private destroy$ = new Subject<void>();
  private pageSub: Subscription | null = null;
  page = 1;
  limit = 10;
  total = 0;
  pages = 1;
  
  // Filtros
  filtroTipo = '';
  filtroCategoria = '';
  filtroStockNivel = '';
  mostrarArchivados = false;
  
  // Catálogos
  categorias: any[] = [];
  
  constructor(
    private inventariosService: InventariosService,
    private router: Router,
    private notificationService: NotificationService
  ) { }
  
  ngOnInit() {
    // Cargar categorías primero
    this.loadCategorias();
    
    // Cargar estadísticas
    this.loadEstadisticas();
    
    // Cargar alertas
    this.loadAlertas();
    
    this.pageSub = this.pageChange$.pipe(
      debounceTime(150),
      switchMap(page => {
        this.page = page;
        return this.loadData();
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (r: any) => { 
        this.handleResponse(r);
      },
      error: (error) => {
        this.handleError(error);
      }
    });

    this.load();
  }
  
  ngOnDestroy() { 
    this.destroy$.next();
    this.destroy$.complete();
    if (this.pageSub) this.pageSub.unsubscribe();
  }
  
  private loadData() {
    this.loading = true;
    const filters = {
      q: this.q,
      tipo: this.filtroTipo,
      categoria: this.filtroCategoria,
      stockNivel: this.filtroStockNivel,
      incluirArchivados: this.mostrarArchivados,
      page: this.page,
      limit: this.limit
    };
    
    return this.inventariosService.getInventarios(filters).pipe(
      takeUntil(this.destroy$),
      finalize(() => this.loading = false)
    );
  }
  
  private handleResponse(r: any) {
    if (r.success) {
      this.inventarios = r.data || [];
      this.total = r.pagination?.total || 0;
      this.pages = r.pagination?.pages || 1;
    } else {
      this.inventarios = [];
      this.total = 0;
      this.pages = 1;
    }
  }
  
  private handleError(error: any) {
    console.error('Error al cargar inventarios:', error);
    this.notificationService.error('Error al cargar inventarios');
    this.inventarios = [];
    this.total = 0;
    this.pages = 1;
  }
  
  loadEstadisticas() {
    this.loadingStats = true;
    this.inventariosService.getStats().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.estadisticas = response.data;
        }
        this.loadingStats = false;
      },
      error: (err) => {
        console.error('Error al cargar estadísticas:', err);
        this.loadingStats = false;
      }
    });
  }

  loadAlertas() {
    this.inventariosService.getAlertas().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.alertas = response.data;
          this.mostrarAlertas = this.alertas.length > 0;
        }
      },
      error: (err) => {
        console.error('Error al cargar alertas:', err);
        this.alertas = [];
      }
    });
  }
  
  loadCategorias() {
    // Cargar todas las categorías (sin filtro de tipo)
    this.inventariosService.getCategorias('').subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.categorias = response.data;
        }
      },
      error: (err) => {
        console.error('Error al cargar categorías:', err);
        this.categorias = [];
      }
    });
  }
  
  ocultarAlertas() {
    this.mostrarAlertas = false;
  }

  onVerAlerta(alerta: any) {
    this.router.navigate(['/admin/inventarios/detalle', alerta.id]);
  }
  
  load() {
    this.page = 1;
    this.loadData().subscribe({
      next: r => this.handleResponse(r),
      error: e => this.handleError(e)
    });
  }
  
  onSearch() {
    this.q = this.searchTerm.trim();
    this.load();
  }
  
  onClearSearch() {
    this.searchTerm = '';
    this.q = '';
    this.load();
  }
  
  onFilterChange() {
    if (this.filtroTipo) {
      this.loadCategorias();
    } else {
      this.filtroCategoria = '';
      this.categorias = [];
    }
    this.load();
  }
  
  go(p: number) {
    if (p >= 1 && p <= this.pages) {
      this.pageChange$.next(p);
    }
  }
  
  onNuevo() {
    this.router.navigate(['/admin/inventarios/nuevo']);
  }
  
  onVer(inventario: any) {
    this.router.navigate(['/admin/inventarios/detalle', inventario.id]);
  }
  
  onEditar(inventario: any) {
    this.router.navigate(['/admin/inventarios/editar', inventario.id]);
  }
  
  onArchivar(inventario: any) {
    const mensaje = `¿Está seguro de archivar el artículo "${inventario.nombre}"?\n\nEl artículo quedará oculto pero conservará su historial de movimientos.\nPodrá restaurarlo posteriormente desde artículos archivados.`;
    
    if (!confirm(mensaje)) {
      return;
    }
    
    this.inventariosService.archivarInventario(inventario.id, true).subscribe({
      next: (response) => {
        this.notificationService.success(response.message || 'Artículo archivado correctamente');
        this.load();
        this.loadEstadisticas();
        this.loadAlertas();
      },
      error: (err) => {
        console.error('Error al archivar artículo:', err);
        const mensaje = err.error?.error?.message || err.error?.message || 'Error al archivar artículo';
        this.notificationService.error(mensaje);
      }
    });
  }

  onRestaurar(inventario: any) {
    const mensaje = `¿Restaurar el artículo "${inventario.nombre}"?\n\nEl artículo volverá a estar visible en el inventario activo.`;
    
    if (!confirm(mensaje)) {
      return;
    }
    
    this.inventariosService.archivarInventario(inventario.id, false).subscribe({
      next: (response) => {
        this.notificationService.success(response.message || 'Artículo restaurado correctamente');
        this.load();
        this.loadEstadisticas();
      },
      error: (err) => {
        console.error('Error al restaurar artículo:', err);
        const mensaje = err.error?.error?.message || err.error?.message || 'Error al restaurar artículo';
        this.notificationService.error(mensaje);
      }
    });
  }

  toggleArchivados() {
    this.mostrarArchivados = !this.mostrarArchivados;
    this.page = 1;
    this.load();
  }
  
  onEliminar(inventario: any) {
    const mensaje = `¿Está seguro de eliminar PERMANENTEMENTE el artículo "${inventario.nombre}"?\n\nEsta acción NO se puede deshacer y el registro será eliminado de la base de datos.\n\nNOTA: No se pueden eliminar artículos con movimientos registrados.\n\n⚠️ RECOMENDACIÓN: Use "Archivar" en lugar de eliminar para conservar el historial.`;
    
    if (!confirm(mensaje)) {
      return;
    }
    
    this.inventariosService.deleteInventario(inventario.id).subscribe({
      next: () => {
        this.notificationService.success('Artículo eliminado permanentemente');
        this.load();
        this.loadEstadisticas();
        this.loadAlertas();
      },
      error: (err) => {
        console.error('Error al eliminar artículo:', err);
        // Extraer mensaje del backend
        const mensaje = err.error?.error?.message || err.error?.message || 'Error al eliminar artículo';
        this.notificationService.error(mensaje);
      }
    });
  }
  
  getStockBadge(inventario: any): string {
    return this.inventariosService.getStockBadgeClass(inventario.nivel_stock);
  }
  
  getStockLabel(inventario: any): string {
    return this.inventariosService.getStockLabel(inventario.nivel_stock);
  }
  
  getTipoIcon(tipo: string): string {
    return this.inventariosService.getTipoIcon(tipo);
  }
  
  formatCurrency(value: number): string {
    return value ? `$${value.toFixed(2)}` : 'N/A';
  }

  formatQuantity(value: number | null | undefined): string {
    if (value === null || value === undefined) return '0';
    const num = Number(value);
    return Number.isInteger(num) ? num.toString() : num.toFixed(2);
  }

  formatLabel(value: string): string {
    if (!value) return '';
    // Capitalizar y reemplazar guiones bajos con espacios
    return value
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  getCaracteristicasArray(item: any): Array<{key: string, value: string}> {
    if (!item.caracteristicas) return [];
    
    let caracteristicas = item.caracteristicas;
    
    // Si es string JSON, parsearlo
    if (typeof caracteristicas === 'string') {
      try {
        caracteristicas = JSON.parse(caracteristicas);
      } catch (e) {
        console.error('Error parseando caracteristicas:', e);
        return [];
      }
    }
    
    // Buscar la categoría del item para obtener las etiquetas
    const categoria = this.categorias.find(c => c.nombre === item.categoria);
    const camposCategoria = categoria?.campos_requeridos || [];
    
    // Convertir objeto a array de key-value, usando etiquetas reales
    return Object.keys(caracteristicas)
      .filter(key => caracteristicas[key] && caracteristicas[key].toString().trim() !== '')
      .map(key => {
        // Buscar la etiqueta real del campo en la categoría
        const campoInfo = camposCategoria.find((campo: any) => campo.nombre === key);
        const etiqueta = campoInfo?.etiqueta || this.formatLabel(key);
        
        return {
          key: etiqueta,
          value: caracteristicas[key]
        };
      });
  }
}
