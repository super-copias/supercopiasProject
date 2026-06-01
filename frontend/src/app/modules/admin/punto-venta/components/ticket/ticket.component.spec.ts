import { of } from 'rxjs';
import { TicketComponent } from './ticket.component';

class PosServiceMock {
  marcarTicketGenerado = jasmine.createSpy('marcarTicketGenerado').and.returnValue(of({}));
}

describe('TicketComponent', () => {
  let component: TicketComponent;
  let posService: PosServiceMock;

  beforeEach(() => {
    posService = new PosServiceMock();
    component = new TicketComponent(posService as any);
  });

  it('escenario 1 - venta rapida: debe mostrarse cuando ticketType=venta y hay venta', () => {
    component.ticketType = 'venta';
    component.venta = { id: 1, folio: 'PV-2026-00001', total: 100 } as any;

    expect(component.esVisible).toBeTrue();
  });

  it('escenario 2 - historial de venta: debe mostrarse ticket de venta desde detalle', () => {
    component.ticketType = 'venta';
    component.venta = { id: 22, folio: 'PV-2026-00022', estatus: 'completada', total: 250 } as any;

    expect(component.esVisible).toBeTrue();
  });

  it('escenario 3 - cotizacion inicial: debe mostrarse cuando ticketType=cotizacion', () => {
    component.ticketType = 'cotizacion';
    component.cotizacion = { id: 3, folio: 'CQ-2026-00003', total: 300 } as any;

    expect(component.esVisible).toBeTrue();
  });

  it('escenario 4 - cotizacion detalle: debe emitir cargarAlCarrito con la cotizacion', () => {
    const emitSpy = spyOn(component.cargarAlCarrito, 'emit');
    const cotizacion = { id: 9, folio: 'CQ-2026-00009', total: 99 } as any;
    component.ticketType = 'cotizacion';
    component.cotizacion = cotizacion;

    component.onCargarAlCarrito();

    expect(emitSpy).toHaveBeenCalledWith(cotizacion);
  });

  it('escenario 5 - generar pedido: debe mostrar ticket de pedido y calcular saldo', () => {
    component.ticketType = 'pedido';
    component.pedido = { id: 5, folio: 'PP-2026-00005', total: 500, anticipo: 150 } as any;

    expect(component.esVisible).toBeTrue();
    expect(component.saldoPedido).toBe(350);
  });

  it('escenario 6 - pedido ver detalle: debe calcular saldo con factura para pedido reimpreso', () => {
    component.ticketType = 'pedido';
    component.pedido = {
      id: 6,
      folio: 'PP-2026-00006',
      total: 1000,
      anticipo: 200,
      requiere_factura: true,
      tipo_persona_factura: 'pm',
    } as any;

    expect(component.esVisible).toBeTrue();
    expect(component.saldoPedidoConFactura).toBe(947.5);
  });

  it('escenario 7 - venta post-entrega de pedido: debe marcar ticket generado al imprimir', () => {
    const printSpy = spyOn(component, 'imprimirTicketInterno');
    const emitSpy = spyOn(component.imprimir, 'emit');
    component.ticketType = 'venta';
    component.venta = { id: 77, folio: 'PV-2026-00077', origen_venta: 'pedido', total: 450 } as any;

    component.imprimirTicket();

    expect(posService.marcarTicketGenerado).toHaveBeenCalledWith(77);
    expect(printSpy).toHaveBeenCalled();
    expect(emitSpy).toHaveBeenCalled();
  });
});
