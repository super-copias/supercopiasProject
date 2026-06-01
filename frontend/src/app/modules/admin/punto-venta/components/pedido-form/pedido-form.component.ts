import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../../../environments/environment';
import { PosService, LineaCarrito, PedidoPayload, PagoInput } from '../../../../../services/pos.service';

@Component({
  selector: 'app-pos-pedido-form',
  templateUrl: './pedido-form.component.html',
  styleUrls: ['./pedido-form.component.scss'],
})
export class PedidoFormComponent implements OnInit, OnDestroy {
  private readonly mexicoCityTimeZone = 'America/Mexico_City';

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
  mostrarItems = true;
  totalFacturaPreview = 0;

  form = {
    cliente_nombre:       '',
    cliente_telefono:     '',
    via_whatsapp:         false,
    requiere_factura:     false,
    tipo_persona_factura: 'pm' as 'pf' | 'pm',
    anticipo:             0,
    notas_anticipo:       '',
    fecha_acordada:       '',
    hora_acordada:        '',
    notas:                '',
  };

  pagosAnticipo: PagoInput[] = [];
  pagosAnticipoValidos = false;

  get hayAnticipo(): boolean { return (this.form.anticipo ?? 0) > 0; }

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
    return parseFloat((this.totalReferenciaAnticipo * 0.20).toFixed(2));
  }

  get totalReferenciaAnticipo(): number {
    if (!this.form.requiere_factura) return this.totales.total;
    return this.totalFacturaPreview > 0 ? this.totalFacturaPreview : this.totales.total;
  }

  get anticipoValido(): boolean {
    const a = this.form.anticipo;
    return a >= 0 && a <= this.totalReferenciaAnticipo;
  }

  get hoyISO(): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Mexico_City',
      year:  'numeric',
      month: '2-digit',
      day:   '2-digit',
    }).format(new Date());
  }

  get fechaAcordadaEnPasado(): boolean {
    if (!this.form.fecha_acordada) return false;
    const hora = this.form.hora_acordada || '00:00';
    const fechaIngresada = this.parseFechaHoraMexicoCity(`${this.form.fecha_acordada}T${hora}:00`);
    if (!fechaIngresada) return true;
    return fechaIngresada <= new Date();
  }

  private parseFechaHoraMexicoCity(fechaHora: string): Date | null {
    const [fecha, hora = '00:00:00'] = String(fechaHora).split('T');
    if (!fecha || !hora) return null;

    const [anio, mes, dia] = fecha.split('-').map(Number);
    const [horas, minutos, segundos = 0] = hora.split(':').map(Number);
    if ([anio, mes, dia, horas, minutos, segundos].some(Number.isNaN)) return null;

    const utcGuess = Date.UTC(anio, mes - 1, dia, horas, minutos, segundos);
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: this.mexicoCityTimeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(new Date(utcGuess)).reduce((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {} as Record<string, string>);

    // Algunos runtimes pueden devolver hour=24 para medianoche; normalizar evita desfases.
    const hourNormalized = Number(parts.hour) === 24 ? 0 : Number(parts.hour);

    const zonedAsUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      hourNormalized,
      Number(parts.minute),
      Number(parts.second)
    );

    const offset = zonedAsUtc - utcGuess;
    return new Date(utcGuess - offset);
  }

  confirmar(): void {
    if (this.carrito.length === 0) {
      this.error = 'El carrito está vacío';
      return;
    }

    if (!this.clienteSeleccionado && !this.form.cliente_nombre.trim()) {
      this.error = 'El nombre del cliente es obligatorio.';
      return;
    }

    if (this.form.requiere_factura && !this.clienteSeleccionado?.id) {
      this.error = 'Para generar factura debes seleccionar un cliente registrado en el sistema con RFC y datos fiscales.';
      return;
    }

    if (!this.anticipoValido) {
      this.error = `El anticipo no puede ser mayor al total ($${this.totalReferenciaAnticipo.toFixed(2)})`;
      return;
    }

    if (this.hayAnticipo && !this.pagosAnticipoValidos) {
      this.error = 'Selecciona el método de pago del anticipo.';
      return;
    }

    if (!this.form.fecha_acordada) {
      this.error = 'La fecha de entrega es obligatoria.';
      return;
    }

    if (!this.form.hora_acordada) {
      this.error = 'La hora de entrega es obligatoria.';
      return;
    }

    if (this.fechaAcordadaEnPasado) {
      this.error = 'La fecha y hora de entrega no puede ser menor a la fecha y hora actual.';
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
      tipo_persona_factura:   this.form.tipo_persona_factura,
      items: this.carrito.map(({
        _foto_url, _nivel_stock, _existencia_actual, _id_ui, _precio_base, _tabulador, _tabulador_activo,
        ...rest
      }) => rest),
      descuento_pct:          this.descuentoGlobalPct,
      descuento_config_id:    this.descuentoConfigId,
      descuento_autorizado_por: this.descuentoAutorizadoPor,
      anticipo:               this.form.anticipo,
      pagos_anticipo:         this.form.anticipo > 0 ? this.pagosAnticipo : undefined,
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

  onPagosAnticipoChange(p: PagoInput[]): void {
    this.pagosAnticipo = p;
    if (p.length >= 2) { this.mostrarItems = false; }
    else { this.mostrarItems = true; }
  }
  onPagosAnticipoValidChange(v: boolean): void { this.pagosAnticipoValidos = v; }

  onFacturaTotalChange(total: number): void {
    this.totalFacturaPreview = Number(total) > 0 ? Number(total) : 0;
  }

  onCerrarTicket(): void {
    this.generado.emit(this.pedidoCreado);
  }
}
