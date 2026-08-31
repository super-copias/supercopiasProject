import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { FormControl } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../../../environments/environment';
import { LineaCarrito, Descuento, VentaDetalle, CotizacionDetalle, PosService, PagoInput } from '../../../../../services/pos.service';
import { SelectorPagoComponent } from '../selector-pago/selector-pago.component';

@Component({
  selector: 'app-pos-panel-cobro',
  templateUrl: './panel-cobro.component.html',
  styleUrls: ['./panel-cobro.component.scss']
})
export class PanelCobroComponent implements OnInit, OnChanges, OnDestroy {

  @ViewChild('selectorPago') selectorPagoRef?: SelectorPagoComponent;

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
  pagos: PagoInput[] = [];
  pagosValidos = false;
  /** @deprecated — mantenido para compatibilidad con template antiguo hasta reemplazar HTML */
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
  cotizacionClienteNombre = '';
  cotizacionClienteTelefono = '';
  // Búsqueda de cliente registrado para la cotización (independiente del panel izquierdo)
  cotizacionClienteRegistrado: any = null;
  busquedaClienteCotizacion = new FormControl('');
  resultadosClienteCotizacion: any[] = [];
  buscandoClienteCotizacion = false;

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
  tipoPersonaFactura: 'pf' | 'pm' = 'pm';
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

