import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FacturasService, FacturaResumen, FacturaDetalle, FiltrosFacturas } from '../../../services/facturas.service';
import { CatalogosService } from '../../../services/catalogos.service';

@Component({
  selector: 'app-facturacion',
  templateUrl: './facturacion.component.html',
  styleUrls: ['./facturacion.component.scss'],
})
export class FacturacionComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  facturas: FacturaResumen[] = [];
  cargando = false;
  error = '';

  // Filtros
  filtroDesde   = '';
  filtroHasta   = '';
  filtroEstatus = '';
  filtroOrigen  = '';
  filtroFolio   = '';

  // Paginación
  pagina    = 1;
  totalPags = 1;
  total     = 0;
  readonly POR_PAGINA = 20;

  // Contadores de estatus
  countEstatus = { pendiente: 0, generada: 0, cancelada: 0 };

  // Detalle
  facturaDetalle: FacturaDetalle | null = null;
  cargandoDetalle = false;
  errorDetalle = '';

  // Cancelación
  mostrarModalCancelar = false;
  motivoCancelacion    = '';
  errorCancelar        = '';
  procesandoCancelar   = false;

  // Catálogos SAT
  regimenMap: Record<string, string> = {};
  usoCfdiMap: Record<string, string> = {};

  constructor(private facturasService: FacturasService, private catalogosService: CatalogosService) {}

  ngOnInit(): void {
    this.cargar();
    this.cargarContadores();
    this.cargarCatalogos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Carga ──────────────────────────────────────────────────────

  cargar(): void {
    this.cargando = true;
    this.error = '';
    const filtros: FiltrosFacturas = {
      page:  this.pagina,
      limit: this.POR_PAGINA,
    };
    if (this.filtroDesde)   filtros.fecha_inicio = this.filtroDesde;
    if (this.filtroHasta)   filtros.fecha_fin    = this.filtroHasta;
    if (this.filtroEstatus) filtros.estatus      = this.filtroEstatus;
    if (this.filtroOrigen)  filtros.tipo_origen  = this.filtroOrigen;
    if (this.filtroFolio)   filtros.folio        = this.filtroFolio;

    this.facturasService.listFacturas(filtros)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r) => {
          this.facturas  = r.data?.data   || [];
          this.total     = r.data?.total  || 0;
          this.totalPags = r.data?.totalPags || 1;
          this.cargando  = false;
        },
        error: () => {
          this.error    = 'Error al cargar las facturas';
          this.cargando = false;
        },
      });
  }

  private cargarContadores(): void {
    // Cargar conteo por estatus (4 peticiones pequeñas)
    const ests = ['pendiente', 'generada', 'cancelada'] as const;
    ests.forEach(est => {
      this.facturasService.listFacturas({ estatus: est, limit: 1 })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (r) => { this.countEstatus[est] = r.data?.total || 0; },
        });
    });
  }

  private cargarCatalogos(): void {
    this.catalogosService.getRegimenesFiscales().pipe(takeUntil(this.destroy$)).subscribe({
      next: (list) => {
        this.regimenMap = {};
        list.forEach((r: any) => { this.regimenMap[r.codigo] = r.descripcion || r.nombre || r.codigo; });
      },
    });
    this.catalogosService.getUsosCFDI().pipe(takeUntil(this.destroy$)).subscribe({
      next: (list) => {
        this.usoCfdiMap = {};
        list.forEach(u => { this.usoCfdiMap[u.codigo] = u.descripcion; });
      },
    });
  }

  regimenLabel(codigo: string): string {
    return this.regimenMap[codigo] ? `${codigo} - ${this.regimenMap[codigo]}` : codigo;
  }

  usoCfdiLabel(codigo: string): string {
    return this.usoCfdiMap[codigo] ? `${codigo} - ${this.usoCfdiMap[codigo]}` : codigo;
  }

  buscar(): void {
    this.pagina = 1;
    this.cargar();
  }

  limpiarFiltros(): void {
    this.filtroDesde = this.filtroHasta = this.filtroEstatus = this.filtroOrigen = this.filtroFolio = '';
    this.pagina = 1;
    this.cargar();
  }

  filtrarPorEstatus(est: string): void {
    this.filtroEstatus = est;
    this.buscar();
  }

  cambiarPagina(p: number): void {
    if (p < 1 || p > this.totalPags) return;
    this.pagina = p;
    this.cargar();
  }

  get paginas(): number[] {
    const arr = [];
    const inicio = Math.max(1, this.pagina - 2);
    const fin    = Math.min(this.totalPags, this.pagina + 2);
    for (let i = inicio; i <= fin; i++) arr.push(i);
    return arr;
  }

  // ── Detalle ────────────────────────────────────────────────────

  verDetalle(f: FacturaResumen): void {
    this.cargandoDetalle = true;
    this.facturaDetalle = null;
    this.errorDetalle = '';
    this.facturasService.getFactura(f.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r) => {
          this.facturaDetalle  = r.data;
          this.cargandoDetalle = false;
        },
        error: () => {
          this.errorDetalle    = 'Error al cargar el detalle';
          this.cargandoDetalle = false;
        },
      });
  }

  cerrarDetalle(): void {
    this.facturaDetalle  = null;
    this.cargandoDetalle = false;
  }

  // ── Acciones ───────────────────────────────────────────────────

  marcarGenerada(id: number): void {
    this.facturasService.marcarGenerada(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r) => {
          if (this.facturaDetalle) this.facturaDetalle = { ...this.facturaDetalle, estatus: 'generada' };
          this.cargar();
          this.cargarContadores();
        },
      });
  }

  abrirCancelar(): void {
    this.motivoCancelacion = '';
    this.errorCancelar = '';
    this.mostrarModalCancelar = true;
  }

  confirmarCancelar(): void {
    if (!this.facturaDetalle) return;
    if (!this.motivoCancelacion || this.motivoCancelacion.trim().length < 5) {
      this.errorCancelar = 'El motivo debe tener al menos 5 caracteres';
      return;
    }
    this.procesandoCancelar = true;
    this.errorCancelar = '';
    this.facturasService.cancelarFactura(this.facturaDetalle.id, this.motivoCancelacion)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.procesandoCancelar = false;
          this.mostrarModalCancelar = false;
          this.cerrarDetalle();
          this.cargar();
          this.cargarContadores();
        },
        error: (e) => {
          this.errorCancelar = e?.error?.error?.message || 'Error al cancelar';
          this.procesandoCancelar = false;
        },
      });
  }

  // ── Helpers ────────────────────────────────────────────────────

  labelEstatus(est: string): string {
    const m: Record<string, string> = {
      pendiente: 'Pendiente',
      generada:  'Generada',
      cancelada: 'Cancelada',
    };
    return m[est] || est;
  }

  labelOrigen(o: string): string {
    const m: Record<string, string> = {
      venta:       'Venta',
      pedido:      'Pedido',
      cotizacion:  'Cotización',
    };
    return m[o] || o;
  }
}
