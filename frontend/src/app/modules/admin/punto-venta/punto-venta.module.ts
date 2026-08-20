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
import { TicketModule }                 from './components/ticket/ticket.module';
import { HistorialVentasComponent }    from './components/historial-ventas/historial-ventas.component';
import { CotizacionesListComponent }   from './components/cotizaciones-list/cotizaciones-list.component';
import { PedidoFormComponent }         from './components/pedido-form/pedido-form.component';
import { PedidosListComponent }        from './components/pedidos-list/pedidos-list.component';
import { SelectorPagoComponent }       from './components/selector-pago/selector-pago.component';
import { SharedModule }                from '../../../shared/shared.module';

@NgModule({
  declarations: [
    PuntoVentaComponent,
    CatalogoComponent,
    CarritoComponent,
    SelectorClienteComponent,
    PanelCobroComponent,
    HistorialVentasComponent,
    CotizacionesListComponent,
    PedidoFormComponent,
    PedidosListComponent,
    SelectorPagoComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    SharedModule,
    TicketModule,
    RouterModule.forChild([{ path: '', component: PuntoVentaComponent }]),
  ],
})
export class PuntoVentaModule { }
