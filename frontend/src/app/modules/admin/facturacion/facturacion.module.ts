import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { FacturacionComponent } from './facturacion.component';
import { TicketModule } from '../punto-venta/components/ticket/ticket.module';

@NgModule({
  declarations: [FacturacionComponent],
  imports: [
    CommonModule,
    FormsModule,
    TicketModule,
    RouterModule.forChild([{ path: '', component: FacturacionComponent }]),
  ],
})
export class FacturacionModule {}