  constructor(private posService: PosService, private http: HttpClient) {}

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
    this.busquedaClienteCotizacion.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    ).subscribe(q => {
      if (!q || q.trim().length < 2) { this.resultadosClienteCotizacion = []; return; }
      this.buscarClientesCotizacion(q.trim());
    });
  }

  private buscarClientesCotizacion(q: string): void {
    this.buscandoClienteCotizacion = true;
    const params = new HttpParams().set('q', q).set('limit', '8');
    this.http.get<any>(`${environment.apiUrl}/clientes`, { params }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (r) => {
        this.resultadosClienteCotizacion = (r.data || r || []).map((c: any) => ({
          id:              c.id,
          nombreComercial: c.nombre_comercial || c.nombreComercial || c.razon_social || c.razonSocial,
          nombre:          c.nombre_comercial || c.nombreComercial || c.razon_social || c.razonSocial,
          rfc:             c.rfc,
          telefono:        c.telefono,
        }));
        this.buscandoClienteCotizacion = false;
      },
      error: () => { this.buscandoClienteCotizacion = false; }
    });
  }

  seleccionarClienteCotizacion(c: any): void {
    this.cotizacionClienteRegistrado = c;
    this.resultadosClienteCotizacion = [];
    this.busquedaClienteCotizacion.setValue('', { emitEvent: false });
  }

  quitarClienteCotizacion(): void {
    this.cotizacionClienteRegistrado = null;
  }

  /** Deja solo dígitos (para el campo teléfono). */
  soloDigitos(valor: string, maxLen = 15): string {
    return (valor || '').replace(/\D/g, '').slice(0, maxLen);
  }

  /** Bloquea teclas no numéricas al escribir en un campo telefónico. */
  bloquearNoNumerico(ev: KeyboardEvent): void {
    const permitidas = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (permitidas.includes(ev.key) || ev.ctrlKey || ev.metaKey) return;
    if (!/^\d$/.test(ev.key)) ev.preventDefault();
  }

  /** Cliente registrado efectivo para la cotización: el elegido en el modal o el del panel izquierdo. */
  get cotizacionClienteEfectivo(): any {
    return this.cotizacionClienteRegistrado
      || (this.clienteSeleccionado?.id ? this.clienteSeleccionado : null);
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

  /** Total real a cobrar: con IVA/ISR si requiere factura, subtotal si no */
  get totalACobrar(): number {
    if (!this.requiereFactura) return this.totales.total;
    const sub = this.totales.total;
    const iva = parseFloat((sub * 0.16).toFixed(2));
    const isr = this.tipoPersonaFactura === 'pf' ? 0 : parseFloat((sub * 0.0125).toFixed(2));
    return parseFloat((sub + iva - isr).toFixed(2));
  }

  get cambio(): number {
    if (!this.montoRecibido || this.metodoPago !== 'efectivo') return 0;
    return Math.max(0, parseFloat((this.montoRecibido - this.totalACobrar).toFixed(2)));
  }

  /** Habilita el botón COBRAR para abrir el modal (sin requerir método de pago aún) */
  get puedeAbrirCobro(): boolean {
    if (this.requiereFactura && !this.clienteSeleccionado?.id) return false;
    return this.carrito.length > 0 && !this.procesando;
  }

  get puedeVender(): boolean {
    if (this.requiereFactura && !this.clienteSeleccionado?.id) return false;
    return this.carrito.length > 0 && !this.procesando && this.pagosValidos;
  }

  onPagosChange(p: PagoInput[]): void { this.pagos = p; }
  onPagosValidChange(v: boolean): void { this.pagosValidos = v; }

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
      pagos: this.pagos,
      descuento_pct: this.descuentoGlobalPct,
      descuento_config_id: this.descuentoConfigId,
      descuento_autorizado_por: this.descuentoAutorizadoPor,
      notas: this.notas || undefined,
      folio_operacion: this.folioOperacion || undefined,
      requiere_factura: this.requiereFactura,
      tipo_persona_factura: this.tipoPersonaFactura,
    };

    this.posService._ventaEnProceso = true;
    this.posService.createVenta(payload).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.posService._ventaEnProceso = false;
        this.ventaExitosa = r.data;
        this.mostrarTicket = true;
        this.procesando = false;
        this.selectorPagoRef?.reset();
        this.pagos = [];
        this.pagosValidos = false;
        this.ventaCompletada.emit();
      },
      error: (e) => {
        this.posService._ventaEnProceso = false;
        this.error = e?.error?.error?.message || 'Error al procesar la venta';
        this.procesando = false;
      }
    });
  }

  nuevaVenta(): void {
    this.ventaExitosa = null;
    this.mostrarTicket = false;
    this.cotizacionExitosa = null;
    this.mostrarTicketCotizacion = false;
    this.pagos = [];
    this.pagosValidos = false;
    this.montoRecibido = null;
    this.folioOperacion = '';
    this.notas = '';
    this.descuentoManualPct = 0;
    this.requiereFactura = false;
    this.tipoPersonaFactura = 'pm';
    this.fechaVencimientoCotizacion = this.fechaHoyMasDias(10);
    this.cotizacionClienteNombre = '';
    this.cotizacionClienteTelefono = '';
    this.cotizacionClienteRegistrado = null;
    this.resultadosClienteCotizacion = [];
    this.busquedaClienteCotizacion.setValue('', { emitEvent: false });
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
    if (this.requiereFactura && !this.cotizacionClienteEfectivo?.id) return false;
    return this.carrito.length > 0 && !this.procesandoCotizacion;
  }

  guardarCotizacion(): void {
    if (!this.puedeGuardarCotizacion) return;
    this.procesandoCotizacion = true;
    this.errorCotizacion = '';

    const clienteReg = this.cotizacionClienteEfectivo;
    const payload = {
      cliente_id: clienteReg?.id || null,
      cliente_nombre: !clienteReg?.id
        ? (this.cotizacionClienteNombre.trim() || undefined)
        : undefined,
      cliente_telefono: !clienteReg?.id
        ? (this.cotizacionClienteTelefono.trim() || undefined)
        : undefined,
      items: this.carrito.map(({ _foto_url, _nivel_stock, _existencia_actual, _id_ui, ...rest }) => rest),
      descuento_pct: this.descuentoGlobalPct,
      notas: this.notas || undefined,
      fecha_vencimiento: this.fechaVencimientoCotizacion || undefined,
      requiere_factura: this.requiereFactura,
      tipo_persona_factura: this.tipoPersonaFactura,
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
    if (accion === 'venta' && !this.puedeAbrirCobro) return;
    if (accion === 'cotizacion' && !this.puedeGuardarCotizacion) return;
    if (accion === 'cotizacion') {
      // Precargar el cliente registrado del panel izquierdo (si lo hay) en el buscador del modal
      this.cotizacionClienteRegistrado = this.clienteSeleccionado?.id ? this.clienteSeleccionado : null;
      this.resultadosClienteCotizacion = [];
      this.busquedaClienteCotizacion.setValue('', { emitEvent: false });
    }
    this.accionPendiente = accion;
    this.mostrarConfirmacion = true;
  }

  confirmarAccion(): void {
    const clienteFacturaOk = this.accionPendiente === 'cotizacion'
      ? !!this.cotizacionClienteEfectivo?.id
      : !!this.clienteSeleccionado?.id;
    if (this.requiereFactura && !clienteFacturaOk) {
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
