import { Component, OnInit } from '@angular/core';
import { ClientesService } from '../../services/clientes.service';

@Component({
  selector: 'app-clientes-list',
  template: `
  <div>
    <h2>Clientes</h2>
    <input placeholder="Buscar" [(ngModel)]="q" (input)="load()" />
    <table>
      <tr *ngFor="let c of clientes">
        <td>{{c.nombre}}</td>
        <td>{{c.telefono}}</td>
      </tr>
    </table>
  </div>
  `
})
export class ClientesListComponent implements OnInit {
  clientes: any[] = [];
  q = '';
  constructor(private svc: ClientesService) { }
  ngOnInit() { this.load(); }
  load() {
    this.svc.list(this.q).subscribe((r: any) => { this.clientes = r.data; });
  }
}
