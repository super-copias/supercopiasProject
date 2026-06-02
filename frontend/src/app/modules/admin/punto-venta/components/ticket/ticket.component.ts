import { Component, Input, Output, EventEmitter, ElementRef, ViewChild } from '@angular/core';
import { VentaDetalle, CotizacionDetalle } from '../../../../../services/pos.service';
import { PosService } from '../../../../../services/pos.service';

export type PosTicketType = 'venta' | 'cotizacion' | 'pedido';

export interface PosTicketTheme {
  pageWidthMm: number;
  pageMarginMm: number;
  paperWidthMm: number;
  wrapperPaddingPx: number;
  fontFamily: string;
  fontSizePx: number;
  fontWeight: number;
}

const DEFAULT_TICKET_THEME: PosTicketTheme = {
  pageWidthMm: 80,
  pageMarginMm: 1,
  paperWidthMm: 72,
  wrapperPaddingPx: 7,
  fontFamily: "'Courier New', Courier, monospace",
  fontSizePx: 12,
  fontWeight: 600,
};

function buildTicketPrintStyles(theme: PosTicketTheme): string {
  return `
  @page { size: ${theme.pageWidthMm}mm auto; margin: ${theme.pageMarginMm}mm; }
  html, body { margin: 0; padding: 12px; background: #e0e0e0;
               display: flex; justify-content: center; align-items: flex-start; }
  * { font-family: ${theme.fontFamily}; font-size: ${theme.fontSizePx}px; font-weight: ${theme.fontWeight}; box-sizing: border-box; }
  .ticket-papel { width: ${theme.paperWidthMm}mm; background: #fff; padding: ${theme.wrapperPaddingPx}px;
                  box-shadow: 0 2px 10px rgba(0,0,0,.3); }
  .t-empresa    { font-weight: 700; font-size: 15px; text-align: center; }
  .t-sub        { text-align: center; font-size: 11px; margin-bottom: 4px; }
  .t-logo-wrap  { text-align: center; margin-bottom: 0; }
  .t-logo       { width: 142px; max-width: 92%; height: auto; display: inline-block; }
  .t-sep        { border-top: 1px dashed #aaa; margin: 4px 0; }
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
  .t-pedido-badge { text-align:center; font-weight:700; font-size:13px;
                    letter-spacing:1px; padding: 2px 0; }
  .t-anticipo-row { background:#fff8dc; padding: 2px 4px; border-radius:3px; }
  @media print {
    html, body { background: none; padding: 0; margin: 0;
                 display: block; width: ${theme.pageWidthMm}mm; height: auto; overflow: visible; }
    .ticket-papel {
      box-shadow: none;
      width: 100%;
      height: auto;
      overflow: visible;
      page-break-inside: auto;
      break-inside: auto;
    }
  }
`;
}

@Component({
  selector: 'app-pos-ticket',
  templateUrl: './ticket.component.html',
  styleUrls: ['./ticket.component.scss']
})
export class TicketComponent {

  @ViewChild('ticketPapel') ticketPapelRef?: ElementRef<HTMLElement>;

  @Input() ticketType: PosTicketType = 'venta';
  @Input() venta: VentaDetalle | null = null;
  @Input() cotizacion: CotizacionDetalle | null = null;
  @Input() pedido: any = null;
  @Input() marcarVentaComoImpresa = true;
  @Input() ticketTheme: Partial<PosTicketTheme> = {};

  @Output() imprimir        = new EventEmitter<void>();
  @Output() nuevaVenta      = new EventEmitter<void>();
  @Output() cargarAlCarrito = new EventEmitter<CotizacionDetalle>();
  @Output() cerrarPedido    = new EventEmitter<void>();

  constructor(private posService: PosService) {}

  onImprimir(): void    { this.imprimirTicket(); }
  onNuevaVenta(): void  { this.nuevaVenta.emit(); }
  onCargarAlCarrito(): void {
    if (this.cotizacion) this.cargarAlCarrito.emit(this.cotizacion);
  }

  get esVisible(): boolean {
    if (this.ticketType === 'pedido') return !!this.pedido;
    if (this.ticketType === 'cotizacion') return !!this.cotizacion;
    return !!this.venta;
  }

