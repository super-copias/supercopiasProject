import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, finalize, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { FormControl } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../../../environments/environment';
import { PosService, PagoInput, CatalogoItem } from '../../../../../services/pos.service';
import { FacturasService } from '../../../../../services/facturas.service';

@Component({
  selector: 'app-pos-pedidos-list',
  templateUrl: './pedidos-list.component.html',
  styleUrls: ['./pedidos-list.component.scss'],
})
export class PedidosListComponent implements OnInit, OnDestroy {
  @Output() irANuevaVenta = new EventEmitter<void>();
  @Output() statsActualizadas = new EventEmitter<number>();

  private destroy$ = new Subject<void>();

  pedidos: any[] = [];
  cargando = false;
  error = '';

  // Paginación
  readonly LIMIT = 18;
  paginaActual = 1;
  totalPaginas = 1;
  totalRegistros = 0;

  // Filtros
  filtroEstatus = '';      // '' = solo activos (pendiente/en_proceso/terminado)
  filtroBusqueda = '';

  // Modales
  pedidoDetalle: any = null;
  mostrarDetalle = false;
  procesando: { [id: number]: boolean } = {};
  errorAccion: { [id: number]: string } = {};

  // Ticket de pedido (para reimprimir desde detalle)
  pedidoTicketReimprimir: any = null;
  mostrarTicketPedido = false;

  // Ticket de venta (post-entrega)
  ventaEntregada: any = null;
  mostrarTicketVenta = false;

  // Modal entregar
  mostrarModalEntregar = false;
  pedidoEntregar: any = null;
  metodoPagoSaldo: 'efectivo' | 'tarjeta' | 'transferencia' = 'efectivo'; // legacy
  montoRecibidoSaldo: number | null = null; // legacy
  pagosSaldo: PagoInput[] = [];
  pagosSaldoValidos = false;
  notasEntrega = '';
  procesandoEntrega = false;
  errorEntrega = '';

  // Facturación en entrega
  requiereFacturaEntregar = false;
  tipoPersonaEntregar: 'pf' | 'pm' = 'pm';
  clienteFacturaEntregar: any = null;
  busquedaClienteEntregar = new FormControl('');
  resultadosClienteEntregar: any[] = [];
  buscandoClienteEntregar = false;
  totalConFacturaEntregar: number | null = null;

  // Modal cancelar
  mostrarModalCancelar = false;
  pedidoCancelar: any = null;
  motivoCancelacion = '';
  procesandoCancelacion = false;
  errorCancelacion = '';

  // Modal editar cantidades
  mostrarModalEditar = false;
  pedidoEditar: any = null;
  lineasEditar: {
    detalle_id: number;
    nombre_producto: string;
    precio_unitario: number;
    cantidad: number;
    descuento_linea_pct: number;
    subtotal_linea: number;
    es_servicio: boolean;
    es_item_libre: boolean;
    inventario_id: number | null;
    _esNuevo: boolean;
    _eliminado: boolean;
  }[] = [];
  notasEditar = '';
  procesandoEditar = false;
  errorEditar = '';
  totalConFacturaEditar: number | null = null;

  // Buscador de catálogo dentro del modal editar
  busquedaEditar = new FormControl('');
  catalogoEditar: CatalogoItem[] = [];
  catalogoCargado = false;
  resultadosBusquedaEditar: CatalogoItem[] = [];

  // Modal ítem libre dentro de editar
  mostrarModalLibreEditar = false;
  itemLibreEditar = { nombre: '', precio: 0, cantidad: 1 };

  readonly ESTATUS_LABELS: Record<string, string> = {
    pendiente:  'Pendiente',
    en_proceso: 'En proceso',
    terminado:  'Terminado',
    finalizado: 'Finalizado',
    cancelado:  'Cancelado',
  };
  readonly ESTATUS_CLASES: Record<string, string> = {
    pendiente:  'badge-pendiente',
    en_proceso: 'badge-proceso',
    terminado:  'badge-terminado',
    finalizado: 'badge-finalizado',
    cancelado:  'badge-cancelado',
  };

