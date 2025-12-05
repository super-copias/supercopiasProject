import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { InventariosService, ReglasStock } from '../../../../services/inventarios.service';

@Component({
  selector: 'app-reglas-stock',
  templateUrl: './reglas-stock.component.html',
  styleUrls: ['./reglas-stock.component.scss']
})
export class ReglasStockComponent implements OnInit {
  inventarioId: number = 0;
  inventarioNombre: string = '';
  loading: boolean = false;
  saving: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  reglas: Partial<ReglasStock> = {
    nivel_critico_porcentaje: 0,
    nivel_bajo_porcentaje: 10,
    nivel_normal_porcentaje: 30,
    usar_stock_maximo: true,
    alerta_critico_activa: true,
    alerta_bajo_activa: true,
    alerta_sobrestock_activa: false,
    umbral_sobrestock_porcentaje: 0,
    notificar_usuarios: null,
    observaciones: ''
  };

  tieneReglasPersonalizadas: boolean = false;
  stockMinimo: number = 0;
  stockMaximo: number | null = null;

  // Cálculos en tiempo real
  umbralBajo: number = 0;
  umbralNormal: number = 0;
  umbralSobrestock: number = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private inventariosService: InventariosService
  ) {}

  ngOnInit(): void {
    this.inventarioId = parseInt(this.route.snapshot.paramMap.get('id') || '0');
    if (this.inventarioId) {
      this.cargarReglas();
    } else {
      this.errorMessage = 'ID de inventario inválido';
    }
  }

  cargarReglas(): void {
    this.loading = true;
    this.errorMessage = '';

    this.inventariosService.getReglasStock(this.inventarioId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.reglas = response.data;
          this.tieneReglasPersonalizadas = response.data.tiene_reglas_personalizadas || false;
          this.stockMinimo = response.data.stock_minimo || 0;
          this.stockMaximo = response.data.stock_maximo || null;
          this.calcularUmbrales();
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar reglas:', error);
        this.errorMessage = error.error?.error?.message || 'Error al cargar reglas de stock';
        this.loading = false;
      }
    });
  }

  calcularUmbrales(): void {
    if (this.reglas.usar_stock_maximo && this.stockMaximo) {
      // Modo 1: Con stock_maximo
      const rango = this.stockMaximo - this.stockMinimo;
      this.umbralBajo = this.stockMinimo + (rango * ((this.reglas.nivel_bajo_porcentaje || 0) / 100));
      this.umbralNormal = this.stockMinimo + (rango * ((this.reglas.nivel_normal_porcentaje || 0) / 100));
      this.umbralSobrestock = this.stockMaximo + (this.stockMaximo * ((this.reglas.umbral_sobrestock_porcentaje || 0) / 100));
    } else {
      // Modo 2: Solo stock_minimo
      this.umbralBajo = this.stockMinimo * (1 + (this.reglas.nivel_bajo_porcentaje || 0) / 100);
      this.umbralNormal = this.stockMinimo * (1 + (this.reglas.nivel_normal_porcentaje || 0) / 100);
      this.umbralSobrestock = 0;
    }
  }

  onCambioModo(): void {
    this.calcularUmbrales();
  }

  onCambioPorcentaje(): void {
    this.calcularUmbrales();
  }

  guardarReglas(): void {
    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    // Validaciones
    if ((this.reglas.nivel_critico_porcentaje || 0) > (this.reglas.nivel_bajo_porcentaje || 0) ||
        (this.reglas.nivel_bajo_porcentaje || 0) > (this.reglas.nivel_normal_porcentaje || 0)) {
      this.errorMessage = 'Los porcentajes deben estar en orden: crítico ≤ bajo ≤ normal';
      this.saving = false;
      return;
    }

    const operacion = this.tieneReglasPersonalizadas
      ? this.inventariosService.updateReglasStock(this.inventarioId, this.reglas)
      : this.inventariosService.createReglasStock(this.inventarioId, this.reglas);

    operacion.subscribe({
      next: (response) => {
        if (response.success) {
          this.successMessage = response.message || 'Reglas guardadas correctamente';
          this.tieneReglasPersonalizadas = true;
          setTimeout(() => {
            this.volver();
          }, 1500);
        }
        this.saving = false;
      },
      error: (error) => {
        console.error('Error al guardar reglas:', error);
        this.errorMessage = error.error?.error?.message || 'Error al guardar reglas de stock';
        this.saving = false;
      }
    });
  }

  restaurarValores(): void {
    if (confirm('¿Está seguro de restaurar los valores por defecto? Se perderán los cambios no guardados.')) {
      this.reglas = {
        nivel_critico_porcentaje: 0,
        nivel_bajo_porcentaje: 10,
        nivel_normal_porcentaje: 30,
        usar_stock_maximo: true,
        alerta_critico_activa: true,
        alerta_bajo_activa: true,
        alerta_sobrestock_activa: false,
        umbral_sobrestock_porcentaje: 0,
        notificar_usuarios: null,
        observaciones: ''
      };
      this.calcularUmbrales();
    }
  }

  eliminarReglas(): void {
    if (confirm('¿Está seguro de eliminar las reglas personalizadas? Se usarán las reglas por defecto del sistema.')) {
      this.saving = true;
      this.inventariosService.deleteReglasStock(this.inventarioId).subscribe({
        next: (response) => {
          if (response.success) {
            this.successMessage = 'Reglas eliminadas. Se usarán reglas por defecto';
            setTimeout(() => {
              this.volver();
            }, 1500);
          }
          this.saving = false;
        },
        error: (error) => {
          console.error('Error al eliminar reglas:', error);
          this.errorMessage = error.error?.error?.message || 'Error al eliminar reglas';
          this.saving = false;
        }
      });
    }
  }

  volver(): void {
    this.router.navigate(['/admin/inventarios']);
  }

  getNivelStockBadge(nivel: string): string {
    const badges: any = {
      'critico': 'badge bg-danger',
      'bajo': 'badge bg-warning text-dark',
      'normal': 'badge bg-success',
      'sobrestock': 'badge bg-info'
    };
    return badges[nivel] || 'badge bg-secondary';
  }
}
