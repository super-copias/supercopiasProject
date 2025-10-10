/**
 * Módulo de Empleados
 * Gestiona todas las vistas y componentes relacionados con empleados
 */

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { EmpleadosListComponent } from './empleados-list.component';
import { EmpleadosFormComponent } from './empleados-form.component';
import { EmpleadosUploadComponent } from './empleados-upload.component';
// import { EmpleadosTableComponent } from './empleados-table/empleados-table.component';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [
    EmpleadosListComponent, 
    EmpleadosFormComponent, 
    EmpleadosUploadComponent
    // EmpleadosTableComponent
  ],
  imports: [
    CommonModule, 
    FormsModule, 
    ReactiveFormsModule,
    SharedModule,
    RouterModule.forChild([
      { path: '', component: EmpleadosListComponent },
      { path: 'nuevo', component: EmpleadosFormComponent },
      { path: 'editar/:id', component: EmpleadosFormComponent },
      { path: 'upload', component: EmpleadosUploadComponent }
    ])
  ]
})
export class EmpleadosModule { }
