import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LineaCarrito, Descuento, VentaDetalle, CotizacionDetalle, PosService } from '../../../../../services/pos.service';

@Component({
  selector: 'app-pos-panel-cobro',
  templateUrl: './panel-cobro.component.html',
  styleUrls: ['./panel-cobro.component.scss']
})
export class PanelCobroComponent implements OnInit, OnChanges, OnDestroy {

  @Input() carrito: LineaCarrito[] = [];
  @Input() totales = { subtotal: 0, descuentoMonto: 0, total: 0 };
  @Input() clienteSeleccionado: any = null;
  @Input() descuentoGlobalPct = 0;
  @Input() descuentoConfigId: number | null = null;
  @Input() descuentoAutorizadoPor: string | null = null;

  @Output() descuentoCambiado    = new EventEmitter<{ pct: number; configId: number | null; autorizadoPor: string | null }>();
  @Output() ventaCompletada       = new EventEmitter<void>();
  @Output() cotizacionGuardada    = new EventEmitter<CotizacionDetalle>();
  @Output() pedidoGuardado        = new EventEmitter<any>()

  private destroy$ = new Subject<void>();

  descuentos: Descuento[] = [];
  metodoPago: 'efectivo' | 'tarjeta' | 'transferencia' = 'efectivo';
  montoRecibido: number | null = null;

  procesando = false;
  error = '';
  ventaExitosa: VentaDetalle | null = null;

  // Cotización
  procesandoCotizacion = false;
  errorCotizacion = '';
  cotizacionExitosa: CotizacionDetalle | null = null;
  mostrarTicketCotizacion = false;
  fechaVencimientoCotizacion = '';

  // Descuento manual
  descuentoManualPct = 0;

  // Confirmación de acciones
  mostrarConfirmacion = false;
  accionPendiente: 'venta' | 'cotizacion' | null = null;

  // Modales de herramientas
  mostrarModalDescuento   = false;
  mostrarModalFacturacion = false;  // preview desglose fiscal
  mostrarModalPedido      = false;

  // ── Facturación (toggle en panel) ──────────────────────────────────────
  requiereFactura    = false;
  totalConFactura    = 0;  // calculado por el componente hijo vía event o input

  // Autorización de descuento elevado
  mostrarAutorizacion = false;
  pinAutorizacion = '';
  errorPin = '';
  pinCorrecto = '1234'; // En producción validar contra el backend

  // Ticket
  mostrarTicket = false;

  // Notas
  notas = '';
  folioOperacion = '';

  readonly LIMITE_CAJERO = 15;

  constructor(private posService: PosService) {}

  private fechaHoyMasDias(dias: number): string {
    const d = new Date();
    d.setDate(d.getDate() + dias);
    return d.toISOString().split('T')[0];
  }

