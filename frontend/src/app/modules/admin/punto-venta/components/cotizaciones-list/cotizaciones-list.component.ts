import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { FormControl } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../../../environments/environment';
import { PosService, CotizacionDetalle, FiltrosCotizaciones, PagoInput, LineaCarrito } from '../../../../../services/pos.service';
import { FacturasService } from '../../../../../services/facturas.service';

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
  filtroEstatus   = 'pendiente';
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
  cotizacionConvertirClienteId: number | null = null;
  cotizacionConvertirTotal = 0;
  totalConFacturaConvertir: number | null = null;
  metodoPagoConvertir: 'efectivo' | 'tarjeta' | 'transferencia' = 'efectivo'; // legacy, no usado
  montoRecibidoConvertir: number | null = null; // legacy
  pagosConvertir: PagoInput[] = [];
  pagosConvertirValidos = false;
  notasConvertir = '';
  procesandoConvertir = false;
  errorConvertir = '';
  requiereFacturaConvertir = false;
  tipoPersonaConvertir: 'pf' | 'pm' = 'pm';
  clienteFacturaConvertir: any = null;
  busquedaClienteConvertir = new FormControl('');
  resultadosClienteConvertir: any[] = [];
  buscandoClienteConvertir = false;

  estatusOpciones = [
    { valor: '',          label: 'Todos' },
    { valor: 'pendiente', label: 'Pendiente' },
    { valor: 'aceptada',  label: 'Aceptada' },
    { valor: 'rechazada', label: 'Rechazada' },
    { valor: 'vencida',   label: 'Vencida' },
  ];

  // Convertir cotización → pedido
  cargandoPedidoFormCot    = false;
  errorPedidoFormCot       = '';
  mostrarPedidoFormCot     = false;
  pedidoFormCarrito:         LineaCarrito[] = [];
  pedidoFormTotales          = { subtotal: 0, descuentoMonto: 0, total: 0 };
  pedidoFormDescPct          = 0;
  pedidoFormCliente:         any = null;
  pedidoFormNombreLibre      = '';
  pedidoFormTelefonoLibre    = '';
  pedidoFormNotasPrevias     = '';
  pedidoFormRequiereFactura  = false;
  pedidoFormTipoPersona:    'pf' | 'pm' = 'pm';
  pedidoFormCotizacionId:    number | null = null;

  constructor(private posService: PosService, private http: HttpClient, private facturasService: FacturasService) {}

  ngOnInit(): void {
    this.cargar();
    this.busquedaClienteConvertir.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    ).subscribe(q => {
      if (!q || q.length < 2) { this.resultadosClienteConvertir = []; return; }
      this.buscarClientesConvertir(q);
    });
  }

  abrirConvertirAPedido(cot: any): void {
    this.cargandoPedidoFormCot = true;
    this.errorPedidoFormCot    = '';
    this.posService.getCotizacionById(cot.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        const cotiz = r.data as CotizacionDetalle;
        this.pedidoFormCarrito = cotiz.detalle.map(d => ({
          inventario_id:         d.inventario_id,
          nombre_producto:       d.nombre_producto,
          sku:                   d.sku,
          es_servicio:           d.es_servicio,
          es_item_libre:         d.es_item_libre,
          cantidad:              d.cantidad,
          precio_unitario:       d.precio_unitario,
          descuento_linea_pct:   d.descuento_linea_pct,
          descuento_linea_monto: d.descuento_linea_monto,
          subtotal_linea:        d.subtotal_linea,
          _id_ui:                `cotiz-${d.id}`,
        }));
        this.pedidoFormTotales         = { subtotal: cotiz.subtotal, descuentoMonto: cotiz.descuento_monto, total: cotiz.total };
        this.pedidoFormDescPct         = cotiz.descuento_pct;
        this.pedidoFormCliente         = cotiz.cliente_id
          ? { id: cotiz.cliente_id, nombreComercial: cotiz.cliente_nombre_comercial || cotiz.cliente_nombre, nombre: cotiz.cliente_nombre, telefono: cotiz.cliente_telefono || null }
          : null;
        this.pedidoFormNombreLibre     = (!cotiz.cliente_id && cotiz.cliente_nombre && cotiz.cliente_nombre !== 'Público General')
          ? cotiz.cliente_nombre : '';
        this.pedidoFormTelefonoLibre   = (!cotiz.cliente_id && cotiz.cliente_telefono) ? cotiz.cliente_telefono : '';
        this.pedidoFormNotasPrevias    = cotiz.notas || '';
        this.pedidoFormRequiereFactura = !!cotiz.requiere_factura;
        this.pedidoFormTipoPersona     = cotiz.tipo_persona_factura || 'pm';
        this.pedidoFormCotizacionId    = cotiz.id;
        this.cargandoPedidoFormCot     = false;
        this.mostrarPedidoFormCot      = false;
        setTimeout(() => { this.mostrarPedidoFormCot = true; });
      },
      error: (e) => {
        this.cargandoPedidoFormCot = false;
        this.errorPedidoFormCot    = e?.error?.error?.message || 'Error al cargar cotización';
      }
    });
  }

  onPedidoGuardadoDesdeCotizacion(_pedido: any): void {
    this.mostrarPedidoFormCot   = false;
    this.pedidoFormCotizacionId = null;
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
    this.filtroEstatus = 'pendiente';
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
    this.cotizacionConvertirId        = cot.id;
    this.cotizacionConvertirClienteId = cot.cliente_id || null;
    this.cotizacionConvertirTotal     = parseFloat(cot.total);
    this.totalConFacturaConvertir     = null;
    this.pagosConvertir               = [];
    this.pagosConvertirValidos        = false;
    this.metodoPagoConvertir          = 'efectivo';
    this.montoRecibidoConvertir       = null;
    this.notasConvertir               = cot.notas || '';
    this.errorConvertir               = '';
    this.requiereFacturaConvertir     = !!(cot.requiere_factura);
    this.tipoPersonaConvertir         = cot.tipo_persona_factura || 'pm';
    this.clienteFacturaConvertir      = cot.cliente_id ? { id: cot.cliente_id, nombreComercial: cot.cliente_nombre } : null;
    this.busquedaClienteConvertir.setValue('', { emitEvent: false });
    this.resultadosClienteConvertir   = [];
    this.mostrarPanelConvertir        = true;
    if (this.requiereFacturaConvertir) this.recalcularTotalConFacturaConvertir();
  }

  recalcularTotalConFacturaConvertir(): void {
    this.facturasService.calcularImpuestos(this.cotizacionConvertirTotal, this.tipoPersonaConvertir)
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: (r) => { this.totalConFacturaConvertir = r.data?.total ?? null; } });
  }

  onToggleFacturaConvertir(): void {
    if (this.requiereFacturaConvertir) {
      this.recalcularTotalConFacturaConvertir();
    } else {
      this.totalConFacturaConvertir = null;
    }
  }

  cerrarConvertir(): void {
    this.mostrarPanelConvertir        = false;
    this.cotizacionConvertirId        = null;
    this.cotizacionConvertirClienteId = null;
    this.totalConFacturaConvertir     = null;
    this.tipoPersonaConvertir         = 'pm';
    this.pagosConvertir               = [];
    this.pagosConvertirValidos        = false;
    this.errorConvertir               = '';
    this.clienteFacturaConvertir      = null;
    this.busquedaClienteConvertir.setValue('', { emitEvent: false });
    this.resultadosClienteConvertir   = [];
  }

  private buscarClientesConvertir(q: string): void {
    this.buscandoClienteConvertir = true;
    const params = new HttpParams().set('q', q).set('limit', '8');
    this.http.get<any>(`${environment.apiUrl}/clientes`, { params }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (r) => {
        this.resultadosClienteConvertir = (r.data || r || []).map((c: any) => ({
          id:              c.id,
          nombreComercial: c.nombre_comercial || c.nombreComercial || c.razon_social || c.razonSocial,
          rfc:             c.rfc,
        }));
        this.buscandoClienteConvertir = false;
      },
      error: () => { this.buscandoClienteConvertir = false; }
    });
  }

  seleccionarClienteConvertir(c: any): void {
    this.clienteFacturaConvertir = c;
    this.resultadosClienteConvertir = [];
    this.busquedaClienteConvertir.setValue('', { emitEvent: false });
  }

  quitarClienteConvertir(): void {
    this.clienteFacturaConvertir = null;
  }

  get totalEfectivoConvertir(): number {
    return this.requiereFacturaConvertir && this.totalConFacturaConvertir !== null
      ? this.totalConFacturaConvertir
      : this.cotizacionConvertirTotal;
  }

  get cambioConvertir(): number {
    const p0 = this.pagosConvertir[0];
    if (!p0 || p0.codigo !== 'efectivo') return 0;
    return Math.max(0, (p0.monto_recibido ?? 0) - this.totalEfectivoConvertir);
  }

  get puedeConfirmarConvertir(): boolean {
    if (this.procesandoConvertir) return false;
    if (this.requiereFacturaConvertir && !this.clienteFacturaConvertir?.id) return false;
    return this.pagosConvertirValidos;
  }

  onPagosConvertirChange(p: PagoInput[]): void { this.pagosConvertir = p; }
  onPagosConvertirValidChange(v: boolean): void { this.pagosConvertirValidos = v; }

  confirmarConvertir(): void {
    if (!this.cotizacionConvertirId) return;

    if (this.requiereFacturaConvertir && !this.clienteFacturaConvertir?.id) {
      this.errorConvertir = 'Para facturar selecciona el cliente en el campo de búsqueda.';
      return;
    }

    this.procesandoConvertir = true;
    this.errorConvertir      = '';

    this.posService.convertirCotizacion(
      this.cotizacionConvertirId,
      this.pagosConvertir,
      this.notasConvertir || undefined,
      this.requiereFacturaConvertir,
      this.clienteFacturaConvertir?.id || null,
      this.tipoPersonaConvertir
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
      aceptada:  'bg-success text-white',
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
