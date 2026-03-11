import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { PosService, LineaCarrito, CatalogoItem, StatsHoy } from '../../../services/pos.service';

@Component({
  selector: 'app-punto-venta',
  templateUrl: './punto-venta.component.html',
  styleUrls: ['./punto-venta.component.scss']
})
export class PuntoVentaComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  vistaActiva: 'pos' | 'historial' = 'pos';

  carrito: LineaCarrito[] = [];
  clienteSeleccionado: any = null;
  descuentoGlobalPct = 0;
  descuentoConfigId: number | null = null;
  descuentoAutorizadoPor: string | null = null;

  statsHoy: StatsHoy | null = null;
  cargandoStats = false;

  totales = { subtotal: 0, descuentoMonto: 0, total: 0 };

  constructor(private posService: PosService) {}

  ngOnInit(): void {
    this.cargarStats();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarStats(): void {
    this.cargandoStats = true;
    this.posService.getStatsHoy().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.statsHoy = r.data; this.cargandoStats = false; },
      error: () => { this.cargandoStats = false; }
    });
  }

  onAgregarAlCarrito(item: CatalogoItem): void {
    const existing = this.carrito.find(c => c.inventario_id === item.id && !c.es_item_libre);
    if (existing) {
      if (!item.es_servicio && item.existencia_actual !== undefined && existing.cantidad >= item.existencia_actual) {
        return;
      }
      existing.cantidad += 1;
      existing.subtotal_linea = this.posService.calcularSubtotalLinea(existing);
    } else {
      this.carrito.push({
        inventario_id: item.id,
        nombre_producto: item.nombre,
        sku: item.sku,
        es_servicio: item.es_servicio,
        es_item_libre: false,
        cantidad: 1,
        precio_unitario: item.precio_venta,
        descuento_linea_pct: 0,
        descuento_linea_monto: 0,
        subtotal_linea: item.precio_venta,
        _foto_url: item.foto_url,
        _nivel_stock: item.nivel_stock,
        _existencia_actual: item.existencia_actual,
        _id_ui: `inv-${item.id}-${Date.now()}`,
      });
    }
    this.recalcularTotales();
  }

  onAgregarItemLibre(item: { nombre: string; precio: number; cantidad: number }): void {
    this.carrito.push({
      nombre_producto: item.nombre,
      es_servicio: false,
      es_item_libre: true,
      cantidad: item.cantidad,
      precio_unitario: item.precio,
      descuento_linea_pct: 0,
      descuento_linea_monto: 0,
      subtotal_linea: item.precio * item.cantidad,
      _id_ui: `libre-${Date.now()}`,
    });
    this.recalcularTotales();
  }

  onCarritoActualizado(carrito: LineaCarrito[]): void {
    this.carrito = [...carrito];
    this.recalcularTotales();
  }

  onLimpiarCarrito(): void {
    this.carrito = [];
    this.descuentoGlobalPct = 0;
    this.descuentoConfigId = null;
    this.descuentoAutorizadoPor = null;
    this.clienteSeleccionado = null;
    this.recalcularTotales();
  }

  onClienteSeleccionado(cliente: any): void {
    this.clienteSeleccionado = cliente;
    if (cliente?.nivel_cliente === 'vip') {
      this.descuentoGlobalPct = 10;
    } else if (cliente?.nivel_cliente === 'frecuente') {
      this.descuentoGlobalPct = 5;
    } else {
      this.descuentoGlobalPct = 0;
    }
    this.recalcularTotales();
  }

  onDescuentoCambiado(event: { pct: number; configId: number | null; autorizadoPor: string | null }): void {
    this.descuentoGlobalPct = event.pct;
    this.descuentoConfigId = event.configId;
    this.descuentoAutorizadoPor = event.autorizadoPor;
    this.recalcularTotales();
  }

  onVentaCompletada(): void {
    this.cargarStats();
    this.onLimpiarCarrito();
  }

  recalcularTotales(): void {
    this.totales = this.posService.calcularTotalesCarrito(this.carrito, this.descuentoGlobalPct);
  }

  cambiarVista(vista: 'pos' | 'historial'): void {
    this.vistaActiva = vista;
    if (vista === 'historial') this.cargarStats();
  }
}
