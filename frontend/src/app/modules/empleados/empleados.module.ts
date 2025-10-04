import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EmpleadosListComponent } from './empleados-list.component';
import { EmpleadosAdminComponent } from './empleados-admin.component';

@NgModule({
  declarations: [EmpleadosListComponent, EmpleadosAdminComponent],
  imports: [CommonModule, FormsModule, RouterModule.forChild([
    { path: 'empleados', component: EmpleadosListComponent },
    { path: 'empleados/admin', component: EmpleadosAdminComponent }
  ])]
})
export class EmpleadosModule { }
