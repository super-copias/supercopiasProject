import { Component, OnInit } from '@angular/core';
import { InventariosService, Departamento } from '../../../../services/inventarios.service';
import { NotificationService } from '../../../../services/notification.service';

@Component({
  selector: 'app-movimientos-historial',
  templateUrl: './movimientos-historial.component.html',
  styleUrls: ['./movimientos-historial.component.scss']
})
export class MovimientosHistorialComponent implements OnInit {

  movimientos: any[] = [];
  departamentos: Departamento[] = [];
  loading = false;
  consultaRealizada = false;

  // Filtros
  filtros: any = {
    fecha_desde: '',
    fecha_hasta: '',
    departamento_id: '',
    tipo_movimiento: '',
    q: '',
    page: 1,
    limit: 20
  };

  total = 0;
  pages = 1;

  get paginasArray(): number[] {
    return Array.from({ length: Math.min(this.pages, 7) }, (_, i) => i + 1);
  }

  tiposMovimiento = [
    { value: 'entrada',      label: 'Entrada',      badge: 'bg-success' },
    { value: 'salida',       label: 'Salida',        badge: 'bg-danger' },
    { value: 'ajuste',       label: 'Ajuste',        badge: 'bg-warning text-dark' },
    { value: 'transferencia',label: 'Transferencia', badge: 'bg-info' },
  ];

  constructor(
    private inventariosService: InventariosService,
    private notif: NotificationService
  ) {}

  ngOnInit() {
    this.cargarDepartamentos();
    const hoy = this.toDateInput(new Date());
    this.filtros.fecha_desde = hoy;
    this.filtros.fecha_hasta = hoy;
  }

  private toDateInput(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  cargarDepartamentos() {
    this.inventariosService.getDepartamentos().subscribe({
      next: r => { if (r.success) this.departamentos = r.data || []; }
    });
  }

  cargar(page = 1) {
    this.filtros.page = page;
    this.loading = true;
    this.consultaRealizada = true;

    const params: any = { ...this.filtros };
    // Limpiar vacíos
    Object.keys(params).forEach(k => { if (params[k] === '' || params[k] === null) delete params[k]; });
    // Si hay búsqueda por texto, ignora filtro de departamento (busca en todos)
    if (params.q) delete params.departamento_id;

    this.inventariosService.getHistorialGlobal(params).subscribe({
      next: r => {
        this.loading = false;
        if (r.success) {
          this.movimientos = r.data || [];
          this.total = r.pagination?.total || 0;
          this.pages = r.pagination?.pages || 1;
        }
      },
      error: () => { this.loading = false; this.notif.error('Error al cargar historial'); }
    });
  }

  limpiarFiltros() {
    this.filtros.q = '';
    this.filtros.departamento_id = '';
    this.filtros.tipo_movimiento = '';
    this.filtros.fecha_desde = '';
    this.filtros.fecha_hasta = '';
    this.movimientos = [];
    this.total = 0;
    this.pages = 1;
    this.consultaRealizada = false;
  }

  getBadgeTipo(tipo: string): string {
    return this.tiposMovimiento.find(t => t.value === tipo)?.badge || 'bg-secondary';
  }

  getLabelTipo(tipo: string): string {
    return this.tiposMovimiento.find(t => t.value === tipo)?.label || tipo;
  }

  formatCurrency(v: number) { return this.inventariosService.formatCurrency(v); }

  formatFecha(fecha: string): string {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  }
}
