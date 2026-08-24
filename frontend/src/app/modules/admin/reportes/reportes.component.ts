import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { HttpResponse } from '@angular/common/http';
import {
  ReportesService, FormatoReporte,
  FiltrosVentas, FiltrosCorteCaja, FiltrosProductos,
  FiltrosClientes, FiltrosInventario, FiltrosMovimientos, FiltrosBitacora,
  FiltrosVendedores, FiltrosAuditoria
} from '../../../services/reportes.service';

// ── Catálogo de reportes disponibles ────────────────────────────────────────
export interface ReporteCatalogo {
  id: string;
  titulo: string;
  descripcion: string;
  categoria: string;
  icono: string;
}

const REPORTES: ReporteCatalogo[] = [
  { id: 'ventas',      titulo: 'Ventas por Período',          descripcion: 'Lista de ventas con filtros de fecha, vendedor, cliente y método de pago.', categoria: 'Ventas',     icono: 'fas fa-cash-register' },
  { id: 'corte-caja',  titulo: 'Corte de Caja',               descripcion: 'Resumen diario por método de pago y vendedor con detalle de ventas.', categoria: 'Ventas',     icono: 'fas fa-coins' },
  { id: 'productos',   titulo: 'Productos Más Vendidos',       descripcion: 'Ranking de productos y servicios por cantidad vendida y monto generado.', categoria: 'Ventas',     icono: 'fas fa-star' },
  { id: 'vendedores',  titulo: 'Ventas por Vendedor',          descripcion: 'Ranking de usuarios con total de ventas, ingresos, clientes atendidos y producto top.', categoria: 'Ventas', icono: 'fas fa-user-tie' },
  { id: 'clientes',    titulo: 'Compras por Cliente',          descripcion: 'Resumen de compras, ticket promedio y monto total por cliente.', categoria: 'Clientes',   icono: 'fas fa-users' },
  { id: 'inventario',  titulo: 'Inventario Actual',            descripcion: 'Stock actual con nivel de riesgo, costos y precios de venta.', categoria: 'Inventario', icono: 'fas fa-boxes' },
  { id: 'movimientos', titulo: 'Movimientos de Inventario',    descripcion: 'Entradas, salidas y ajustes de stock por período.', categoria: 'Inventario', icono: 'fas fa-exchange-alt' },
  { id: 'bitacora',    titulo: 'Bitácora del Sistema',         descripcion: 'Registro de todas las acciones críticas del sistema.', categoria: 'Auditoría', icono: 'fas fa-history' },
  { id: 'auditoria',   titulo: 'Bitácora de Auditoría',       descripcion: 'Log de cambios en BD: inserciones, actualizaciones y eliminaciones por tabla.', categoria: 'Auditoría', icono: 'fas fa-database' },
];

// ── Tipos de filtros para el formulario reactivo ─────────────────────────────
// El tipo Filtros une todos los interfaces para el objeto ngModel compartido
type Filtros = FiltrosVentas & FiltrosCorteCaja & FiltrosProductos
             & FiltrosClientes & FiltrosInventario & FiltrosMovimientos & FiltrosBitacora
             & FiltrosVendedores & FiltrosAuditoria
             & { top?: number };

