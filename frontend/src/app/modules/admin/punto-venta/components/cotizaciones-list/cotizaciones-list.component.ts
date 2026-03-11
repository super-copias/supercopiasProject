import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PosService, CotizacionDetalle, FiltrosCotizaciones } from '../../../../../services/pos.service';

@Component({
  selector: 'app-pos-cotizaciones-list',
  templateUrl: './cotizaciones-list.component.html',
  styleUrls: ['./cotizaciones-list.component.scss']
})
export class CotizacionesListComponent implements OnInit, OnDestroy {

  @Output() cargarAlCarrito       = new EventEmitter<CotizacionDetalle>();
  @Output() cotizacionConvertida  = new EventEmitter<void>();
  @Output() irANuevaVenta         = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  cotizaciones: any[] = [];
  cargando = false;
  error = '';

  // Filtros
  filtroFolio     = '';
  filtroEstatus   = '';
  filtroDesde     = '';
  filtroHasta     = '';

  // Paginación
  pagina    = 1;
  limite    = 15;
  total     = 0;
  totalPags = 1;

  // Detalle
  cotizacionDetalle: CotizacionDetalle | null = null;
  cargandoDetalle = false;
  errorDetalle    = '';
  mostrarTicketEnDetalle = false;

  // Panel convertir
  mostrarPanelConvertir = false;
  cotizacionConvertirId: number | null = null;
  cotizacionConvertirTotal = 0;
  metodoPagoConvertir: 'efectivo' | 'tarjeta' | 'transferencia' = 'efectivo';
  montoRecibidoConvertir: number | null = null;
  procesandoConvertir = false;
  errorConvertir = '';

  estatusOpciones = [
    { valor: '',          label: 'Todos' },
    { valor: 'pendiente', label: 'Pendiente' },
    { valor: 'aceptada',  label: 'Aceptada' },
    { valor: 'rechazada', label: 'Rechazada' },
    { valor: 'vencida',   label: 'Vencida' },
  ];

  constructor(private posService: PosService) {}

  ngOnInit(): void {
    this.cargar();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargar(): void {
    this.cargando = true;
    this.error = '';
    const filtros: FiltrosCotizaciones = {
      page:  this.pagina,
      limit: this.limite,
    };
    if (this.filtroFolio)   filtros.folio   = this.filtroFolio;
    if (this.filtroEstatus) filtros.estatus  = this.filtroEstatus;
    if (this.filtroDesde)   filtros.fecha_inicio = this.filtroDesde;
    if (this.filtroHasta)   filtros.fecha_fin    = this.filtroHasta;

    this.posService.listCotizaciones(filtros).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.cotizaciones = r.data || [];
        this.total     = r.pagination?.total || 0;
        this.totalPags = r.pagination?.pages  || 1;
        this.cargando  = false;
      },
      error: (e) => {
        this.error    = e?.error?.error?.message || 'Error al cargar cotizaciones';
        this.cargando = false;
      }
    });
  }

  buscar(): void {
    this.pagina = 1;
    this.cargar();
  }

  limpiarFiltros(): void {
    this.filtroFolio   = '';
    this.filtroEstatus = '';
    this.filtroDesde   = '';
    this.filtroHasta   = '';
    this.pagina        = 1;
    this.cargar();
  }

  cambiarPagina(p: number): void {
    if (p < 1 || p > this.totalPags) return;
    this.pagina = p;
    this.cargar();
  }

  // ── Detalle ──────────────────────────────────────────────────

  verDetalle(id: number): void {
    this.cotizacionDetalle     = null;
    this.cargandoDetalle       = true;
    this.errorDetalle          = '';
    this.mostrarTicketEnDetalle = false;

    this.posService.getCotizacionById(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.cotizacionDetalle = r.data;
        this.cargandoDetalle   = false;
      },
      error: (e) => {
        this.errorDetalle    = e?.error?.error?.message || 'Error al cargar detalle';
        this.cargandoDetalle = false;
      }
    });
  }

  cerrarDetalle(): void {
    this.cotizacionDetalle      = null;
    this.mostrarTicketEnDetalle = false;
  }

  verTicket(id: number): void {
    this.mostrarTicketEnDetalle = true;
    this.verDetalle(id);
  }

  imprimirTicketCotizacion(): void {
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
      `<!DOCTYPE html><html><head><title>Cotizaci\u00f3n</title>${estilos}
        <script>
          window.onload       = function(){ setTimeout(function(){ window.print(); }, 250); };
          window.onafterprint = function(){ window.close(); };
        <\/script>
       </head><body>${papelEl.outerHTML}</body></html>`
    );
    printWin.document.close();
  }

  // ── Cargar al carrito ─────────────────────────────────────────

  onCargarAlCarrito(): void {
    if (this.cotizacionDetalle) {
      this.cargarAlCarrito.emit(this.cotizacionDetalle);
    }
  }

  // ── Cambiar estatus ───────────────────────────────────────────

  rechazar(id: number): void {
    if (!confirm('¿Marcar cotización como Rechazada?')) return;
    this.posService.updateEstatusCotizacion(id, 'rechazada').pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.cargar(); if (this.cotizacionDetalle?.id === id) this.cerrarDetalle(); },
      error: (e) => { alert(e?.error?.error?.message || 'Error al rechazar'); }
    });
  }

  // ── Convertir a venta ─────────────────────────────────────────

  abrirConvertir(cot: any): void {
    this.cotizacionConvertirId    = cot.id;
    this.cotizacionConvertirTotal = parseFloat(cot.total);
    this.metodoPagoConvertir      = 'efectivo';
    this.montoRecibidoConvertir   = null;
    this.errorConvertir           = '';
    this.mostrarPanelConvertir    = true;
  }

  cerrarConvertir(): void {
    this.mostrarPanelConvertir = false;
    this.cotizacionConvertirId = null;
    this.errorConvertir        = '';
  }

  get cambioConvertir(): number {
    if (!this.montoRecibidoConvertir || this.metodoPagoConvertir !== 'efectivo') return 0;
    return Math.max(0, this.montoRecibidoConvertir - this.cotizacionConvertirTotal);
  }

  confirmarConvertir(): void {
    if (!this.cotizacionConvertirId) return;
    this.procesandoConvertir = true;
    this.errorConvertir      = '';

    this.posService.convertirCotizacion(
      this.cotizacionConvertirId,
      this.metodoPagoConvertir,
      this.label(this.metodoPagoConvertir),
      this.metodoPagoConvertir === 'efectivo' ? this.montoRecibidoConvertir : null
    ).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.procesandoConvertir = false;
        this.cerrarConvertir();
        this.cargar();
        this.cotizacionConvertida.emit();
      },
      error: (e) => {
        this.errorConvertir      = e?.error?.error?.message || 'Error al convertir';
        this.procesandoConvertir = false;
      }
    });
  }

  // ── Helpers ───────────────────────────────────────────────────

  label(m: string): string {
    const map: Record<string, string> = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia' };
    return map[m] || m;
  }

  badgeEstatus(e: string): string {
    const map: Record<string, string> = {
      pendiente: 'bg-warning text-dark',
      aceptada:  'bg-success',
      rechazada: 'bg-danger',
      vencida:   'bg-secondary',
    };
    return map[e] || 'bg-light text-dark';
  }

  get paginas(): number[] {
    const pages: number[] = [];
    const start = Math.max(1, this.pagina - 2);
    const end   = Math.min(this.totalPags, this.pagina + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }
}
