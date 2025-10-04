import { Component, OnInit } from '@angular/core';
import { EmpleadosService } from '../../services/empleados.service';

@Component({
  selector: 'app-empleados-list',
  template: `
  <div>
    <h2>Empleados</h2>
    <input placeholder="Buscar" [(ngModel)]="q" (input)="load()" />
    <table>
      <tr *ngFor="let c of empleados">
        <td>{{c.nombre}}</td>
        <td>{{c.puesto}}</td>
      </tr>
    </table>
  </div>
  `
})
export class EmpleadosListComponent implements OnInit {
  empleados: any[] = [];
  q = '';
  constructor(private svc: EmpleadosService) { }
  ngOnInit() { this.load(); }
  load() {
    this.svc.list(this.q).subscribe((r: any) => { this.empleados = r.data; });
  }
}