@Component({
  selector: 'app-reportes',
  templateUrl: './reportes.component.html',
  styleUrls: ['./reportes.component.scss']
})
export class ReportesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  readonly reportes = REPORTES;
  readonly categorias = [...new Set(REPORTES.map(r => r.categoria))];

  selectedId: string = 'ventas';
  loadingPreview = false;
  loadingPdf = false;
  loadingXlsx = false;
  errorMsg = '';

  // Preview table
  previewRows: any[] = [];
  previewColumns: string[] = [];
  previewResumen: any = null;
  // Tabla secundaria para Trabajo en Equipo (reporte vendedores)
  previewEquipoVentas: { folio_venta: string; fecha_venta: any; cliente_nombre: string; total: any; metodo_pago: string; participantes: { empleado_nombre: string; comentario: string }[] }[] = [];
  mostrarModalEquipo = false;
  equipoModalVenta: { folio_venta: string; fecha_venta: any; cliente_nombre: string; total: any; metodo_pago: string; participantes: { empleado_nombre: string; comentario: string }[] } | null = null;
  previewResumenArqueo: any = null;
  previewArqueoMetodos: any[] = [];
  previewArqueoMovimientos: any[] = [];

  // Filtros del formulario (objeto plano, se usa ngModel)
  filtros: Filtros = {
    desde: this.hoy(),
    hasta: this.hoy(),
    fecha: this.hoy(),
    top: 50,
  };

  // Opciones extras para selects
  readonly nivelesStock = [
    { value: '',        label: 'Todos' },
    { value: 'sin_stock', label: 'Sin Stock' },
    { value: 'critico', label: 'Crítico' },
    { value: 'bajo',    label: 'Bajo' },
    { value: 'ok',      label: 'OK' },
    { value: 'servicio',label: 'Servicio' },
  ];
  readonly metodosPago = [
    { value: '',             label: 'Todos' },
    { value: 'EFECTIVO',     label: 'Efectivo' },
    { value: 'TARJETA',      label: 'Tarjeta' },
    { value: 'TRANSFERENCIA',label: 'Transferencia' },
  ];
  readonly tiposMovimiento = [
    { value: '', label: 'Todos' },
    { value: 'entrada',  label: 'Entrada' },
    { value: 'salida',   label: 'Salida' },
    { value: 'ajuste',   label: 'Ajuste' },
  ];
  readonly modulosBitacora = [
    { value: '', label: 'Todos' },
    { value: 'auth',        label: 'Autenticación' },
    { value: 'pos',         label: 'Punto de Venta' },
    { value: 'pedidos',     label: 'Pedidos' },
    { value: 'inventarios', label: 'Inventarios' },
  ];
  readonly resultadosBitacora = [
    { value: '',         label: 'Todos' },
    { value: 'exitoso',  label: 'Exitoso' },
    { value: 'bloqueado',label: 'Bloqueado' },
    { value: 'error',    label: 'Error' },
  ];

  constructor(private svc: ReportesService) {}

  ngOnInit(): void {}
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  // ── Navegación ───────────────────────────────────────────────────────────────
  get selectedReport(): ReporteCatalogo {
    return this.reportes.find(r => r.id === this.selectedId)!;
  }

  selectReport(id: string): void {
    this.selectedId = id;
    this.previewRows = [];
    this.previewColumns = [];
    this.previewEquipoVentas = [];
    this.previewResumen = null;
    this.previewResumenArqueo = null;
    this.previewArqueoMetodos = [];
    this.previewArqueoMovimientos = [];
    this.errorMsg = '';
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  hoy(): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Mexico_City',
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date());
  }

  getReportesPorCategoria(cat: string): ReporteCatalogo[] {
    return this.reportes.filter(r => r.categoria === cat);
  }

  // ── Preview ──────────────────────────────────────────────────────────────────
  onPreview(): void {
    this.loadingPreview = true;
    this.errorMsg = '';
    this.previewRows = [];
    this.previewEquipoVentas = [];
    this.previewResumen = null;
    this.previewResumenArqueo = null;
    this.previewArqueoMetodos = [];
    this.previewArqueoMovimientos = [];

    this.getPreviewObservable()
      .pipe(takeUntil(this.destroy$), finalize(() => this.loadingPreview = false))
      .subscribe({
        next: (resp: any) => {
          const data = resp?.data;
          if (!data) { this.previewRows = []; return; }

          // Según el reporte, extraer las filas y columnas
          const rawRows = Array.isArray(data)
            ? data
            : data.rows ?? data.ventas ?? [];

          this.previewResumen = data.resumen ?? null;
          this.previewResumenArqueo = data.resumen_arqueo ?? null;
          this.previewArqueoMetodos = data.arqueo_metodos_pago ?? [];
          this.previewArqueoMovimientos = data.arqueo_movimientos ?? [];

          // Tabla secundaria: Trabajo en Equipo (solo reporte vendedores)
          const equipoRows = data.equipo_rows ?? [];
          if (equipoRows.length > 0) {
            this.previewEquipoVentas = this.groupEquipoRows(equipoRows);
          }

          if (rawRows.length > 0) {
            this.previewColumns = Object.keys(rawRows[0]);
            this.previewRows = rawRows;
          }
        },
        error: (err: any) => {
          this.errorMsg = err?.error?.message ?? 'Error al cargar la vista previa.';
        }
      });
  }

  private getPreviewObservable() {
    const f = this.filtros;
    switch (this.selectedId) {
      case 'ventas':      return this.svc.previewVentas(f);
      case 'corte-caja':  return this.svc.previewCorteCaja(f);
      case 'productos':   return this.svc.previewProductos(f);
      case 'vendedores':  return this.svc.previewVendedores(f);
      case 'clientes':    return this.svc.previewClientes(f);
      case 'inventario':  return this.svc.previewInventario(f);
      case 'movimientos': return this.svc.previewMovimientos(f);
      case 'bitacora':    return this.svc.previewBitacora(f);
      case 'auditoria':   return this.svc.previewAuditoria(f);
      default:            return this.svc.previewVentas(f);
    }
  }

  // ── Descarga ─────────────────────────────────────────────────────────────────
  onDownload(formato: FormatoReporte): void {
    if (formato === 'pdf')  this.loadingPdf = true;
    if (formato === 'xlsx') this.loadingXlsx = true;
    this.errorMsg = '';

    this.getDownloadObservable(formato)
      .pipe(takeUntil(this.destroy$), finalize(() => {
        this.loadingPdf = false;
        this.loadingXlsx = false;
      }))
      .subscribe({
        next: (resp: HttpResponse<Blob>) => this.saveBlob(resp, formato),
        error: (err: any) => {
          this.errorMsg = 'Error al generar el archivo. Verifica los filtros e intenta de nuevo.';
        }
      });
  }

  private getDownloadObservable(fmt: FormatoReporte) {
    const f = this.filtros;
    switch (this.selectedId) {
      case 'ventas':      return this.svc.downloadVentas(f, fmt);
      case 'corte-caja':  return this.svc.downloadCorteCaja(f, fmt);
      case 'productos':   return this.svc.downloadProductos(f, fmt);
      case 'vendedores':  return this.svc.downloadVendedores(f, fmt);
      case 'clientes':    return this.svc.downloadClientes(f, fmt);
      case 'inventario':  return this.svc.downloadInventario(f, fmt);
      case 'movimientos': return this.svc.downloadMovimientos(f, fmt);
      case 'bitacora':    return this.svc.downloadBitacora(f, fmt);
      case 'auditoria':   return this.svc.downloadAuditoria(f, fmt);
      default:            return this.svc.downloadVentas(f, fmt);
    }
  }

  private saveBlob(resp: HttpResponse<Blob>, fmt: FormatoReporte): void {
    const blob = resp.body!;
    const ext = fmt === 'pdf' ? '.pdf' : '.xlsx';
    const cd = resp.headers.get('Content-Disposition') || '';
    const filename = this.getFilenameFromContentDisposition(cd) || this.buildFallbackFilename(ext);

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  private getFilenameFromContentDisposition(cd: string): string | null {
    if (!cd) return null;

    // RFC 5987: filename*=UTF-8''archivo.ext
    const matchStar = cd.match(/filename\*=UTF-8''([^;]+)/i);
    if (matchStar?.[1]) {
      try {
        return decodeURIComponent(matchStar[1]);
      } catch {
        return matchStar[1];
      }
    }

    const match = cd.match(/filename="?([^";]+)"?/i);
    return match?.[1] || null;
  }

  private buildFallbackFilename(ext: string): string {
    const hoy = this.hoy();
    const desde = String(this.filtros.desde || '').trim();
    const hasta = String(this.filtros.hasta || '').trim();
    const fecha = String(this.filtros.fecha || '').trim();
    const rango = (desde && hasta)
      ? (desde === hasta ? desde : `${desde}_a_${hasta}`)
      : (desde || hasta || hoy);

    switch (this.selectedId) {
      case 'corte-caja':  return `Corte-de-Caja-${fecha || hoy}${ext}`;
      case 'ventas':      return `Reporte-Ventas-${rango}${ext}`;
      case 'productos':   return `Productos-mas-vendidos-${rango}${ext}`;
      case 'clientes':    return `Compras-por-Cliente-${rango}${ext}`;
      case 'inventario':  return `Inventario-Actual-${hoy}${ext}`;
      case 'movimientos': return `Movimientos-Inventario-${rango}${ext}`;
      case 'bitacora':    return `Bitacora-${rango}${ext}`;
      case 'vendedores':  return `Ventas-por-Vendedor-${rango}${ext}`;
      case 'auditoria':   return `Auditoria-${rango}${ext}`;
      default:            return `reporte-${this.selectedId}-${hoy}${ext}`;
    }
  }

  // ── Formato moneda para tabla preview ────────────────────────────────────────
  // Patrones de columna que contienen montos
  private readonly _moneyCols = ['total', 'subtotal', 'monto', 'costo', 'precio', 'ingreso', 'descuento', 'iva', 'ticket'];
  // Columnas que son conteos/enteros aunque su nombre contenga palabras de _moneyCols
  private readonly _countCols = ['ventas', 'canceladas', 'dias', 'clientes', 'cantidad', 'compras', 'registros', 'activos', 'unicos'];
  // Regex para detectar string ISO-8601 (ej: 2026-04-20T10:17:09.841Z)
  private readonly _isoDateRe = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

  formatCell(value: any, col: string): string {
    if (value === null || value === undefined) return '—';
    const colLower = col.toLowerCase();

    // Columnas de conteo: nunca se formatean como moneda ni como fecha
    const isCount = this._countCols.some(k => colLower.includes(k));

    if (!isCount && this._moneyCols.some(k => colLower.includes(k))) {
      const n = parseFloat(value);
      if (!isNaN(n)) return `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    // Columna de fecha o valor ISO-8601 (nunca si es conteo)
    const isDateCol = !isCount && (
      colLower.includes('fecha') || colLower.includes('date')
      || colLower.includes('compra') || colLower.includes('venta')
      || colLower.includes('primera') || colLower.includes('ultima')
    );
    const isIsoStr  = typeof value === 'string' && this._isoDateRe.test(value);
    if (isDateCol || isIsoStr) {
      try {
        const d = new Date(value);
        if (!isNaN(d.getTime())) {
          return d.toLocaleString('es-MX', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
            hour12: true, timeZone: 'America/Mexico_City'
          });
        }
      } catch { /* fallthrough */ }
    }

    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    if (typeof value === 'object' && value !== null) {
      const s = JSON.stringify(value);
      return s.length > 60 ? s.slice(0, 60) + '…' : s;
    }
    return String(value);
  }

  formatColHeader(col: string): string {
    return col.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  private groupEquipoRows(rows: any[]) {
    const map = new Map<string, any>();
    rows.forEach(r => {
      if (!map.has(r.folio_venta)) {
        map.set(r.folio_venta, {
          folio_venta: r.folio_venta,
          fecha_venta: r.fecha_venta,
          cliente_nombre: r.cliente_nombre,
          total: r.total,
          metodo_pago: r.metodo_pago,
          participantes: []
        });
      }
      const venta = map.get(r.folio_venta)!;
      if (r.empleado_nombre && r.empleado_nombre !== '—') {
        venta.participantes.push({ empleado_nombre: r.empleado_nombre, comentario: r.comentario || '' });
      }
    });
    return Array.from(map.values());
  }

  abrirModalParticipantes(venta: any): void {
    this.equipoModalVenta = venta;
    this.mostrarModalEquipo = true;
  }

  formatOrigenArqueo(origen: string): string {
    const map: Record<string, string> = {
      venta: 'Venta mostrador/cotización',
      anticipo_pedido: 'Anticipo cobrado',
      saldo_pedido: 'Saldo cobrado',
    };
    return map[origen] || origen;
  }
}

