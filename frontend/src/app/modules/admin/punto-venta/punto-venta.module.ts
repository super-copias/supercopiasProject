import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { PuntoVentaComponent }        from './punto-venta.component';
import { CatalogoComponent }           from './components/catalogo/catalogo.component';
import { CarritoComponent }            from './components/carrito/carrito.component';
import { SelectorClienteComponent }    from './components/selector-cliente/selector-cliente.component';
import { PanelCobroComponent }         from './components/panel-cobro/panel-cobro.component';
import { TicketComponent }             from './components/ticket/ticket.component';
import { HistorialVentasComponent }    from './components/historial-ventas/historial-ventas.component';
import { CotizacionesListComponent }   from './components/cotizaciones-list/cotizaciones-list.component';
import { PedidoFormComponent }         from './components/pedido-form/pedido-form.component';
import { PedidosListComponent }        from './components/pedidos-list/pedidos-list.component';
import { SharedModule }                from '../../../shared/shared.module';

@NgModule({
  declarations: [
    PuntoVentaComponent,
    CatalogoComponent,
    CarritoComponent,
    SelectorClienteComponent,
    PanelCobroComponent,
    TicketComponent,
    HistorialVentasComponent,
    CotizacionesListComponent,
    PedidoFormComponent,
    PedidosListComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    SharedModule,
    RouterModule.forChild([{ path: '', component: PuntoVentaComponent }]),
  ]
})
export class PuntoVentaModule { }
