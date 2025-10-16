import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { OperacionesComponent } from './operaciones.component';

@NgModule({
  declarations: [OperacionesComponent],
  imports: [CommonModule, RouterModule.forChild([{ path: '', component: OperacionesComponent }])]
})
export class OperacionesModule { }
// touched to refresh TS server
