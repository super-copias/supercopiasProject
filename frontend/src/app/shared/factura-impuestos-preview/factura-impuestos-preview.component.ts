import { Component, Input, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';
import { FacturasService } from '../../services/facturas.service';

@Component({
  selector: 'app-factura-impuestos-preview',
  templateUrl: './factura-impuestos-preview.component.html',
  styleUrls: ['./factura-impuestos-preview.component.scss'],
})
export class FacturaImpuestosPreviewComponent implements OnChanges, OnDestroy {

  @Input() subtotal = 0;
  /** Si true, renderiza en tamaño pequeño */
  @Input() small = false;

  iva_pct  = 0.16;
  iva_monto = 0;
  isr_pct  = 0.0125;
  isr_monto = 0;
  total    = 0;

  private destroy$ = new Subject<void>();
  private calcTrigger$ = new Subject<number>();

  constructor(private facturasService: FacturasService) {
    this.calcTrigger$.pipe(
      debounceTime(200),
      takeUntil(this.destroy$),
    ).subscribe(sub => this.calcularDesdeApi(sub));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['subtotal']) {
      this.calcTrigger$.next(this.subtotal);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private calcularDesdeApi(sub: number): void {
    if (sub <= 0) {
      this.iva_monto = this.isr_monto = this.total = 0;
      return;
    }
    this.facturasService.calcularImpuestos(sub)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r) => {
          const d = r.data;
          this.iva_pct   = d.iva_pct;
          this.iva_monto = d.iva_monto;
          this.isr_pct   = d.isr_pct;
          this.isr_monto = d.isr_monto;
          this.total     = d.total;
        },
        error: () => {
          // Fallback local si la API falla
          this.iva_monto = parseFloat((sub * this.iva_pct).toFixed(2));
          this.isr_monto = parseFloat((sub * this.isr_pct).toFixed(2));
          this.total     = parseFloat((sub + this.iva_monto - this.isr_monto).toFixed(2));
        },
      });
  }
}
