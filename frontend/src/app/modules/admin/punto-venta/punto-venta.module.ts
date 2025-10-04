import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PuntoVentaComponent } from './punto-venta.component';

@NgModule({
  declarations: [PuntoVentaComponent],
  imports: [CommonModule, RouterModule.forChild([{ path: '', component: PuntoVentaComponent }])]
})
export class PuntoVentaModule { }
// touched to refresh TS server
