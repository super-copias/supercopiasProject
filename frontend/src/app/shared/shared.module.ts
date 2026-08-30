import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColaboradoresTableComponent } from '../modules/admin/components/colaboradores-table/colaboradores-table.component';
import { NotificationComponent } from './notification/notification.component';
import { FacturaImpuestosPreviewComponent } from './factura-impuestos-preview/factura-impuestos-preview.component';
import { Hora12Pipe } from './pipes/hora12.pipe';

@NgModule({
  declarations: [ColaboradoresTableComponent, NotificationComponent, FacturaImpuestosPreviewComponent, Hora12Pipe],
  imports: [CommonModule],
  exports: [ColaboradoresTableComponent, NotificationComponent, FacturaImpuestosPreviewComponent, Hora12Pipe]
})
export class SharedModule { }
