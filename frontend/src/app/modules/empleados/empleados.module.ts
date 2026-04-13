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
import { EmpleadosTableComponent } from './empleados-table/empleados-table.component';
import { CredencialesModalComponent } from './credenciales-modal.component';
import { EmpleadoDetailModalComponent } from './empleado-detail-modal.component';
import { EventosPersonalComponent } from './eventos-personal.component';
import { EventoPersonalFormModalComponent } from './evento-personal-form-modal.component';
import { FormVacacionesComponent } from './form-vacaciones.component';
import { FormFaltaComponent } from './form-falta.component';
import { FormPermisoComponent } from './form-permiso.component';
import { FormOtroComponent } from './form-otro.component';
import { HorariosAccesoComponent } from './horarios-acceso.component';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [
    EmpleadosListComponent, 
    EmpleadosFormComponent, 
    EmpleadosTableComponent,
    CredencialesModalComponent,
    EmpleadoDetailModalComponent,
    EventosPersonalComponent,
    EventoPersonalFormModalComponent,
    FormVacacionesComponent,
    FormFaltaComponent,
    FormPermisoComponent,
    FormOtroComponent,
    HorariosAccesoComponent
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
      { path: 'horarios', component: HorariosAccesoComponent }
    ])
  ]
})
export class EmpleadosModule { }
