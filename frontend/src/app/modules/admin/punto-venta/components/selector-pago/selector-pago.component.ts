import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { MetodoPagoCodigo, PagoInput } from '../../../../../services/pos.service';

const METODOS: { codigo: MetodoPagoCodigo; label: string; icono: string }[] = [
  { codigo: 'efectivo',        label: 'Efectivo',        icono: 'fa-money-bill-wave' },
  { codigo: 'tarjeta_debito',  label: 'T. Débito',       icono: 'fa-credit-card' },
  { codigo: 'tarjeta_credito', label: 'T. Crédito',      icono: 'fa-credit-card' },
  { codigo: 'transferencia',   label: 'Transferencia',   icono: 'fa-building-columns' },
];
@Component({
  selector: 'app-pos-selector-pago',
  templateUrl: './selector-pago.component.html',
  styleUrls: ['./selector-pago.component.scss'],
})
export class SelectorPagoComponent implements OnChanges {
  /** Total a cobrar (ya con IVA/ISR si aplica) */
  @Input() totalRef = 0;
  /** Permite ocultar el campo de efectivo entregado cuando el flujo no lo requiere */
  @Input() mostrarRecibidoEfectivo = true;

  @Output() pagosChange = new EventEmitter<PagoInput[]>();
  @Output() validChange = new EventEmitter<boolean>();

  metodos = METODOS;

  /** Métodos seleccionados en orden de clic (máx 2) */
  seleccionados: MetodoPagoCodigo[] = [];

  /** Porción del total que paga el 1er método (solo cuando hay 2) */
  monto1Input: number | null = null;

  /** Efectivo recibido (siempre referido al código 'efectivo', único en la lista) */
  _montoRecibidoEfectivo: number | null = null;

  /** Nota / referencia por código */
  _nota: Partial<Record<MetodoPagoCodigo, string>> = {};

  // ── helpers públicos para el template ──────────────────────

  get dosMetodos(): boolean { return this.seleccionados.length === 2; }

  get monto1(): number {
    return this.dosMetodos ? (this.monto1Input ?? 0) : this.totalRef;
  }

  get monto2(): number {
    return parseFloat((this.totalRef - this.monto1).toFixed(2));
  }

  /** Porción que corresponde al método 'efectivo' según su posición */
  get porcionEfectivo(): number {
    const idx = this.seleccionados.indexOf('efectivo');
    if (idx < 0) return 0;
    return idx === 0 ? this.monto1 : this.monto2;
  }

  get cambioEfectivo(): number {
    return Math.max(0, parseFloat(((this._montoRecibidoEfectivo ?? 0) - this.porcionEfectivo).toFixed(2)));
  }

  get esValido(): boolean {
    if (this.seleccionados.length === 0) return false;
    if (this.dosMetodos) {
      if (!this.monto1Input || this.monto1Input <= 0 || this.monto1Input >= this.totalRef) return false;
    }
    // Recibido es opcional: si se llena, solo invalida cuando es menor a la porción
    if (this.isSeleccionado('efectivo') && this._montoRecibidoEfectivo !== null) {
      if (this._montoRecibidoEfectivo < this.porcionEfectivo) return false;
    }
    return true;
  }

  // ── métodos del template ────────────────────────────────────

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['totalRef']) this._emit();
  }

  isSeleccionado(c: MetodoPagoCodigo): boolean {
    return this.seleccionados.includes(c);
  }

  toggleMetodo(c: MetodoPagoCodigo): void {
    if (this.isSeleccionado(c)) {
      this.seleccionados = this.seleccionados.filter(x => x !== c);
      if (this.seleccionados.length < 2) {
        this.monto1Input = null;
        this._montoRecibidoEfectivo = null;
      }
    } else if (this.seleccionados.length < 2) {
      this.seleccionados = [...this.seleccionados, c];
      this._montoRecibidoEfectivo = null; // limpiar al agregar 2do método
    }
    this._emit();
  }

  getNota(c: MetodoPagoCodigo): string { return this._nota[c] ?? ''; }
  setNota(c: MetodoPagoCodigo, v: string): void {
    this._nota = { ...this._nota, [c]: v };
    this._emit();
  }

  onMonto1Change(): void { this._emit(); }
  onMontoRecibidoChange(): void { this._emit(); }

  labelMetodo(c: MetodoPagoCodigo): string {
    return METODOS.find(m => m.codigo === c)?.label ?? c;
  }

  reset(): void {
    this.seleccionados = [];
    this.monto1Input = null;
    this._montoRecibidoEfectivo = null;
    this._nota = {};
    this._emit();
  }

  private _emit(): void {
    const recibidoEfectivo = this.mostrarRecibidoEfectivo ? this._montoRecibidoEfectivo : null;
    const pagos: PagoInput[] = this.seleccionados.map((c, i) => ({
      codigo: c,
      monto: this.dosMetodos && i === 0 ? this.monto1Input : null,
      // monto_recibido solo aplica para efectivo en pago único (para calcular cambio)
      monto_recibido: c === 'efectivo' && !this.dosMetodos ? recibidoEfectivo : null,
      nota: this._nota[c] || undefined,
    }));
    this.pagosChange.emit(pagos);
    this.validChange.emit(this.esValido);
  }
}
