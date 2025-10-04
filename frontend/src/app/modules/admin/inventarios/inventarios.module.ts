import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { InventariosComponent } from './inventarios.component';

@NgModule({
  declarations: [InventariosComponent],
  imports: [CommonModule, RouterModule.forChild([{ path: '', component: InventariosComponent }])]
})
export class InventariosModule { }
// touched to refresh TS server
