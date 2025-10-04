import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AdminComponent } from './admin.component';
import { SideNavComponent } from './components/side-nav/side-nav.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ColaboradoresTableComponent } from './components/colaboradores-table/colaboradores-table.component';

@NgModule({
  declarations: [
    AdminComponent,
    SideNavComponent,
    DashboardComponent,
    ColaboradoresTableComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild([
      {
        path: '',
        component: AdminComponent,
        children: [
          { path: '', component: DashboardComponent },
          { path: 'empleados', loadChildren: () => import('../empleados/empleados.module').then(m => m.EmpleadosModule) },
          { path: 'clientes', loadChildren: () => import('../clientes/clientes.module').then(m => m.ClientesModule) }
        ]
      }
    ])
  ]
})
export class AdminModule { }
