import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnDestroy, AfterViewInit, HostListener, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { LineaCarrito } from '../../../../../services/pos.service';
import { PosService } from '../../../../../services/pos.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-pos-carrito',
  templateUrl: './carrito.component.html',
  styleUrls: ['./carrito.component.scss']
})
export class CarritoComponent implements OnChanges, AfterViewInit, OnDestroy {

  @Input() carrito: LineaCarrito[] = [];
  @Input() descuentoGlobalPct = 0;
  @Output() carritoActualizado = new EventEmitter<LineaCarrito[]>();
  @Output() limpiarCarrito     = new EventEmitter<void>();

  // Referencia a cada fila del carrito para detectar cuando se agrega una nueva
  @ViewChildren('lineaRef') lineaRefs!: QueryList<ElementRef<HTMLElement>>;

  modalAbierto = false;
  private _lineaRefsSub?: Subscription;
  private _cantidadAnterior = 0;

  constructor(private posService: PosService) {}

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.modalAbierto) this.cerrarModal();
  }

  abrirModal(): void { this.modalAbierto = true; }
  cerrarModal(): void { this.modalAbierto = false; }

  ngOnChanges(changes: SimpleChanges): void {
    // Trackéamos la longitud para saber si en el próximo QueryList.changes hubo adición
    if (changes['carrito']) {
      this._cantidadAnterior = (changes['carrito'].previousValue || []).length;
    }
  }

  ngAfterViewInit(): void {
    // QueryList.changes dispara SIEMPRE que Angular añade/quita elementos *ngFor del DOM
    this._lineaRefsSub = this.lineaRefs.changes.subscribe((lista: QueryList<ElementRef<HTMLElement>>) => {
      const items = lista.toArray();
      if (items.length > this._cantidadAnterior && items.length > 0) {
        // Scroll al último item agregado
        items[items.length - 1].nativeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }

  ngOnDestroy(): void {
    this._lineaRefsSub?.unsubscribe();
  }

  // ── Cantidades ────────────────────────────────────────────────

  incrementar(linea: LineaCarrito): void {
    if (!linea.es_servicio && !linea.es_item_libre &&
        linea._existencia_actual !== undefined && linea.cantidad >= linea._existencia_actual) {
      return;
    }
    linea.cantidad += 1;
    this.aplicarTabulador(linea);
    this.recalcularLinea(linea);
    this.emitir();
  }

  decrementar(linea: LineaCarrito): void {
    if (linea.cantidad <= 1) {
      this.eliminar(linea);
      return;
    }
    linea.cantidad -= 1;
    this.aplicarTabulador(linea);
    this.recalcularLinea(linea);
    this.emitir();
  }

  onCantidadChange(linea: LineaCarrito, valor: string): void {
    const num = parseFloat(valor);
    if (isNaN(num) || num <= 0) { this.eliminar(linea); return; }
    if (!linea.es_servicio && !linea.es_item_libre &&
        linea._existencia_actual !== undefined && num > linea._existencia_actual) {
      linea.cantidad = linea._existencia_actual;
    } else {
      linea.cantidad = num;
    }
    this.aplicarTabulador(linea);
    this.recalcularLinea(linea);
    this.emitir();
  }

  // ── Descuentos por línea ──────────────────────────────────────

  onDescuentoLinea(linea: LineaCarrito, valor: string): void {
    const pct = Math.min(100, Math.max(0, parseFloat(valor) || 0));
    linea.descuento_linea_pct = pct;
    this.recalcularLinea(linea);
    this.emitir();
  }

  // ── CRUD carrito ──────────────────────────────────────────────

  eliminar(linea: LineaCarrito): void {
    const idx = this.carrito.findIndex(c => c._id_ui === linea._id_ui);
    if (idx > -1) this.carrito.splice(idx, 1);
    this.emitir();
  }

  confirmarLimpiar(): void {
    if (this.carrito.length === 0 || confirm('¿Vaciar el carrito?')) {
      this.limpiarCarrito.emit();
    }
  }

  // ── Helpers ───────────────────────────────────────────────────

  private aplicarTabulador(linea: LineaCarrito): void {
    if (linea._tabulador_activo && linea._tabulador && linea._precio_base !== undefined) {
      linea.precio_unitario = this.posService.resolverPrecioTabulador(
        linea.cantidad, linea._precio_base, linea._tabulador
      );
    }
  }

  private recalcularLinea(linea: LineaCarrito): void {
    linea.subtotal_linea = this.posService.calcularSubtotalLinea(linea);
    linea.descuento_linea_monto = parseFloat(((linea.cantidad * linea.precio_unitario) * linea.descuento_linea_pct / 100).toFixed(2));
  }

  private emitir(): void {
    this.carritoActualizado.emit([...this.carrito]);
  }

  trackById(_: number, linea: LineaCarrito): string {
    return linea._id_ui || '';
  }

  get totalItems(): number {
    return this.carrito.reduce((s, i) => s + i.cantidad, 0);
  }
}
