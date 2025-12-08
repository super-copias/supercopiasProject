import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProveedoresListComponent } from './proveedores-list.component';
import { ProveedoresFormComponent } from './proveedores-form.component';
import { ProveedoresTableComponent } from './proveedores-table/proveedores-table.component';

@NgModule({
  declarations: [
    ProveedoresListComponent,
    ProveedoresFormComponent,
    ProveedoresTableComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild([
      { path: '', component: ProveedoresListComponent },
      { path: 'nuevo', component: ProveedoresFormComponent }
    ])
  ]
})
export class ProveedoresModule { }
// touched to refresh TS server
