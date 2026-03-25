import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { InventariosService, Articulo, Departamento, TabuladorFila } from '../../../../services/inventarios.service';
import { NotificationService } from '../../../../services/notification.service';
import { ProveedoresService } from '../../../../services/proveedores.service';

@Component({
  selector: 'app-inventario-form',
  templateUrl: './inventario-form.component.html',
  styleUrls: ['./inventario-form.component.scss']
})
export class InventarioFormComponent implements OnInit {

  loading = false;
  isEditMode = false;
  inventarioId: number | null = null;

  // ── Paso 1: selector de tipo ─────────────────────────────────────────────
  paso: 1 | 2 = 1;          // 1 = selector tipo, 2 = formulario
  tiposArticulo = this.inventariosService.getTiposArticulo();

  // ── Datos del formulario ─────────────────────────────────────────────────
  form: Partial<Articulo> = {
    tipo: 'venta',
    es_servicio: false,
    nombre: '',
    descripcion: '',
    departamento_id: undefined,
    codigo_sku: '',
    marca: '',
    modelo: '',
    unidad_medida: 'Pieza',
    existencia_actual: 0,
    stock_minimo: 0,
    stock_maximo: null as any,
    costo_compra: null as any,
    precio_venta: null as any,
    disponible_en_pos: false,
    ubicacion_fisica: '',
    proveedor_id: null as any
  };

  // ── Catálogos ────────────────────────────────────────────────────────────
  departamentos: Departamento[] = [];
  proveedores: any[] = [];
  unidadesMedida = this.inventariosService.getUnidadesMedida();

  // ── Tabulador de precios ──────────────────────────────────────────────────
  tabuladorActivo = false;
  tabuladorFilas: TabuladorFila[] = [{ cantidad_desde: 1, precio: 0 }];

  // ── Computed helpers ─────────────────────────────────────────────────────
  get esServicio(): boolean { return !!this.form.es_servicio; }
  get tipoSeleccionado() { return this.tiposArticulo.find(t => t.value === (this.esServicio ? 'servicio' : this.form.tipo)); }
  get mostrarPrecioVenta(): boolean { return this.form.tipo === 'venta' || this.esServicio || !!this.form.disponible_en_pos; }

  get margenPorcentaje(): number | null {
    const c = Number(this.form.costo_compra);
    const p = Number(this.form.precio_venta);
    if (!c || !p || c <= 0) return null;
    return Math.round(((p - c) / c) * 100);
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public inventariosService: InventariosService,
    private notif: NotificationService,
    private proveedoresService: ProveedoresService
  ) {}

