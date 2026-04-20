import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColaboradoresTableComponent } from '../modules/admin/components/colaboradores-table/colaboradores-table.component';
import { NotificationComponent } from './notification/notification.component';
import { FacturaImpuestosPreviewComponent } from './factura-impuestos-preview/factura-impuestos-preview.component';

@NgModule({
  declarations: [ColaboradoresTableComponent, NotificationComponent, FacturaImpuestosPreviewComponent],
  imports: [CommonModule],
  exports: [ColaboradoresTableComponent, NotificationComponent, FacturaImpuestosPreviewComponent]
})
export class SharedModule { }
