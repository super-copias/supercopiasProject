import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AdminComponent } from './admin.component';
import { SideNavComponent } from './components/side-nav/side-nav.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { SinAccesoComponent } from './components/sin-acceso/sin-acceso.component';
// ColaboradoresTableComponent ahora está en SharedModule
import { AuthGuard } from '../../services/auth.guard';
import { ModuleGuard } from '../../services/module.guard';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [
    AdminComponent,
    SideNavComponent,
    DashboardComponent,
    SinAccesoComponent
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
          { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
          { path: 'sin-acceso', component: SinAccesoComponent },
          { path: 'dashboard', component: DashboardComponent, canActivate: [ModuleGuard], data: { module: 'dashboard' } },
          { path: 'profile', loadChildren: () => import('../profile/profile.module').then(m => m.ProfileModule) },
          { path: 'empleados', loadChildren: () => import('../empleados/empleados.module').then(m => m.EmpleadosModule), canLoad: [ModuleGuard], data: { module: 'empleados' } },
          { path: 'clientes', loadChildren: () => import('../clientes/clientes.module').then(m => m.ClientesModule), canLoad: [ModuleGuard], data: { module: 'clientes' } }
          ,{ path: 'inventarios', loadChildren: () => import('./inventarios/inventarios.module').then(m => m.InventariosModule), canLoad: [ModuleGuard], data: { module: 'inventarios' } },
          { path: 'equipos', loadChildren: () => import('./equipos/equipos.module').then(m => m.EquiposModule), canLoad: [ModuleGuard], data: { module: 'equipos' } },
          { path: 'reportes', loadChildren: () => import('./reportes/reportes.module').then(m => m.ReportesModule), canLoad: [ModuleGuard], data: { module: 'reportes' } },
          { path: 'facturacion', loadChildren: () => import('./facturacion/facturacion.module').then(m => m.FacturacionModule), canLoad: [ModuleGuard], data: { module: 'facturacion' } },
          { path: 'punto-venta', loadChildren: () => import('./punto-venta/punto-venta.module').then(m => m.PuntoVentaModule), canLoad: [ModuleGuard], data: { module: 'punto_venta' } },
          { path: 'proveedores', loadChildren: () => import('../proveedores/proveedores.module').then(m => m.ProveedoresModule), canLoad: [ModuleGuard], data: { module: 'proveedores' } }
        ]
      }
    ])
  ]
})
export class AdminModule { }
