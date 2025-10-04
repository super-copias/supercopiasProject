import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { EquiposComponent } from './equipos.component';

@NgModule({
  declarations: [EquiposComponent],
  imports: [CommonModule, RouterModule.forChild([{ path: '', component: EquiposComponent }])]
})
export class EquiposModule { }
