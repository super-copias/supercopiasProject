import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AdminComponent } from './admin.component';
import { SideNavComponent } from './components/side-nav/side-nav.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
// ColaboradoresTableComponent ahora está en SharedModule
import { AuthGuard } from '../../services/auth.guard';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [
    AdminComponent,
    SideNavComponent,
    DashboardComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    RouterModule.forChild([
      {
        path: '',
        component: AdminComponent,
        canActivate: [AuthGuard],
        children: [
          { path: '', component: DashboardComponent },
          { path: 'empleados', loadChildren: () => import('../empleados/empleados.module').then(m => m.EmpleadosModule), canLoad: [AuthGuard], canActivateChild: [AuthGuard] },
          { path: 'clientes', loadChildren: () => import('../clientes/clientes.module').then(m => m.ClientesModule), canLoad: [AuthGuard], canActivateChild: [AuthGuard] }
          ,{ path: 'inventarios', loadChildren: () => import('./inventarios/inventarios.module').then(m => m.InventariosModule), canLoad: [AuthGuard], canActivateChild: [AuthGuard] },
          { path: 'equipos', loadChildren: () => import('./equipos/equipos.module').then(m => m.EquiposModule), canLoad: [AuthGuard], canActivateChild: [AuthGuard] },
          { path: 'reportes', loadChildren: () => import('./reportes/reportes.module').then(m => m.ReportesModule), canLoad: [AuthGuard], canActivateChild: [AuthGuard] },
          { path: 'punto-venta', loadChildren: () => import('./punto-venta/punto-venta.module').then(m => m.PuntoVentaModule), canLoad: [AuthGuard], canActivateChild: [AuthGuard] },
          { path: 'proveedores', loadChildren: () => import('../proveedores/proveedores.module').then(m => m.ProveedoresModule), canLoad: [AuthGuard], canActivateChild: [AuthGuard] }
        ],
        canActivateChild: [AuthGuard]
      }
    ])
  ]
})
export class AdminModule { }
