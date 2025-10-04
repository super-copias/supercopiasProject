import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-clientes-table',
  templateUrl: './clientes-table.component.html',
  styleUrls: ['./clientes-table.component.scss']
})
export class ClientesTableComponent {
  @Input() clientes: any[] = [];

  verDetalles(cliente: any) {
    console.log('Ver detalles cliente', cliente);
  }
}
