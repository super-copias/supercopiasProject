import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../../../environments/environment';
import { PosService, LineaCarrito, PedidoPayload } from '../../../../../services/pos.service';

@Component({
  selector: 'app-pos-pedido-form',
  templateUrl: './pedido-form.component.html',
  styleUrls: ['./pedido-form.component.scss'],
})
export class PedidoFormComponent implements OnInit, OnDestroy {

  @Input() carrito: LineaCarrito[] = [];
  @Input() totales = { subtotal: 0, descuentoMonto: 0, total: 0 };
  @Input() descuentoGlobalPct = 0;
  @Input() descuentoConfigId: number | null = null;
  @Input() descuentoAutorizadoPor: string | null = null;
  @Input() clientePreseleccionado: any = null;
  @Input() requiereFactura = false;

  @Output() cerrado    = new EventEmitter<void>();
  @Output() generado   = new EventEmitter<any>();

  private destroy$ = new Subject<void>();

  // Cliente
  clienteSeleccionado: any = null;
  busquedaCliente = new FormControl('');
  resultadosCliente: any[] = [];
  buscandoCliente = false;

  folioPrev = '';
  procesando = false;
  error = '';

  // Estado post-guardado: mostrar ticket
  pedidoCreado: any = null;
  mostrarTicketPedido = false;

  form = {
    cliente_nombre:       '',
    cliente_telefono:     '',
    via_whatsapp:         false,
    requiere_factura:     false,
    anticipo:             0,
    notas_anticipo:       '',
    metodo_pago_anticipo: 'efectivo',
    fecha_acordada:       '',
    hora_acordada:        '',
    notas:                '',
  };

  constructor(
    private posService: PosService,
    private http: HttpClient,
  ) {}

  ngOnInit(): void {
    if (this.clientePreseleccionado) {
      this.clienteSeleccionado = this.clientePreseleccionado;
    }
    this.form.requiere_factura = this.requiereFactura;

    this.busquedaCliente.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    ).subscribe(q => {
      if (!q || q.length < 2) { this.resultadosCliente = []; return; }
      this.buscarClientes(q);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private buscarClientes(q: string): void {
    this.buscandoCliente = true;
    const params = new HttpParams().set('q', q).set('limit', '8');
    this.http.get<any>(`${environment.apiUrl}/clientes`, { params }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (r) => {
        this.resultadosCliente = (r.data || r || []).map((c: any) => ({
          id:              c.id,
          nombreComercial: c.nombre_comercial || c.nombreComercial || c.razon_social || c.razonSocial,
          razonSocial:     c.razon_social || c.razonSocial,
          email:           c.email,
          telefono:        c.telefono,
        }));
        this.buscandoCliente = false;
      },
      error: () => { this.buscandoCliente = false; }
    });
  }

  seleccionarCliente(c: any): void {
    this.clienteSeleccionado = c;
    this.resultadosCliente   = [];
    this.busquedaCliente.setValue('', { emitEvent: false });
  }

  quitarCliente(): void {
    this.clienteSeleccionado = null;
  }

  cerrar(): void {
    if (!this.procesando) this.cerrado.emit();
  }

  get minimoAnticipo(): number {
    return parseFloat((this.totales.total * 0.20).toFixed(2));
  }

  get anticipoValido(): boolean {
    const a = this.form.anticipo;
    return a >= this.minimoAnticipo && a <= this.totales.total;
  }

  confirmar(): void {
    if (this.carrito.length === 0) {
      this.error = 'El carrito está vacío';
      return;
    }

    if (this.form.requiere_factura && !this.clienteSeleccionado?.id) {
      this.error = 'Para generar factura debes seleccionar un cliente registrado en el sistema con RFC y datos fiscales.';
      return;
    }

    if (!this.anticipoValido) {
      this.error = `El anticipo debe ser al menos el 20% del total ($${this.minimoAnticipo.toFixed(2)}) y no mayor al total ($${this.totales.total.toFixed(2)})`;
      return;
    }

    // Combinar fecha + hora si ambas están disponibles
    let fechaAcordada: string | null = null;
    if (this.form.fecha_acordada) {
      const hora = this.form.hora_acordada || '00:00';
      fechaAcordada = `${this.form.fecha_acordada}T${hora}:00`;
    }

    const payload: PedidoPayload = {
      cliente_id:             this.clienteSeleccionado?.id || null,
      cliente_nombre:         this.clienteSeleccionado
                                ? undefined
                                : (this.form.cliente_nombre || undefined),
      cliente_telefono:       this.clienteSeleccionado?.telefono || this.form.cliente_telefono || undefined,
      via_whatsapp:           this.form.via_whatsapp,
      requiere_factura:       this.form.requiere_factura,
      items: this.carrito.map(({
        _foto_url, _nivel_stock, _existencia_actual, _id_ui, _precio_base, _tabulador, _tabulador_activo,
        ...rest
      }) => rest),
      descuento_pct:          this.descuentoGlobalPct,
      descuento_config_id:    this.descuentoConfigId,
      descuento_autorizado_por: this.descuentoAutorizadoPor,
      anticipo:               this.form.anticipo,
      metodo_pago_anticipo:   this.form.metodo_pago_anticipo,
      fecha_acordada:         fechaAcordada,
      notas:                  [this.form.notas, this.form.notas_anticipo ? `Ref. anticipo: ${this.form.notas_anticipo}` : ''].filter(Boolean).join(' | ') || undefined,
    };

    this.posService.createPedido(payload).subscribe({
      next: (r) => {
        this.procesando = false;
        this.pedidoCreado = r.data;
        this.mostrarTicketPedido = true;
      },
      error: (e) => {
        this.error = e?.error?.error?.message || 'Error al guardar el pedido';
        this.procesando = false;
      }
    });
  }

  onCerrarTicket(): void {
    this.generado.emit(this.pedidoCreado);
  }
}
