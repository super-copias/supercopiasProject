import { Component, OnInit } from '@angular/core';
import { ClientesService } from '../../services/clientes.service';

@Component({
  selector: 'app-clientes-list',
  template: `
  <div class="p-3">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h3>Gestión de Clientes</h3>
      <div>
        <a class="btn btn-outline-secondary btn-sm d-inline-flex align-items-center me-2" [routerLink]="['/admin/clientes/nuevo']">
          <i class="fas fa-plus"></i>
          <span class="ms-1">Nuevo</span>
        </a>
        <a class="btn btn-outline-primary btn-sm d-inline-flex align-items-center" [routerLink]="['/admin/clientes/upload']">
          <i class="fas fa-upload"></i>
          <span class="ms-1">Alta masiva</span>
        </a>
      </div>
    </div>

    <div class="mb-3 d-flex">
      <input class="form-control me-2" placeholder="Buscar por nombre, ID o teléfono" [(ngModel)]="q" (input)="load()" />
      <select class="form-select" [(ngModel)]="limit" (change)="load()">
        <option [value]="5">5</option>
        <option [value]="10">10</option>
        <option [value]="25">25</option>
      </select>
    </div>

    <table class="table table-striped">
      <thead>
        <tr>
          <th>ID</th>
          <th>Nombre</th>
          <th>Teléfono</th>
          <th>Correo</th>
          <th>Dirección</th>
          <th>Entrega</th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let c of clientes">
          <td>{{c.id}}</td>
          <td>{{c.nombre}}</td>
          <td>{{c.telefono}}</td>
          <td>{{c.email}}</td>
          <td>{{c.direccion}}</td>
          <td>{{c.entrega}}</td>
        </tr>
      </tbody>
    </table>

    <nav *ngIf="total>limit" aria-label="paginacion">
      <ul class="pagination">
        <li class="page-item" [class.disabled]="page===1"><a class="page-link" (click)="go(page-1)">Anterior</a></li>
        <li class="page-item disabled"><span class="page-link">Página {{page}} / {{pages}}</span></li>
        <li class="page-item" [class.disabled]="page===pages"><a class="page-link" (click)="go(page+1)">Siguiente</a></li>
      </ul>
    </nav>
  </div>
  `
})
export class ClientesListComponent implements OnInit {
  clientes: any[] = [];
  q = '';
  page = 1;
  limit = 10;
  total = 0;
  pages = 1;
  constructor(private svc: ClientesService) { }
  ngOnInit() { this.load(); }
  load() {
    this.svc.list(this.q, this.page, this.limit).subscribe((r: any) => { this.clientes = r.data; this.total = r.total; this.pages = Math.max(1, Math.ceil(this.total / this.limit)); });
  }
  go(p: number) { if (p<1 || p>this.pages) return; this.page = p; this.load(); }
}
