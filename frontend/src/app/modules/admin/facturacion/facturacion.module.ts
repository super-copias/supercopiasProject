import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { FacturacionComponent } from './facturacion.component';

@NgModule({
  declarations: [FacturacionComponent],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild([{ path: '', component: FacturacionComponent }]),
  ],
})
export class FacturacionModule {}
