import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProveedoresListComponent } from './proveedores-list.component';

@NgModule({
  declarations: [ProveedoresListComponent],
  imports: [CommonModule, RouterModule.forChild([
    { path: '', component: ProveedoresListComponent }
  ])]
})
export class ProveedoresModule { }
// touched to refresh TS server
