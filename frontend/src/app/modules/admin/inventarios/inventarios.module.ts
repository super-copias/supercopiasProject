import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { InventariosComponent } from './inventarios.component';
import { InventariosListComponent } from './inventarios-list/inventarios-list.component';
import { InventarioFormComponent } from './inventario-form/inventario-form.component';
import { InventarioDetalleComponent } from './inventario-detalle/inventario-detalle.component';
import { DepartamentosComponent } from './departamentos/departamentos.component';
import { MovimientosHistorialComponent } from './movimientos-historial/movimientos-historial.component';

const routes: Routes = [
  {
    path: '',
    component: InventariosComponent,
    children: [
      { path: '',               component: InventariosListComponent },
      { path: 'nuevo',          component: InventarioFormComponent },
      { path: 'editar/:id',     component: InventarioFormComponent },
      { path: 'detalle/:id',    component: InventarioDetalleComponent },
      { path: 'departamentos',  component: DepartamentosComponent },
      { path: 'movimientos',    component: MovimientosHistorialComponent }
    ]
  }
];

@NgModule({
  declarations: [
    InventariosComponent,
    InventariosListComponent,
    InventarioFormComponent,
    InventarioDetalleComponent,
    DepartamentosComponent,
    MovimientosHistorialComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild(routes)
  ]
})
export class InventariosModule { }

