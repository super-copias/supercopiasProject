import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { EquiposComponent } from './equipos.component';
import { EquiposListComponent } from './equipos-list/equipos-list.component';
import { EquiposFormComponent } from './equipos-form/equipos-form.component';
import { EquipoDetalleComponent } from './equipo-detalle/equipo-detalle.component';

@NgModule({
  declarations: [
    EquiposComponent,
    EquiposListComponent,
    EquiposFormComponent,
    EquipoDetalleComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild([
      { 
        path: '', 
        component: EquiposComponent,
        children: [
          { path: '', component: EquiposListComponent },
          { path: 'nuevo', component: EquiposFormComponent },
          { path: 'editar/:id', component: EquiposFormComponent },
          { path: 'detalle/:id', component: EquipoDetalleComponent }
        ]
      }
    ])
  ]
})
export class EquiposModule { }
