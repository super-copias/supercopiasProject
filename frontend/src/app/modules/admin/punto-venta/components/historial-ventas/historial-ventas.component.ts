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

  estatusOpciones = [
    { value: '', label: 'Todos' },
    { value: 'completada', label: 'Completada' },
    { value: 'cancelada', label: 'Cancelada' },
  ];

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
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    this.filtroFechaInicio.setValue(this.toISO(primerDia));
    this.filtroFechaFin.setValue(this.toISO(hoy));

    this.cargarVentas();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private toISO(d: Date): string {
    return d.toISOString().split('T')[0];
  }

  buscar(): void {
    this.paginaActual = 1;
    this.cargarVentas();
  }

  limpiarFiltros(): void {
    const hoy = new Date();
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    this.filtroFechaInicio.setValue(this.toISO(primerDia));
    this.filtroFechaFin.setValue(this.toISO(hoy));
    this.filtroEstatus.setValue('');
    this.filtroFolio.setValue('');
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
    if (!confirm(`¿Cancelar la venta ${this.ventaDetalle.folio}? Esta acción revertirá el inventario y los puntos.`)) return;
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

  imprimirTicket(): void {
    if (this.ventaDetalle?.id) {
      this.posService.marcarTicketGenerado(this.ventaDetalle.id).subscribe();
    }

    const papelEl = document.querySelector('.ticket-papel') as HTMLElement;
    if (!papelEl) { window.print(); return; }

    const estilos = `
      <style>
        @page { size: 80mm auto; margin: 3mm; }
        html, body { margin: 0; padding: 12px; background: #e0e0e0;
                     display: flex; justify-content: center; align-items: flex-start; }
        * { font-family: 'Courier New', Courier, monospace; font-size: 12px; box-sizing: border-box; }
        .ticket-papel { width: 72mm; background: #fff; padding: 10px;
                        box-shadow: 0 2px 10px rgba(0,0,0,.3); }
        .t-empresa    { font-weight: 700; font-size: 15px; text-align: center; }
        .t-sub        { text-align: center; font-size: 11px; margin-bottom: 4px; }
        .t-sep        { border-top: 1px dashed #aaa; margin: 6px 0; }
        .t-meta       { line-height: 1.6; }
        .t-items      { width: 100%; border-collapse: collapse; }
        .t-items th, .t-items td { padding: 2px 0; vertical-align: top; }
        .t-desc       { width: 46%; word-break: break-word; }
        .t-qty        { width: 12%; text-align: center; }
        .t-price      { width: 20%; text-align: right; }
        .t-tot        { width: 22%; text-align: right; }
        .t-items thead th { border-bottom: 1px dashed #aaa; font-weight: 700; }
        .t-badge-desc { display:inline-block; background:#ffd302; color:#000;
                        font-size:9px; padding:0 3px; border-radius:3px; margin-left:2px; }
        .t-totales    { line-height: 1.8; }
        .t-trow       { display: flex; justify-content: space-between; }
        .t-total-row  { font-weight: 700; font-size: 14px; border-top: 1px dashed #aaa;
                        padding-top: 4px; margin-top: 2px; }
        .t-puntos     { text-align: center; padding: 4px; background: #fff8dc;
                        border-radius: 4px; font-weight: 600; }
        .t-notas      { font-style: italic; font-size: 11px; }
        .t-footer     { text-align: center; font-size: 11px; line-height: 1.6; }
        @media print {
          html, body { background: none; padding: 0; display: block; }
          .ticket-papel { box-shadow: none; width: 100%; }
        }
      </style>`;

    const W = 320, H = 500;
    const left = Math.round((screen.width  - W) / 2);
    const top  = Math.round((screen.height - H) / 2);
    const printWin = window.open('', '_blank',
      `width=${W},height=${H},left=${left},top=${top},resizable=yes,scrollbars=yes,toolbar=no,menubar=no,status=no,location=no`);
    if (!printWin) return;
    printWin.document.write(
      `<!DOCTYPE html><html><head><title>Ticket</title>${estilos}
        <script>
          window.onload       = function(){ setTimeout(function(){ window.print(); }, 250); };
          window.onafterprint = function(){ window.close(); };
        <\/script>
       </head><body>${papelEl.outerHTML}</body></html>`
    );
    printWin.document.close();
  }

  mostrarReimpresion(): void { this.mostrarTicket = true; }

  get mostrarBotonCancelar(): boolean {
    return this.ventaDetalle?.estatus === 'completada';
  }
}
