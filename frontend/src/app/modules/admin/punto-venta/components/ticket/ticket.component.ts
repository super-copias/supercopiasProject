import { Component, Input, Output, EventEmitter } from '@angular/core';
import { VentaDetalle, CotizacionDetalle } from '../../../../../services/pos.service';

@Component({
  selector: 'app-pos-ticket',
  templateUrl: './ticket.component.html',
  styleUrls: ['./ticket.component.scss']
})
export class TicketComponent {

  @Input() venta: VentaDetalle | null = null;
  @Input() cotizacion: CotizacionDetalle | null = null;
  @Input() esCotizacion = false;

  @Output() imprimir      = new EventEmitter<void>();
  @Output() nuevaVenta    = new EventEmitter<void>();
  @Output() cargarAlCarrito = new EventEmitter<CotizacionDetalle>();

  onImprimir(): void    { this.imprimir.emit(); }
  onNuevaVenta(): void  { this.nuevaVenta.emit(); }
  onCargarAlCarrito(): void {
    if (this.cotizacion) this.cargarAlCarrito.emit(this.cotizacion);
  }

  get esVisible(): boolean {
    return this.esCotizacion ? !!this.cotizacion : !!this.venta;
  }

  get cambio(): number {
    if (!this.venta) return 0;
    const rec = parseFloat(String(this.venta.monto_recibido || 0));
    const tot = parseFloat(String(this.venta.total || 0));
    return Math.max(0, rec - tot);
  }

  /** 1 punto por cada $10 MXN — misma fórmula que el backend */
  get puntosGanados(): number {
    if (!this.venta?.cliente_id || !this.venta?.total) return 0;
    return Math.floor(parseFloat(String(this.venta.total)) / 10);
  }
}
