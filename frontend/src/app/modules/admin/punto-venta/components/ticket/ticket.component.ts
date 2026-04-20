import { Component, Input, Output, EventEmitter } from '@angular/core';
import { VentaDetalle, CotizacionDetalle } from '../../../../../services/pos.service';

const TICKET_PRINT_STYLES = `
  @page { size: 80mm auto; margin: 2mm; }
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
  .t-pedido-badge { text-align:center; font-weight:700; font-size:13px;
                    letter-spacing:1px; padding: 2px 0; }
  .t-anticipo-row { background:#fff8dc; padding: 2px 4px; border-radius:3px; }
  @media print {
    html, body { background: none; padding: 0; margin: 0;
                 display: block; width: 80mm; overflow: visible; }
    .ticket-papel { box-shadow: none; width: 100%; page-break-inside: avoid; overflow: visible; }
  }
`;

@Component({
  selector: 'app-pos-ticket',
  templateUrl: './ticket.component.html',
  styleUrls: ['./ticket.component.scss']
})
export class TicketComponent {

  @Input() venta: VentaDetalle | null = null;
  @Input() cotizacion: CotizacionDetalle | null = null;
  @Input() esCotizacion = false;

  @Input() pedido: any = null;
  @Input() esPedido = false;

  @Output() imprimir        = new EventEmitter<void>();
  @Output() nuevaVenta      = new EventEmitter<void>();
  @Output() cargarAlCarrito = new EventEmitter<CotizacionDetalle>();
  @Output() cerrarPedido    = new EventEmitter<void>();

  onImprimir(): void    { this.imprimir.emit(); }
  onNuevaVenta(): void  { this.nuevaVenta.emit(); }
  onCargarAlCarrito(): void {
    if (this.cotizacion) this.cargarAlCarrito.emit(this.cotizacion);
  }

  get esVisible(): boolean {
    if (this.esPedido) return !!this.pedido;
    return this.esCotizacion ? !!this.cotizacion : !!this.venta;
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

  // Anticipo restante en pedido
  get saldoPedido(): number {
    if (!this.pedido) return 0;
    return parseFloat((parseFloat(this.pedido.total) - parseFloat(this.pedido.anticipo)).toFixed(2));
  }

  imprimirTicketInterno(): void {
    const papelEl = document.querySelector('.ticket-papel') as HTMLElement;
    if (!papelEl) { window.print(); return; }
    const W = 320;
    const left = Math.round((screen.width - W) / 2);
    const top  = Math.round((screen.height - 600) / 2);
    const win = window.open('', '_blank',
      `width=${W},left=${left},top=${top},resizable=yes,scrollbars=yes,toolbar=no,menubar=no,status=no,location=no`);
    if (!win) return;
    win.document.write(
      `<!DOCTYPE html><html><head><title>Ticket</title><style>${TICKET_PRINT_STYLES}</style>
        <script>
          window.onload       = function(){ setTimeout(function(){ window.print(); }, 400); };
          window.onafterprint = function(){ window.close(); };
        <\/script>
       </head><body>${papelEl.outerHTML}</body></html>`
    );
    win.document.close();
  }
}
