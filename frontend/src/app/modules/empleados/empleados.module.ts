import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EmpleadosListComponent } from './empleados-list.component';
import { EmpleadosAdminComponent } from './empleados-admin.component';
import { EmpleadosFormComponent } from './empleados-form.component';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [EmpleadosListComponent, EmpleadosAdminComponent, EmpleadosFormComponent],
  imports: [CommonModule, FormsModule, SharedModule, RouterModule.forChild([
    { path: '', component: EmpleadosListComponent },
    { path: 'nuevo', component: EmpleadosFormComponent },
    { path: ':id/editar', component: EmpleadosFormComponent },
    { path: 'admin', component: EmpleadosAdminComponent }
  ])]
})
export class EmpleadosModule { }