  ngOnInit(): void {
    this.fechaVencimientoCotizacion = this.fechaHoyMasDias(10);
    this.posService.getDescuentos().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.descuentos = r.data || []; }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['descuentoGlobalPct']) {
      this.descuentoManualPct = this.descuentoGlobalPct;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Descuento ─────────────────────────────────────────────────

  aplicarDescuentoRapido(pct: number): void {
    if (pct > this.LIMITE_CAJERO) {
      this.descuentoManualPct = pct;
      this.mostrarAutorizacion = true;
      return;
    }
    this.emitirDescuento(pct, null, null);
  }

  onDescuentoManualChange(valor: string): void {
    const pct = Math.min(100, Math.max(0, parseFloat(valor) || 0));
    this.descuentoManualPct = pct;
    if (pct > this.LIMITE_CAJERO) {
      this.mostrarAutorizacion = true;
      return;
    }
    this.emitirDescuento(pct, null, null);
  }

  confirmarAutorizacion(): void {
    if (this.pinAutorizacion !== this.pinCorrecto) {
      this.errorPin = 'PIN incorrecto';
      return;
    }
    this.mostrarAutorizacion = false;
    this.errorPin = '';
    this.emitirDescuento(this.descuentoManualPct, null, 'Supervisor');
    this.pinAutorizacion = '';
  }

  cancelarAutorizacion(): void {
    this.mostrarAutorizacion = false;
    this.descuentoManualPct = this.LIMITE_CAJERO;
    this.errorPin = '';
    this.pinAutorizacion = '';
    this.emitirDescuento(this.LIMITE_CAJERO, null, null);
  }

  private emitirDescuento(pct: number, configId: number | null, autorizadoPor: string | null): void {
    this.descuentoCambiado.emit({ pct, configId, autorizadoPor });
  }

  // ── Cobro ────────────────────────────────────────────────────

  get cambio(): number {
    if (!this.montoRecibido || this.metodoPago !== 'efectivo') return 0;
    return Math.max(0, parseFloat((this.montoRecibido - this.totales.total).toFixed(2)));
  }

  get puedeVender(): boolean {
    if (this.requiereFactura && !this.clienteSeleccionado?.id) return false;
    return this.carrito.length > 0 && !this.procesando &&
      (this.metodoPago !== 'efectivo' || (!!this.montoRecibido && this.montoRecibido >= this.totales.total));
  }

  procesarVenta(): void {
    if (!this.puedeVender) return;
    this.procesando = true;
    this.error = '';

    const payload = {
      cliente_id: this.clienteSeleccionado?.id || null,
      items: this.carrito.map(({ _foto_url, _nivel_stock, _existencia_actual, _id_ui, _precio_base, _tabulador, _tabulador_activo, ...rest }) => ({
        ...rest,
        tabulador_aplicado: !!_tabulador_activo && _precio_base !== undefined && rest.precio_unitario < _precio_base,
      })),
      metodo_pago_codigo: this.metodoPago,
      metodo_pago_descripcion: this.labelMetodo(this.metodoPago),
      monto_recibido: this.metodoPago === 'efectivo' ? this.montoRecibido : null,
      descuento_pct: this.descuentoGlobalPct,
      descuento_config_id: this.descuentoConfigId,
      descuento_autorizado_por: this.descuentoAutorizadoPor,
      notas: this.notas || undefined,
      folio_operacion: this.folioOperacion || undefined,
      requiere_factura: this.requiereFactura,
    };

    this.posService.createVenta(payload).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.ventaExitosa = r.data;
        this.mostrarTicket = true;
        this.procesando = false;
        this.ventaCompletada.emit();
      },
      error: (e) => {
        this.error = e?.error?.error?.message || 'Error al procesar la venta';
        this.procesando = false;
      }
    });
  }

  // ── Ticket ───────────────────────────────────────────────────

  imprimirTicket(): void {
    if (!this.ventaExitosa) return;
    if (this.ventaExitosa.id) {
      this.posService.marcarTicketGenerado(this.ventaExitosa.id).subscribe();
    }

    // Obtener el HTML renderizado del ticket-papel
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

  nuevaVenta(): void {
    this.ventaExitosa = null;
    this.mostrarTicket = false;
    this.cotizacionExitosa = null;
    this.mostrarTicketCotizacion = false;
    this.montoRecibido = null;
    this.folioOperacion = '';
    this.notas = '';
    this.descuentoManualPct = 0;
    this.fechaVencimientoCotizacion = this.fechaHoyMasDias(10);
  }

  // ── Pedido ───────────────────────────────────────────────────

  abrirModalPedido(): void {
    // Destruir el componente primero (si estuviera abierto) y recrearlo en el siguiente tick
    // para garantizar que Angular complete el ciclo de destrucción antes de crearlo de nuevo.
    this.mostrarModalPedido = false;
    setTimeout(() => { this.mostrarModalPedido = true; });
  }

  onPedidoGenerado(pedido: any): void {
    this.mostrarModalPedido = false;
    this.pedidoGuardado.emit(pedido);
  }

  // ── Cotización ────────────────────────────────────────────────

  get puedeGuardarCotizacion(): boolean {
    if (this.requiereFactura && !this.clienteSeleccionado?.id) return false;
    return this.carrito.length > 0 && !this.procesandoCotizacion;
  }

  guardarCotizacion(): void {
    if (!this.puedeGuardarCotizacion) return;
    this.procesandoCotizacion = true;
    this.errorCotizacion = '';

    const payload = {
      cliente_id: this.clienteSeleccionado?.id || null,
      items: this.carrito.map(({ _foto_url, _nivel_stock, _existencia_actual, _id_ui, ...rest }) => rest),
      descuento_pct: this.descuentoGlobalPct,
      notas: this.notas || undefined,
      fecha_vencimiento: this.fechaVencimientoCotizacion || undefined,
      requiere_factura: this.requiereFactura,
    };

    this.posService.createCotizacion(payload).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.cotizacionExitosa = r.data;
        this.mostrarTicketCotizacion = true;
        this.procesandoCotizacion = false;
        this.cotizacionGuardada.emit(r.data);
      },
      error: (e) => {
        this.errorCotizacion = e?.error?.error?.message || 'Error al guardar la cotización';
        this.procesandoCotizacion = false;
      }
    });
  }

  // ── Confirmación ──────────────────────────────────────────────

  solicitarConfirmacion(accion: 'venta' | 'cotizacion'): void {
    if (accion === 'venta' && !this.puedeVender) return;
    if (accion === 'cotizacion' && !this.puedeGuardarCotizacion) return;
    this.accionPendiente = accion;
    this.mostrarConfirmacion = true;
  }

  confirmarAccion(): void {
    if (this.requiereFactura && !this.clienteSeleccionado?.id) {
      this.error = 'Para facturar debes seleccionar un cliente registrado en el sistema.';
      this.mostrarConfirmacion = false;
      return;
    }
    this.mostrarConfirmacion = false;
    const accion = this.accionPendiente;
    this.accionPendiente = null;
    if (accion === 'venta') this.procesarVenta();
    else if (accion === 'cotizacion') this.guardarCotizacion();
  }

  cancelarConfirmacion(): void {
    this.mostrarConfirmacion = false;
    this.accionPendiente     = null;
  }

  // ── Helpers ───────────────────────────────────────────────────

  labelMetodo(m: string): string {
    const map: Record<string, string> = {
      efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia'
    };
    return map[m] || m;
  }
}