  get temaImpresion(): PosTicketTheme {
    return {
      ...DEFAULT_TICKET_THEME,
      ...this.ticketTheme,
    };
  }

  get logoSrc(): string {
    const logoPath = '/assets/img/logo%20azul.png';
    if (typeof window === 'undefined') return logoPath;
    return `${window.location.origin}${logoPath}`;
  }

  get cambio(): number {
    if (!this.venta) return 0;
    const rec = parseFloat(String(this.venta.monto_recibido || 0));
    const tot = parseFloat(String(this.venta.total || 0));
    return Math.max(0, rec - tot);
  }

  get puntosGanados(): number {
    if (!this.venta?.cliente_id || !this.venta?.total) return 0;
    return Math.floor(parseFloat(String(this.venta.total)) / 10);
  }

  get tieneDescuentoVolumen(): boolean {
    return !!this.venta?.detalle?.some(d => d.tabulador_aplicado);
  }

  get totalConFactura(): number {
    if (!this.venta?.requiere_factura) return 0;
    const base = parseFloat(String(this.venta.total || 0));
    const iva  = parseFloat(String(this.venta.iva_monto || 0));
    const isr  = parseFloat(String(this.venta.isr_monto || 0));
    return parseFloat((base + iva - isr).toFixed(2));
  }

  get totalCotizacionConFactura(): number {
    if (!this.cotizacion?.requiere_factura) return 0;
    const base = parseFloat(String(this.cotizacion.total || 0));
    const iva  = parseFloat(String(this.cotizacion.iva_monto || 0));
    const isr  = parseFloat(String(this.cotizacion.isr_monto || 0));
    return parseFloat((base + iva - isr).toFixed(2));
  }

  get ivaPedido(): number {
    if (!this.pedido?.requiere_factura) return 0;
    return parseFloat((parseFloat(String(this.pedido.total || 0)) * 0.16).toFixed(2));
  }

  get isrPedido(): number {
    if (!this.pedido?.requiere_factura || this.pedido.tipo_persona_factura === 'pf') return 0;
    return parseFloat((parseFloat(String(this.pedido.total || 0)) * 0.0125).toFixed(2));
  }

  get totalPedidoConFactura(): number {
    if (!this.pedido?.requiere_factura) return 0;
    const base = parseFloat(String(this.pedido.total || 0));
    return parseFloat((base + this.ivaPedido - this.isrPedido).toFixed(2));
  }

  get saldoPedidoConFactura(): number {
    if (!this.pedido?.requiere_factura) return this.saldoPedido;
    return parseFloat((this.totalPedidoConFactura - parseFloat(String(this.pedido.anticipo || 0))).toFixed(2));
  }

  // Anticipo restante en pedido
  get saldoPedido(): number {
    if (!this.pedido) return 0;
    return parseFloat((parseFloat(this.pedido.total) - parseFloat(this.pedido.anticipo)).toFixed(2));
  }

  imprimirTicketInterno(): void {
    const papelEl = this.ticketPapelRef?.nativeElement;
    if (!papelEl) { window.print(); return; }
    const W = 320;
    const left = Math.round((screen.width - W) / 2);
    const top  = Math.round((screen.height - 600) / 2);
    const win = window.open('', '_blank',
      `width=${W},left=${left},top=${top},resizable=yes,scrollbars=yes,toolbar=no,menubar=no,status=no,location=no`);
    if (!win) return;
    win.document.write(
      `<!DOCTYPE html><html><head><title>Ticket</title><style>${buildTicketPrintStyles(this.temaImpresion)}</style>
        <script>
          window.onload       = function(){ setTimeout(function(){ window.print(); }, 400); };
          window.onafterprint = function(){ window.close(); };
        <\/script>
       </head><body>${papelEl.outerHTML}</body></html>`
    );
    win.document.close();
  }

  imprimirTicket(): void {
    if (this.ticketType === 'venta' && this.marcarVentaComoImpresa && this.venta?.id) {
      this.posService.marcarTicketGenerado(this.venta.id).subscribe();
    }
    this.imprimirTicketInterno();
    this.imprimir.emit();
  }
}
