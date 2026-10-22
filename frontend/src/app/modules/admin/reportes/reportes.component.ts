import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { HttpResponse } from '@angular/common/http';
import { InventariosService } from '../../../services/inventarios.service';
import {
  ReportesService, FormatoReporte,
  FiltrosVentas, FiltrosCorteCaja, FiltrosProductos,
  FiltrosClientes, FiltrosInventario, FiltrosMovimientos, FiltrosBitacora,
  FiltrosVendedores, FiltrosAuditoria
} from '../../../services/reportes.service';
import { NotificationService } from '../../../services/notification.service';
import { REPORTES, ReporteCatalogo } from '../../../shared/reportes-catalogo';

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
  // Cancela consultas/descargas en curso al limpiar filtros
  private reset$ = new Subject<void>();

  // Solo los reportes permitidos para el usuario (se cargan en ngOnInit)
  reportes: ReporteCatalogo[] = [];
  categorias: string[] = [];
  cargandoPermisos = true;

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
  previewPeriodo: { etiqueta: string; horario?: string; departamento?: string; criterio?: string; top?: number; historico?: boolean } | null = null;
  // Productos más vendidos
  previewPorDepartamento: any[] = [];
  departamentos: { id: number; nombre: string }[] = [];
  mostrarDetalleTarjetas = false;

  // Filtros del formulario (objeto plano, se usa ngModel)
  filtros: Filtros = this.filtrosIniciales();

  // Corte de caja: turnos predefinidos (ajustar horas aquí si cambian los turnos del negocio).
  // El horario se aplica a cada día del rango; la hora final es exclusiva.
  readonly turnosCorte = [
    { label: 'Todo el día', desde: '',      hasta: ''      },
    { label: 'Matutino',    desde: '07:00', hasta: '14:00' },
    { label: 'Vespertino',  desde: '14:00', hasta: '21:00' },
  ];
  readonly rangosRapidos = [
    { id: 'hoy',    label: 'Hoy' },
    { id: 'ayer',   label: 'Ayer' },
    { id: 'semana', label: 'Últimos 7 días' },
    { id: 'mes',    label: 'Este mes' },
  ];

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
  readonly criteriosClientes = [
    { value: 'monto',          label: 'Dinero comprado' },
    { value: 'compras',        label: 'Número de compras' },
    { value: 'puntos',         label: 'Puntos disponibles (saldo actual)' },
    { value: 'puntos_periodo', label: 'Puntos ganados en el periodo' },
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

  constructor(
    private svc: ReportesService,
    private inventariosSvc: InventariosService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.cargarReportesPermitidos();
    this.inventariosSvc.getDepartamentos()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp: any) => {
          const lista = Array.isArray(resp) ? resp : (resp?.data ?? []);
          this.departamentos = lista.map((d: any) => ({ id: d.id, nombre: d.nombre }));
        },
        error: () => { this.departamentos = []; }
      });
  }
  /** Carga los reportes a los que el usuario tiene acceso y ajusta el menú. */
  private cargarReportesPermitidos(): void {
    this.cargandoPermisos = true;
    this.svc.getReportesPermitidos()
      .pipe(takeUntil(this.destroy$), finalize(() => this.cargandoPermisos = false))
      .subscribe({
        next: (resp) => {
          const permitidos = resp?.data?.permitidos ?? [];
          this.setReportesVisibles(REPORTES.filter(r => permitidos.includes(r.id)));
          if (this.reportes.length === 0) {
            this.notificationService.warning(
              'No tienes reportes asignados. Solicita acceso a un administrador.',
              'Sin acceso a reportes'
            );
          }
        },
        error: () => {
          // El backend sigue validando cada reporte; se muestran todos y se avisa del fallo
          this.setReportesVisibles(REPORTES);
          this.notificationService.warning(
            'No se pudieron verificar tus permisos de reportes. Algunos reportes podrían no estar disponibles.',
            'Permisos de reportes'
          );
        }
      });
  }

  private setReportesVisibles(lista: ReporteCatalogo[]): void {
    this.reportes = lista;
    this.categorias = [...new Set(lista.map(r => r.categoria))];
    if (!lista.some(r => r.id === this.selectedId) && lista.length > 0) {
      this.selectReport(lista[0].id);
    }
  }

  /**
   * Maneja un 403 del backend: el reporte dejó de estar permitido
   * (p. ej. se cambiaron los permisos con la sesión abierta).
   * Devuelve true si el error fue de permisos.
   */
  private manejarSinPermiso(err: any): boolean {
    if (err?.status !== 403) return false;
    const titulo = this.selectedReport?.titulo ?? 'este reporte';
    this.notificationService.error(
      `No tienes permiso para acceder a "${titulo}". Solicita acceso a un administrador.`,
      'Acceso denegado'
    );
    const restantes = this.reportes.filter(r => r.id !== this.selectedId);
    this.setReportesVisibles(restantes);
    if (restantes.length === 0) this.selectReport('');
    return true;
  }

  ngOnDestroy(): void {
    this.reset$.next(); this.reset$.complete();
    this.destroy$.next(); this.destroy$.complete();
  }

  /** Valores por defecto de los filtros (hoy, día completo). */
  private filtrosIniciales(): Filtros {
    return {
      desde: this.hoy(),
      hasta: this.hoy(),
      hora_desde: '',
      hora_hasta: '',
      departamento: '',
      orden: 'monto',
      historico: false,
      top: 50,
    };
  }

  /** Reinicia el reporte actual: filtros por defecto, sin vista previa ni errores. */
  limpiarFiltros(): void {
    this.reset$.next();
    this.loadingPreview = false;
    this.loadingPdf = false;
    this.loadingXlsx = false;
    this.mostrarModalEquipo = false;
    this.equipoModalVenta = null;
    this.filtros = this.filtrosIniciales();
    this.selectReport(this.selectedId);
  }

  // ── Navegación ───────────────────────────────────────────────────────────────
  get selectedReport(): ReporteCatalogo | undefined {
    return this.reportes.find(r => r.id === this.selectedId);
  }

  private validarReportePermitido(): boolean {
    if (this.selectedReport) return true;
    this.notificationService.warning('Selecciona un reporte permitido para continuar.', 'Reporte no disponible');
    return false;
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
    this.previewPeriodo = null;
    this.previewPorDepartamento = [];
    this.mostrarDetalleTarjetas = false;
    this.errorMsg = '';
  }

  // ── Corte de caja: rango y turno ────────────────────────────────────────────
  aplicarRango(id: string): void {
    const hoy = this.hoy();
    switch (id) {
      case 'hoy':    this.filtros.desde = hoy; this.filtros.hasta = hoy; break;
      case 'ayer':   this.filtros.desde = this.sumarDias(hoy, -1); this.filtros.hasta = this.filtros.desde; break;
      case 'semana': this.filtros.desde = this.sumarDias(hoy, -6); this.filtros.hasta = hoy; break;
      case 'mes':    this.filtros.desde = hoy.slice(0, 8) + '01'; this.filtros.hasta = hoy; break;
    }
  }

  rangoActivo(id: string): boolean {
    const hoy = this.hoy();
    const { desde, hasta } = this.filtros;
    switch (id) {
      case 'hoy':    return desde === hoy && hasta === hoy;
      case 'ayer':   return desde === this.sumarDias(hoy, -1) && hasta === desde;
      case 'semana': return desde === this.sumarDias(hoy, -6) && hasta === hoy;
      case 'mes':    return desde === hoy.slice(0, 8) + '01' && hasta === hoy && desde !== hoy;
      default:       return false;
    }
  }

  aplicarTurno(t: { desde: string; hasta: string }): void {
    this.filtros.hora_desde = t.desde;
    this.filtros.hora_hasta = t.hasta;
  }

  turnoActivo(t: { desde: string; hasta: string }): boolean {
    return (this.filtros.hora_desde || '') === t.desde && (this.filtros.hora_hasta || '') === t.hasta;
  }

  /** Débito y crédito por separado (montos + número de movimientos) para el desglose de tarjetas. */
  get detalleTarjetas() {
    const movs = (codigos: string[]) => this.previewArqueoMetodos
      .filter(m => codigos.includes(String(m.metodo_pago_codigo || '').toLowerCase()))
      .reduce((acc, m) => acc + (m.movimientos || 0), 0);
    const r = this.previewResumenArqueo || {};
    return {
      debito:  { total: r.total_tarjeta_debito || 0,  movimientos: movs(['tarjeta_debito']) },
      credito: { total: r.total_tarjeta_credito || 0, movimientos: movs(['tarjeta', 'tarjeta_credito']) },
    };
  }

  get totalArqueoMovimientos(): number {
    return this.previewArqueoMetodos.reduce((acc, m) => acc + (m.movimientos || 0), 0);
  }

  private validarCorte(): string | null {
    const f = this.filtros;
    if (!f.desde || !f.hasta) return 'Selecciona la fecha inicial y final del corte.';
    if (f.desde > f.hasta) return 'La fecha inicial no puede ser mayor que la fecha final.';
    const hd = f.hora_desde || '';
    const hh = f.hora_hasta || '';
    if ((hd && !hh) || (!hd && hh)) return 'Indica la hora de inicio y la hora de fin del turno (o elige "Todo el día").';
    if (hd && hh && hd >= hh) return 'La hora de inicio debe ser menor que la hora de fin.';
    return null;
  }

  private sumarDias(ymd: string, dias: number): string {
    const d = new Date(ymd + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + dias);
    return d.toISOString().slice(0, 10);
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
    if (!this.validarReportePermitido()) return;
    if (this.selectedId === 'corte-caja') {
      const err = this.validarCorte();
      if (err) { this.errorMsg = err; return; }
    }
    this.loadingPreview = true;
    this.errorMsg = '';
    this.previewRows = [];
    this.previewEquipoVentas = [];
    this.previewResumen = null;
    this.previewResumenArqueo = null;
    this.previewArqueoMetodos = [];
    this.previewArqueoMovimientos = [];
    this.previewPeriodo = null;
    this.previewPorDepartamento = [];
    this.mostrarDetalleTarjetas = false;

    this.getPreviewObservable()
      .pipe(takeUntil(this.reset$), takeUntil(this.destroy$), finalize(() => this.loadingPreview = false))
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
          this.previewPeriodo = data.periodo ?? null;
          this.previewPorDepartamento = data.por_departamento ?? [];

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
          if (this.manejarSinPermiso(err)) return;
          this.errorMsg = err?.error?.message ?? err?.error?.error?.message ?? 'Error al cargar la vista previa.';
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
    if (!this.validarReportePermitido()) return;
    if (this.selectedId === 'corte-caja') {
      const err = this.validarCorte();
      if (err) { this.errorMsg = err; return; }
    }
    if (formato === 'pdf')  this.loadingPdf = true;
    if (formato === 'xlsx') this.loadingXlsx = true;
    this.errorMsg = '';

    this.getDownloadObservable(formato)
      .pipe(takeUntil(this.reset$), takeUntil(this.destroy$), finalize(() => {
        this.loadingPdf = false;
        this.loadingXlsx = false;
      }))
      .subscribe({
        next: (resp: HttpResponse<Blob>) => this.saveBlob(resp, formato),
        error: (err: any) => {
          if (this.manejarSinPermiso(err)) return;
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
    const horario = (this.filtros.hora_desde && this.filtros.hora_hasta)
      ? `_${this.filtros.hora_desde.replace(':', '-')}_a_${this.filtros.hora_hasta.replace(':', '-')}`
      : '';
    const rango = (desde && hasta)
      ? (desde === hasta ? desde : `${desde}_a_${hasta}`)
      : (desde || hasta || hoy);

    switch (this.selectedId) {
      case 'corte-caja':  return `Corte-de-Caja-${rango}${horario}${ext}`;
      case 'ventas':      return `Reporte-Ventas-${rango}${ext}`;
      case 'productos':   return `Productos-mas-vendidos-${rango}${ext}`;  // el backend añade el departamento
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

