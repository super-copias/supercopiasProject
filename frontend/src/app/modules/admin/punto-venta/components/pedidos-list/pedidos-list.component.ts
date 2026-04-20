import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, finalize, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { FormControl } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../../../environments/environment';
import { PosService } from '../../../../../services/pos.service';
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
  metodoPagoSaldo: 'efectivo' | 'tarjeta' | 'transferencia' = 'efectivo';
  montoRecibidoSaldo: number | null = null;
  notasEntrega = '';
  procesandoEntrega = false;
  errorEntrega = '';

  // Facturación en entrega
  requiereFacturaEntregar = false;
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
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargar(): void {
    this.cargando = true;
    this.error = '';

    const f: any = { page: this.paginaActual, limit: this.LIMIT };

    // '' = solo activos; 'todos' = sin filtro de estatus; otro = estatus específico
    if (this.filtroEstatus === '') {
      f.solo_activos = true;
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
    if (!p.fecha_acordada || ['finalizado','cancelado'].includes(p.estatus)) return false;
    return new Date(p.fecha_acordada) < new Date();
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
    this.notasEntrega = '';
    this.errorEntrega = '';
    this.requiereFacturaEntregar = !!(p.requiere_factura);
    this.clienteFacturaEntregar = p.cliente_id ? { id: p.cliente_id, nombreComercial: p.cliente_nombre } : null;
    this.busquedaClienteEntregar.setValue('', { emitEvent: false });
    this.resultadosClienteEntregar = [];
    this.totalConFacturaEntregar = null;
    this.mostrarModalEntregar = true;
    if (this.requiereFacturaEntregar) this.recalcularTotalConFactura();
  }

  recalcularTotalConFactura(): void {
    if (!this.pedidoEntregar) return;
    this.facturasService.calcularImpuestos(parseFloat(this.pedidoEntregar.total))
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
    const base = this.requiereFacturaEntregar && this.totalConFacturaEntregar !== null
      ? this.totalConFacturaEntregar
      : parseFloat(this.pedidoEntregar.total);
    const anticipo = parseFloat(this.pedidoEntregar.anticipo || 0);
    const saldo = parseFloat((base - anticipo).toFixed(2));
    return this.montoRecibidoSaldo !== null && this.montoRecibidoSaldo >= saldo;
  }

  confirmarEntrega(): void {
    if (!this.pedidoEntregar) return;
    this.procesandoEntrega = true;
    this.errorEntrega = '';
    this.posService.entregarPedido(
      this.pedidoEntregar.id,
      this.metodoPagoSaldo,
      this.montoRecibidoSaldo ?? undefined,
      this.notasEntrega || undefined,
      this.requiereFacturaEntregar,
      this.clienteFacturaEntregar?.id || null,
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
}