  constructor(private posService: PosService, private http: HttpClient, private facturasService: FacturasService) {}

  ngOnInit(): void {
    this.cargar();
    this.busquedaClienteEntregar.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    ).subscribe(q => {
      if (!q || q.length < 2) { this.resultadosClienteEntregar = []; return; }
      this.buscarClientesEntregar(q);
    });
    this.busquedaEditar.valueChanges.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    ).subscribe(q => this.filtrarCatalogoEditar(q || ''));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargar(): void {
    this.cargando = true;
    this.error = '';

    const f: any = { page: this.paginaActual, limit: this.LIMIT };

    // '' = solo activos; 'todos' = sin filtro de estatus; 'atrasados' = vencidos; otro = estatus específico
    if (this.filtroEstatus === '') {
      f.solo_activos = true;
    } else if (this.filtroEstatus === 'atrasados') {
      f.solo_atrasados = true;
    } else if (this.filtroEstatus !== 'todos') {
      f.estatus = this.filtroEstatus;
    }

    if (this.filtroBusqueda.trim()) f.busqueda = this.filtroBusqueda.trim();

    this.posService.listPedidos(f).pipe(
      takeUntil(this.destroy$),
      finalize(() => this.cargando = false)
    ).subscribe({
      next: (r) => {
        this.pedidos = r.data || [];
        this.totalRegistros = r.pagination?.total ?? this.pedidos.length;
        this.totalPaginas   = r.pagination?.pages ?? 1;
        // Emitir conteo activos
        const activos = this.pedidos.filter(p =>
          ['pendiente','en_proceso','terminado'].includes(p.estatus)).length;
        this.statsActualizadas.emit(activos);
      },
      error: () => { this.error = 'Error al cargar pedidos'; }
    });
  }

  cambiarFiltro(): void {
    this.paginaActual = 1;
    this.cargar();
  }

  irAPagina(n: number): void {
    if (n < 1 || n > this.totalPaginas || n === this.paginaActual) return;
    this.paginaActual = n;
    this.cargar();
  }

  get paginasVisibles(): number[] {
    const total = this.totalPaginas;
    const actual = this.paginaActual;
    const rango = 2; // páginas a cada lado
    const inicio = Math.max(1, actual - rango);
    const fin    = Math.min(total, actual + rango);
    const paginas: number[] = [];
    for (let i = inicio; i <= fin; i++) paginas.push(i);
    return paginas;
  }

  get rangoFin(): number {
    return Math.min(this.paginaActual * this.LIMIT, this.totalRegistros);
  }

  esAtrasado(p: any): boolean {
    if (!p.fecha_acordada || ['terminado','finalizado','cancelado'].includes(p.estatus)) return false;
    return new Date(p.fecha_acordada) < new Date();
  }

  totalMostradoPedido(p: any): number {
    const totalBase = parseFloat(p?.total || 0);
    const anticipo = parseFloat(p?.anticipo || 0);
    const saldo = this.restaPedido(p);
    return parseFloat((saldo + anticipo).toFixed(2)) || totalBase;
  }

  restaPedido(p: any): number {
    const totalBase = parseFloat(p?.total || 0);
    const anticipo = parseFloat(p?.anticipo || 0);
    const saldoCalculado = parseFloat((totalBase - anticipo).toFixed(2));
    const saldoPersistido = p?.saldo_pendiente;
    const saldo = saldoPersistido != null ? parseFloat(saldoPersistido) : saldoCalculado;
    return parseFloat(Math.max(0, saldo).toFixed(2));
  }

  // ── Acciones ──────────────────────────────────────────────────

  tomar(p: any): void {
    this.procesando[p.id] = true;
    this.errorAccion[p.id] = '';
    this.posService.tomarPedido(p.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { delete this.procesando[p.id]; this.cargar(); },
      error: (e) => {
        this.errorAccion[p.id] = e?.error?.error?.message || 'Error';
        delete this.procesando[p.id];
      }
    });
  }

  terminar(p: any): void {
    this.procesando[p.id] = true;
    this.errorAccion[p.id] = '';
    this.posService.terminarPedido(p.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { delete this.procesando[p.id]; this.cargar(); },
      error: (e) => {
        this.errorAccion[p.id] = e?.error?.error?.message || 'Error';
        delete this.procesando[p.id];
      }
    });
  }

  abrirEntregar(p: any): void {
    this.pedidoEntregar = p;
    this.metodoPagoSaldo = 'efectivo';
    this.montoRecibidoSaldo = null;
    this.pagosSaldo = [];
    this.pagosSaldoValidos = false;
    this.notasEntrega = '';
    this.errorEntrega = '';
    this.requiereFacturaEntregar = !!p.requiere_factura;
    this.tipoPersonaEntregar = p.tipo_persona_factura || 'pm';
    this.clienteFacturaEntregar = p.cliente_id ? { id: p.cliente_id, nombreComercial: p.cliente_nombre } : null;
    this.busquedaClienteEntregar.setValue('', { emitEvent: false });
    this.resultadosClienteEntregar = [];
    this.totalConFacturaEntregar = null;
    this.mostrarModalEntregar = true;
    if (this.requiereFacturaEntregar) {
      this.recalcularTotalConFactura();
    }
  }

  recalcularTotalConFactura(): void {
    if (!this.pedidoEntregar) return;
    this.facturasService.calcularImpuestos(parseFloat(this.pedidoEntregar.total), this.tipoPersonaEntregar)
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: (r) => { this.totalConFacturaEntregar = r.data?.total ?? null; } });
  }

  onToggleFacturaEntregar(): void {
    if (this.requiereFacturaEntregar) {
      this.recalcularTotalConFactura();
    } else {
      this.totalConFacturaEntregar = null;
    }
  }

  private buscarClientesEntregar(q: string): void {
    this.buscandoClienteEntregar = true;
    const params = new HttpParams().set('q', q).set('limit', '8');
    this.http.get<any>(`${environment.apiUrl}/clientes`, { params }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (r) => {
        this.resultadosClienteEntregar = (r.data || r || []).map((c: any) => ({
          id:              c.id,
          nombreComercial: c.nombre_comercial || c.nombreComercial || c.razon_social || c.razonSocial,
          rfc:             c.rfc,
        }));
        this.buscandoClienteEntregar = false;
      },
      error: () => { this.buscandoClienteEntregar = false; }
    });
  }

  seleccionarClienteEntregar(c: any): void {
    this.clienteFacturaEntregar = c;
    this.resultadosClienteEntregar = [];
    this.busquedaClienteEntregar.setValue('', { emitEvent: false });
  }

  quitarClienteEntregar(): void {
    this.clienteFacturaEntregar = null;
  }

  puedeConfirmarEntrega(): boolean {
    if (!this.pedidoEntregar) return false;
    if (this.procesandoEntrega) return false;
    if (this.requiereFacturaEntregar && !this.clienteFacturaEntregar?.id) return false;
    return this.pagosSaldoValidos;
  }

  onPagosSaldoChange(p: PagoInput[]): void { this.pagosSaldo = p; }
  onPagosSaldoValidChange(v: boolean): void { this.pagosSaldoValidos = v; }

  confirmarEntrega(): void {
    if (!this.pedidoEntregar) return;
    this.procesandoEntrega = true;
    this.errorEntrega = '';
    this.posService.entregarPedido(
      this.pedidoEntregar.id,
      this.pagosSaldo,
      this.notasEntrega || undefined,
      this.requiereFacturaEntregar,
      this.clienteFacturaEntregar?.id || null,
      this.tipoPersonaEntregar,
    ).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.procesandoEntrega = false;
        this.mostrarModalEntregar = false;
        const ventaId = r.data?.venta_id;
        if (ventaId) {
          this.posService.getVentaById(ventaId).pipe(takeUntil(this.destroy$)).subscribe({
            next: (vr) => {
              this.ventaEntregada = vr.data;
              this.mostrarTicketVenta = true;
            },
            error: () => this.cargar(),
          });
        }
        this.cargar();
      },
      error: (e) => {
        this.errorEntrega = e?.error?.error?.message || 'Error al entregar';
        this.procesandoEntrega = false;
      }
    });
  }

  reimprimir(p: any): void {
    this.pedidoTicketReimprimir = null;
    this.mostrarDetalle = false;
    this.posService.getPedidoById(p.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.pedidoTicketReimprimir = r.data;
        this.mostrarTicketPedido = true;
      }
    });
  }

  abrirCancelar(p: any): void {
    this.pedidoCancelar = p;
    this.motivoCancelacion = '';
    this.errorCancelacion = '';
    this.mostrarModalCancelar = true;
  }

  confirmarCancelacion(): void {
    if (!this.pedidoCancelar) return;
    this.procesandoCancelacion = true;
    this.errorCancelacion = '';
    this.posService.cancelarPedido(this.pedidoCancelar.id, this.motivoCancelacion || undefined).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.procesandoCancelacion = false;
        this.mostrarModalCancelar = false;
        this.cargar();
      },
      error: (e) => {
        this.errorCancelacion = e?.error?.error?.message || 'Error al cancelar';
        this.procesandoCancelacion = false;
      }
    });
  }

  verDetalle(p: any): void {
    this.pedidoDetalle = null;
    this.mostrarDetalle = true;
    this.posService.getPedidoById(p.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.pedidoDetalle = r.data; },
      error: () => { this.mostrarDetalle = false; }
    });
  }

  // ── Editar cantidades ─────────────────────────────────────

  abrirEditar(p: any): void {
    // Siempre cargamos el detalle fresco del servidor para tener las cantidades actuales
    this.posService.getPedidoById(p.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        const pedido = r.data;
        this.pedidoEditar = pedido;
        this.lineasEditar = (pedido.detalle || []).map((d: any) => ({
          detalle_id:         d.id,
          nombre_producto:    d.nombre_producto,
          precio_unitario:    parseFloat(d.precio_unitario),
          cantidad:           parseFloat(d.cantidad),
          descuento_linea_pct: parseFloat(d.descuento_linea_pct || 0),
          subtotal_linea:     parseFloat(d.subtotal_linea),
          es_servicio:        !!d.es_servicio,
          es_item_libre:      !!d.es_item_libre,
          inventario_id:      d.inventario_id || null,
          _esNuevo:    false,
          _eliminado:  false,
        }));
        this.notasEditar = '';
        this.errorEditar = '';
        this.totalConFacturaEditar = null;
        this.busquedaEditar.setValue('', { emitEvent: false });
        this.resultadosBusquedaEditar = [];
        this.mostrarModalEditar = true;
        if (pedido.requiere_factura) {
          this.recalcularTotalConFacturaEditar();
        }
        // Cargar catálogo una vez por sesión del modal
        if (!this.catalogoCargado) {
          this.posService.getCatalogo().pipe(takeUntil(this.destroy$)).subscribe({
            next: (cr) => {
              this.catalogoEditar = cr.data || [];
              this.catalogoCargado = true;
            },
          });
        }
      },
    });
  }

  onCantidadEditarChange(linea: any): void {
    const cant = parseFloat(linea.cantidad) || 0;
    const base = cant * linea.precio_unitario;
    const desc = base * (linea.descuento_linea_pct / 100);
    linea.subtotal_linea = parseFloat((base - desc).toFixed(2));
    if (this.pedidoEditar?.requiere_factura) {
      this.recalcularTotalConFacturaEditar();
    }
  }

  forzarEnteroEditar(linea: any): void {
    const val = Math.floor(parseFloat(linea.cantidad) || 1);
    linea.cantidad = val < 1 ? 1 : val;
    this.onCantidadEditarChange(linea);
  }

  recalcularTotalConFacturaEditar(): void {
    if (!this.pedidoEditar) return;
    this.facturasService.calcularImpuestos(this.nuevoTotalEditar, this.pedidoEditar.tipo_persona_factura || 'pm')
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: (r) => { this.totalConFacturaEditar = r.data?.total ?? null; } });
  }

  get lineasActivasEditar() {
    return this.lineasEditar.filter(l => !l._eliminado);
  }

  get nuevoSubtotalEditar(): number {
    return parseFloat(this.lineasActivasEditar.reduce((s, l) => s + l.subtotal_linea, 0).toFixed(2));
  }

  get nuevoDescuentoMontoEditar(): number {
    if (!this.pedidoEditar) return 0;
    return parseFloat((this.nuevoSubtotalEditar * (parseFloat(this.pedidoEditar.descuento_pct) / 100)).toFixed(2));
  }

  get nuevoTotalEditar(): number {
    return parseFloat((this.nuevoSubtotalEditar - this.nuevoDescuentoMontoEditar).toFixed(2));
  }

  get nuevoTotalReferenciaEditar(): number {
    if (this.pedidoEditar?.requiere_factura && this.totalConFacturaEditar != null) {
      return this.totalConFacturaEditar;
    }
    return this.nuevoTotalEditar;
  }

  get nuevoSaldoPendienteEditar(): number {
    if (!this.pedidoEditar) return 0;
    const anticipo = parseFloat(this.pedidoEditar.anticipo || 0);
    return parseFloat(Math.max(0, this.nuevoTotalReferenciaEditar - anticipo).toFixed(2));
  }

  get anticipoSuperaTotalEditar(): boolean {
    if (!this.pedidoEditar) return false;
    const anticipo = parseFloat(this.pedidoEditar.anticipo || 0);
    return anticipo > 0 && anticipo > this.nuevoTotalReferenciaEditar + 0.01;
  }

  get hayModificacionEditar(): boolean {
    if (!this.pedidoEditar) return false;
    // Hay cambio si: alguna línea fue eliminada, o hay líneas nuevas, o alguna cantidad cambió
    const hayEliminados = this.lineasEditar.some(l => !l._esNuevo && l._eliminado);
    const hayNuevos     = this.lineasEditar.some(l => l._esNuevo && !l._eliminado);
    const hayCambiosCantidad = this.lineasEditar
      .filter(l => !l._esNuevo && !l._eliminado)
      .some(l => {
        const original = this.pedidoEditar.detalle.find((d: any) => d.id === l.detalle_id);
        return original && Math.abs(parseFloat(original.cantidad) - l.cantidad) > 0.0001;
      });
    return hayEliminados || hayNuevos || hayCambiosCantidad;
  }

  puedeConfirmarEditar(): boolean {
    if (!this.pedidoEditar || this.procesandoEditar) return false;
    if (!this.hayModificacionEditar) return false;
    if (this.anticipoSuperaTotalEditar) return false;
    if (this.lineasActivasEditar.length === 0) return false;
    return this.lineasActivasEditar.every(l => l.cantidad > 0);
  }

  // ── Gestión de líneas (marcar/quitar) ─────────────────────

  eliminarLineaEditar(linea: any): void {
    if (linea._esNuevo) {
      // Las líneas nuevas se quitan directamente del array
      this.lineasEditar = this.lineasEditar.filter(l => l !== linea);
    } else {
      // Las líneas originales se marcan como eliminadas (para poder revertir)
      linea._eliminado = true;
    }
    if (this.pedidoEditar?.requiere_factura) {
      this.recalcularTotalConFacturaEditar();
    }
  }

  restaurarLineaEditar(linea: any): void {
    linea._eliminado = false;
    if (this.pedidoEditar?.requiere_factura) {
      this.recalcularTotalConFacturaEditar();
    }
  }

  // ── Buscador de catálogo inline ───────────────────────────

  filtrarCatalogoEditar(q: string): void {
    if (!q.trim()) { this.resultadosBusquedaEditar = []; return; }
    const term = q.toLowerCase();
    this.resultadosBusquedaEditar = this.catalogoEditar
      .filter(i =>
        i.nombre.toLowerCase().includes(term) ||
        (i.sku || '').toLowerCase().includes(term)
      )
      .slice(0, 7);
  }

  agregarDesdeCatalogoEditar(item: CatalogoItem): void {
    if (item.nivel_stock === 'sin_stock' && !item.es_servicio) return;
    this.lineasEditar.push({
      detalle_id:         null,
      nombre_producto:    item.nombre,
      precio_unitario:    item.precio_venta,
      cantidad:           1,
      descuento_linea_pct: 0,
      subtotal_linea:     item.precio_venta,
      es_servicio:        item.es_servicio,
      es_item_libre:      false,
      inventario_id:      item.id,
      _esNuevo:   true,
      _eliminado: false,
    });
    this.busquedaEditar.setValue('', { emitEvent: false });
    this.resultadosBusquedaEditar = [];
    if (this.pedidoEditar?.requiere_factura) {
      this.recalcularTotalConFacturaEditar();
    }
  }

  badgeStockEditar(nivel: string): string {
    const m: Record<string, string> = { ok: 'success', bajo: 'warning', critico: 'danger', sin_stock: 'secondary', servicio: 'info' };
    return m[nivel] || 'secondary';
  }

  // ── Ítem libre dentro del modal editar ────────────────────

  abrirItemLibreEditar(): void {
    this.itemLibreEditar = { nombre: '', precio: 0, cantidad: 1 };
    this.mostrarModalLibreEditar = true;
  }

  confirmarItemLibreEditar(): void {
    const { nombre, precio, cantidad } = this.itemLibreEditar;
    if (!nombre.trim() || precio <= 0 || cantidad <= 0) return;
    this.lineasEditar.push({
      detalle_id:         null,
      nombre_producto:    nombre.trim(),
      precio_unitario:    precio,
      cantidad,
      descuento_linea_pct: 0,
      subtotal_linea:     parseFloat((precio * cantidad).toFixed(2)),
      es_servicio:        false,
      es_item_libre:      true,
      inventario_id:      null,
      _esNuevo:   true,
      _eliminado: false,
    });
    this.mostrarModalLibreEditar = false;
    if (this.pedidoEditar?.requiere_factura) {
      this.recalcularTotalConFacturaEditar();
    }
  }

  confirmarEditar(): void {
    if (!this.pedidoEditar || !this.puedeConfirmarEditar()) return;
    this.procesandoEditar = true;
    this.errorEditar = '';

    const items_cantidad = this.lineasEditar
      .filter(l => !l._esNuevo && !l._eliminado)
      .filter(l => {
        const original = this.pedidoEditar.detalle.find((d: any) => d.id === l.detalle_id);
        return original && Math.abs(parseFloat(original.cantidad) - l.cantidad) > 0.0001;
      })
      .map(l => ({ detalle_id: l.detalle_id as number, cantidad: l.cantidad }));

    const items_eliminar = this.lineasEditar
      .filter(l => !l._esNuevo && l._eliminado && l.detalle_id !== null)
      .map(l => l.detalle_id as number);

    const items_agregar = this.lineasEditar
      .filter(l => l._esNuevo && !l._eliminado)
      .map(l => ({
        inventario_id:      l.inventario_id,
        nombre_producto:    l.nombre_producto,
        sku:                undefined as string | undefined,
        es_servicio:        l.es_servicio,
        es_item_libre:      l.es_item_libre,
        cantidad:           l.cantidad,
        precio_unitario:    l.precio_unitario,
        descuento_linea_pct: l.descuento_linea_pct,
      }));

    this.posService.actualizarItemsPedido(this.pedidoEditar.id, {
      items_cantidad,
      items_eliminar,
      items_agregar,
      notas: this.notasEditar || undefined,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.procesandoEditar = false;
        this.mostrarModalEditar = false;
        if (this.mostrarDetalle && this.pedidoDetalle?.id === this.pedidoEditar.id) {
          this.posService.getPedidoById(this.pedidoEditar.id).pipe(takeUntil(this.destroy$)).subscribe({
            next: (r) => { this.pedidoDetalle = r.data; },
          });
        }
        this.cargar();
      },
      error: (e) => {
        this.errorEditar = e?.error?.error?.message || 'Error al actualizar pedido';
        this.procesandoEditar = false;
      },
    });
  }
}
