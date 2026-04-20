import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { PosService, LineaCarrito, CatalogoItem, StatsHoy, CotizacionDetalle } from '../../../services/pos.service';

@Component({
  selector: 'app-punto-venta',
  templateUrl: './punto-venta.component.html',
  styleUrls: ['./punto-venta.component.scss']
})
export class PuntoVentaComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  vistaActiva: 'pos' | 'historial' | 'cotizaciones' | 'pedidos' = 'pos';

  pedidosActivos = 0;

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
    // Restaurar estado del carrito si el usuario navegó a otro módulo y volvió
    if (this.posService._carritoGuardado.length > 0) {
      this.carrito               = [...this.posService._carritoGuardado];
      this.clienteSeleccionado   = this.posService._clienteGuardado;
      this.descuentoGlobalPct    = this.posService._descuentoPctGuardado;
      this.descuentoConfigId     = this.posService._descuentoConfigIdGuardado;
      this.descuentoAutorizadoPor = this.posService._descuentoAutorizadoPorGuardado;
      this.recalcularTotales();
    }
    this.cargarStats();
  }

  ngOnDestroy(): void {
    // Guardar estado del carrito para que persista si el usuario navega a otro módulo
    this.posService._carritoGuardado            = [...this.carrito];
    this.posService._clienteGuardado            = this.clienteSeleccionado;
    this.posService._descuentoPctGuardado       = this.descuentoGlobalPct;
    this.posService._descuentoConfigIdGuardado  = this.descuentoConfigId;
    this.posService._descuentoAutorizadoPorGuardado = this.descuentoAutorizadoPor;
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
      // Recalcular precio con tabulador si aplica
      if (existing._tabulador_activo && existing._tabulador && existing._precio_base !== undefined) {
        existing.precio_unitario = this.posService.resolverPrecioTabulador(
          existing.cantidad, existing._precio_base, existing._tabulador
        );
      }
      existing.subtotal_linea = this.posService.calcularSubtotalLinea(existing);
    } else {
      const precioBase = item.precio_venta;
      const tabuladorActivo = !!item.tabulador_activo && !!item.tabulador && item.tabulador.length > 0;
      const precioEfectivo = tabuladorActivo
        ? this.posService.resolverPrecioTabulador(1, precioBase, item.tabulador!)
        : precioBase;
      this.carrito.push({
        inventario_id: item.id,
        nombre_producto: item.nombre,
        sku: item.sku,
        es_servicio: item.es_servicio,
        es_item_libre: false,
        cantidad: 1,
        precio_unitario: precioEfectivo,
        descuento_linea_pct: 0,
        descuento_linea_monto: 0,
        subtotal_linea: precioEfectivo,
        _foto_url: item.foto_url,
        _nivel_stock: item.nivel_stock,
        _existencia_actual: item.existencia_actual,
        _id_ui: `inv-${item.id}-${Date.now()}`,
        _precio_base: precioBase,
        _tabulador: item.tabulador ?? [],
        _tabulador_activo: tabuladorActivo,
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
    // Limpiar también el estado guardado en el servicio
    this.posService._carritoGuardado            = [];
    this.posService._clienteGuardado            = null;
    this.posService._descuentoPctGuardado       = 0;
    this.posService._descuentoConfigIdGuardado  = null;
    this.posService._descuentoAutorizadoPorGuardado = null;
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

  onCotizacionGuardada(cotiz: CotizacionDetalle): void {
    // El ticket de cotización se muestra dentro del panel-cobro;
    // actualizamos estadísticas y limpiamos el carrito.
    this.cargarStats();
    this.onLimpiarCarrito();
  }

  onCargarCotizacion(cotiz: CotizacionDetalle): void {
    // Limpiar carrito actual y cargar items de la cotización
    this.carrito = [];
    this.descuentoGlobalPct = cotiz.descuento_pct || 0;
    this.descuentoConfigId = null;
    this.descuentoAutorizadoPor = null;

    for (const linea of cotiz.detalle) {
      this.carrito.push({
        inventario_id:       linea.inventario_id,
        nombre_producto:     linea.nombre_producto,
        sku:                 linea.sku,
        es_servicio:         linea.es_servicio,
        es_item_libre:       linea.es_item_libre,
        cantidad:            linea.cantidad,
        precio_unitario:     linea.precio_unitario,
        descuento_linea_pct: linea.descuento_linea_pct,
        descuento_linea_monto: linea.descuento_linea_monto,
        subtotal_linea:      linea.subtotal_linea,
        _id_ui:              `cotiz-${linea.id}-${Date.now()}`,
      });
    }

    this.recalcularTotales();
    this.cambiarVista('pos');
  }

  recalcularTotales(): void {
    this.totales = this.posService.calcularTotalesCarrito(this.carrito, this.descuentoGlobalPct);
  }

  onPedidoGuardado(pedido: any): void {
    this.onLimpiarCarrito();
    this.cargarStats();
    this.vistaActiva = 'pedidos';
  }

  onStatsActualizadas(activos: number): void {
    this.pedidosActivos = activos;
  }

  cambiarVista(vista: 'pos' | 'historial' | 'cotizaciones' | 'pedidos'): void {
    this.vistaActiva = vista;
    if (vista === 'historial' || vista === 'cotizaciones') this.cargarStats();
  }
}
