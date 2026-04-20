import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { PosService } from '../../../../../services/pos.service';

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

  // Filtros
  filtroEstatus = '';
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
    const f: any = {};
    if (this.filtroEstatus) f.estatus = this.filtroEstatus;
    if (this.filtroBusqueda) f.q = this.filtroBusqueda;

    this.posService.listPedidos(f).pipe(
      takeUntil(this.destroy$),
      finalize(() => this.cargando = false)
    ).subscribe({
      next: (r) => {
        this.pedidos = r.data || [];
        // Emitir conteo activos
        const activos = this.pedidos.filter(p =>
          ['pendiente','en_proceso','terminado'].includes(p.estatus)).length;
        this.statsActualizadas.emit(activos);
      },
      error: () => { this.error = 'Error al cargar pedidos'; }
    });
  }

  get pedidosFiltrados(): any[] {
    return this.pedidos;
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
    this.mostrarModalEntregar = true;
  }

  puedeConfirmarEntrega(): boolean {
    if (!this.pedidoEntregar) return false;
    const saldo = this.pedidoEntregar.saldo_pendiente ?? (this.pedidoEntregar.total - this.pedidoEntregar.anticipo);
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
      this.notasEntrega || undefined
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
