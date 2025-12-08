import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { InventariosComponent } from './inventarios.component';
import { InventariosListComponent } from './inventarios-list/inventarios-list.component';
import { InventarioFormComponent } from './inventario-form/inventario-form.component';
import { InventarioDetalleComponent } from './inventario-detalle/inventario-detalle.component';
import { CategoriasListComponent } from './categorias-list/categorias-list.component';
import { ReglasStockComponent } from './reglas-stock/reglas-stock.component';

const routes: Routes = [
  {
    path: '',
    component: InventariosComponent,
    children: [
      { path: '', component: InventariosListComponent },
      { path: 'nuevo', component: InventarioFormComponent },
      { path: 'editar/:id', component: InventarioFormComponent },
      { path: 'detalle/:id', component: InventarioDetalleComponent },
      { path: 'categorias', component: CategoriasListComponent },
      { path: ':id/reglas-stock', component: ReglasStockComponent }
    ]
  }
];

@NgModule({
  declarations: [
    InventariosComponent,
    InventariosListComponent,
    InventarioFormComponent,
    InventarioDetalleComponent,
    CategoriasListComponent,
    ReglasStockComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild(routes)
  ]
})
export class InventariosModule { }
