import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FormControl } from '@angular/forms';
import { PosService, FiltrosVentas, VentaDetalle } from '../../../../../services/pos.service';

@Component({
  selector: 'app-pos-historial-ventas',
  templateUrl: './historial-ventas.component.html',
  styleUrls: ['./historial-ventas.component.scss']
})
export class HistorialVentasComponent implements OnInit, OnDestroy {

  @Output() irANuevaVenta = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  ventas: any[]   = [];
  cargando        = false;
  error           = '';
  totalVentas     = 0;
  paginaActual    = 1;
  readonly porPagina = 15;

  // Filtros
  filtroFechaInicio = new FormControl('');
  filtroFechaFin    = new FormControl('');
  filtroEstatus     = new FormControl('');
  filtroFolio       = new FormControl('');
  filtroOrigen      = new FormControl('');

  estatusOpciones = [
    { value: '', label: 'Todos' },
    { value: 'completada', label: 'Completada' },
    { value: 'cancelada', label: 'Cancelada' },
  ];

  origenOpciones = [
    { value: '', label: 'Todos' },
    { value: 'directa', label: 'Venta rápida' },
    { value: 'pedido', label: 'Desde pedido' },
    { value: 'cotizacion', label: 'Desde cotización' },
  ];

  origenLabel(origen: string): string {
    const map: Record<string, string> = {
      directa: 'Rápida', pedido: 'Pedido', cotizacion: 'Cotización',
    };
    return map[origen] ?? origen;
  }

  origenIcon(origen: string): string {
    const map: Record<string, string> = {
      directa: 'bi-lightning-fill', pedido: 'bi-box-seam', cotizacion: 'bi-file-earmark-text',
    };
    return map[origen] ?? 'bi-question';
  }

  origenClass(origen: string): string {
    const map: Record<string, string> = {
      directa: 'bg-primary', pedido: 'bg-warning text-dark', cotizacion: 'bg-info text-dark',
    };
    return map[origen] ?? 'bg-secondary';
  }

  // Detalle
  ventaDetalle: VentaDetalle | null = null;
  cargandoDetalle = false;

  // Cancelar
  cancelando = false;
  errorCancelar = '';

  // Reimpresión
  mostrarTicket = false;

  constructor(private posService: PosService) {}

  ngOnInit(): void {
    const hoy = new Date();
    this.filtroFechaInicio.setValue(this.toISO(hoy));
    this.filtroFechaFin.setValue(this.toISO(hoy));

    this.cargarVentas();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private toISO(d: Date): string {
    // Usa la zona horaria de CDMX explícitamente para evitar desfases
    // cuando el sistema operativo del cliente corre en UTC.
    // (a las 18:00 CDMX/UTC-6 ya son 00:00 UTC del día siguiente)
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Mexico_City',
      year:  'numeric',
      month: '2-digit',
      day:   '2-digit',
    }).format(d); // en-CA devuelve YYYY-MM-DD
  }

  buscar(): void {
    this.paginaActual = 1;
    this.cargarVentas();
  }

  limpiarFiltros(): void {
    const hoy = new Date();
    this.filtroFechaInicio.setValue(this.toISO(hoy));
    this.filtroFechaFin.setValue(this.toISO(hoy));
    this.filtroEstatus.setValue('');
    this.filtroFolio.setValue('');
    this.filtroOrigen.setValue('');
    this.paginaActual = 1;
    this.cargarVentas();
  }

  cargarVentas(): void {
    this.cargando = true;
    this.error = '';
    const filtros: FiltrosVentas = {
      fecha_inicio: this.filtroFechaInicio.value || undefined,
      fecha_fin:    this.filtroFechaFin.value    || undefined,
      estatus:      this.filtroEstatus.value      || undefined,
      folio:        this.filtroFolio.value        || undefined,
      origen_venta: this.filtroOrigen.value       || undefined,
      pagina:       this.paginaActual,
      por_pagina:   this.porPagina,
    };
    this.posService.listVentas(filtros).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.ventas     = r.data || [];
        this.totalVentas = r.pagination?.total || 0;
        this.cargando   = false;
      },
      error: () => { this.error = 'Error al cargar ventas'; this.cargando = false; }
    });
  }

  get totalPaginas(): number {
    return Math.ceil(this.totalVentas / this.porPagina);
  }

  cambiarPagina(p: number): void {
    if (p < 1 || p > this.totalPaginas) return;
    this.paginaActual = p;
    this.cargarVentas();
  }

  get pages(): number[] {
    const total = this.totalPaginas;
    const cur   = this.paginaActual;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = new Set([1, total, cur - 1, cur, cur + 1].filter(p => p >= 1 && p <= total));
    return Array.from(pages).sort((a, b) => a - b);
  }

  verDetalle(venta: any): void {
    this.ventaDetalle    = null;
    this.cargandoDetalle = true;
    this.errorCancelar   = '';
    this.mostrarTicket   = false;
    this.posService.getVentaById(venta.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.ventaDetalle = r.data; this.cargandoDetalle = false; },
      error: () => { this.cargandoDetalle = false; }
    });
  }

  cerrarDetalle(): void {
    this.ventaDetalle  = null;
    this.mostrarTicket = false;
  }

  cancelarVenta(): void {
    if (!this.ventaDetalle?.id) return;
    const esPedido = this.ventaDetalle?.origen_venta === 'pedido';
    const msg = esPedido
      ? `¿Cancelar la venta ${this.ventaDetalle.folio}? Se revertirán los puntos, se liberará el stock del pedido y el pedido asociado quedará cancelado. Los cobros dejarán de contar en el corte de caja (se conserva el historial).`
      : `¿Cancelar la venta ${this.ventaDetalle.folio}? Esta acción revertirá el inventario y los puntos.`;
    if (!confirm(msg)) return;
    this.cancelando = true;
    this.errorCancelar = '';
    this.posService.cancelarVenta(this.ventaDetalle.id, 'Cancelación solicitada desde historial').pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.cancelando = false;
        this.cerrarDetalle();
        this.cargarVentas();
      },
      error: (e) => {
        this.errorCancelar = e?.error?.error?.message || 'Error al cancelar';
        this.cancelando = false;
      }
    });
  }

  mostrarReimpresion(): void { this.mostrarTicket = true; }

  get mostrarBotonCancelar(): boolean {
    return this.ventaDetalle?.estatus === 'completada';
  }
}