  ngOnInit(): void {
    this.cargarDepartamentos();
    this.cargarProveedores();

    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode = true;
        this.inventarioId = +params['id'];
        this.cargarInventario(this.inventarioId);
      }
    });
  }

  // ── Carga de datos ───────────────────────────────────────────────────────

  private cargarDepartamentos() {
    this.inventariosService.getDepartamentos().subscribe({
      next: r => { if (r.success) this.departamentos = r.data || []; }
    });
  }

  private cargarProveedores() {
    this.proveedoresService.getList({ activo: true, limit: 1000 }).subscribe({
      next: r => { if (r.success && r.data) this.proveedores = r.data; },
      error: () => { this.proveedores = []; }
    });
  }

  private cargarInventario(id: number) {
    this.loading = true;
    this.inventariosService.getInventarioById(id).subscribe({
      next: r => {
        this.loading = false;
        if (r.success) {
          this.form = { ...this.form, ...r.data };
          this.tabuladorActivo = !!r.data.tabulador_activo;
          if (r.data.tabulador && r.data.tabulador.length > 0) {
            this.tabuladorFilas = r.data.tabulador.map((f: TabuladorFila) => ({
              id: f.id,
              cantidad_desde: f.cantidad_desde,
              precio: f.precio
            }));
          } else {
            this.tabuladorFilas = [{ cantidad_desde: 1, precio: 0 }];
          }
          this.paso = 2;
        }
      },
      error: () => { this.loading = false; this.notif.error('Error al cargar el artículo'); }
    });
  }

  // ── Paso 1: selección de tipo ────────────────────────────────────────────

  seleccionarTipo(value: string) {
    if (value === 'servicio') {
      this.form.tipo = 'venta';
      this.form.es_servicio = true;
      this.form.disponible_en_pos = true;
      this.form.existencia_actual = undefined as any;
      this.form.stock_minimo = undefined as any;
    } else {
      this.form.tipo = value as any;
      this.form.es_servicio = false;
      if (value === 'insumo' || value === 'generico') {
        this.form.disponible_en_pos = false;
        this.form.precio_venta = null as any;
      }
      if (!this.form.existencia_actual) this.form.existencia_actual = 0;
      if (!this.form.stock_minimo) this.form.stock_minimo = 0;
    }
    this.paso = 2;
  }

  volver() { this.paso = 1; }

  // ── Toggle disponible en POS ─────────────────────────────────────────────

  onTogglePos() {
    if (!this.form.disponible_en_pos) {
      this.form.precio_venta = null as any;
      this.tabuladorActivo = false;
    }
  }

  // ── Tabulador ─────────────────────────────────────────────────────────────

  agregarFila(): void {
    this.tabuladorFilas.push({ cantidad_desde: 0, precio: 0 });
  }

  eliminarFila(index: number): void {
    if (this.tabuladorFilas.length > 1) {
      this.tabuladorFilas.splice(index, 1);
    }
  }

  /** Valida las filas del tabulador antes de guardar. Retorna mensaje de error o null. */
  private validarTabulador(): string | null {
    if (!this.tabuladorActivo) return null;
    const precioBase = Number(this.form.precio_venta);
    const cantidades = new Set<number>();
    for (let i = 0; i < this.tabuladorFilas.length; i++) {
      const f = this.tabuladorFilas[i];
      if (!f.cantidad_desde || f.cantidad_desde <= 0)
        return `Fila ${i + 1} del tabulador: la cantidad debe ser mayor a 0`;
      if (!f.precio || f.precio <= 0)
        return `Fila ${i + 1} del tabulador: el precio debe ser mayor a 0`;
      if (precioBase > 0 && f.precio >= precioBase)
        return `Fila ${i + 1} del tabulador: el precio ($${f.precio}) debe ser menor al precio de venta ($${precioBase})`;
      if (cantidades.has(f.cantidad_desde))
        return `Fila ${i + 1} del tabulador: la cantidad ${f.cantidad_desde} está duplicada`;
      cantidades.add(f.cantidad_desde);
    }
    return null;
  }

  // ── Guardar ─────────────────────────────────────────────────────────────

  onSubmit() {
    if (!this.form.nombre?.trim()) { this.notif.warning('Ingresa el nombre del artículo'); return; }
    if (!this.form.departamento_id) { this.notif.warning('Selecciona un departamento'); return; }
    if ((this.form.tipo === 'venta' || this.form.es_servicio) && !this.form.precio_venta) {
      this.notif.warning('El precio de venta es obligatorio para productos venta y servicios'); return;
    }

    const errorTabulador = this.validarTabulador();
    if (errorTabulador) { this.notif.warning(errorTabulador); return; }

    const data: Partial<Articulo> = { ...this.form, tabulador_activo: this.tabuladorActivo };
    if (this.esServicio) { data.existencia_actual = 0; data.stock_minimo = 0; data.stock_maximo = null as any; }

    this.loading = true;
    const req = this.isEditMode
      ? this.inventariosService.updateInventario(this.inventarioId!, data)
      : this.inventariosService.createInventario(data);

    req.subscribe({
      next: r => {
        if (!r.success) { this.loading = false; return; }
        const articuloId: number = r.data.id;
        // Guardar tabulador (siempre, para borrar si se desactivó)
        this.inventariosService.saveTabulador(articuloId, this.tabuladorActivo ? this.tabuladorFilas : []).subscribe({
          next: () => {
            this.loading = false;
            this.notif.success(this.isEditMode ? 'Artículo actualizado' : 'Artículo creado correctamente');
            this.router.navigate(['/admin/inventarios']);
          },
          error: () => {
            this.loading = false;
            this.notif.warning('Artículo guardado, pero ocurrió un error al guardar el tabulador');
            this.router.navigate(['/admin/inventarios']);
          }
        });
      },
      error: e => {
        this.loading = false;
        this.notif.error(e.error?.message || 'Error al guardar');
      }
    });
  }

  redondearDecimales(campo: 'costo_compra' | 'precio_venta') {
    const v = this.form[campo];
    if (v != null && v !== '' as any) {
      this.form[campo] = +parseFloat(String(v)).toFixed(2) as any;
    }
  }

  /** Bloquea en tiempo real cualquier tecla que no sea dígito, punto o coma */
  soloNumericos(event: KeyboardEvent): void {
    const allowed = /[0-9.,]/;
    if (!allowed.test(event.key) && event.key !== 'Backspace' && event.key !== 'Tab'
        && event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Delete') {
      event.preventDefault();
    }
  }

  /** Sanea el valor al pegar texto o en otros eventos input (cubre Safari/Firefox) */
  sanitizarNumerico(campo: 'costo_compra' | 'precio_venta', event: Event): void {
    const input = event.target as HTMLInputElement;
    const num = parseFloat(input.value);
    this.form[campo] = (isNaN(num) ? null : num) as any;
  }

  cancelar() { this.router.navigate(['/admin/inventarios']); }

  // ── Helpers ──────────────────────────────────────────────────────────────

  formatCurrency(v: number | null | undefined): string {
    return this.inventariosService.formatCurrency(v || 0);
  }
}
