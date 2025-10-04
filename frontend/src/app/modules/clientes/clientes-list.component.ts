import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { ClientesService } from '../../services/clientes.service';

@Component({
  selector: 'app-clientes-list',
  template: `
  <div class="card mb-4">
    <div class="card-header d-flex justify-content-between align-items-center">
      <h5 class="mb-0">Clientes</h5>
      <div class="d-flex gap-2">
        <div class="input-group">
          <input class="form-control" placeholder="Buscar cliente..." [(ngModel)]="q" (input)="search$.next(q)" />
          <button class="btn btn-outline-secondary" type="button" (click)="load()"><i class="fas fa-search"></i></button>
        </div>
        <a class="btn btn-primary btn-sm d-inline-flex align-items-center" [routerLink]="['/admin/clientes/nuevo']">
          <i class="fas fa-plus"></i>
          <span class="ms-1">Nuevo</span>
        </a>
        <a class="btn btn-outline-primary btn-sm d-inline-flex align-items-center flex-nowrap text-nowrap" [routerLink]="['/admin/clientes/upload']">
          <i class="fas fa-upload"></i>
          <span class="ms-1">Alta&nbsp;masiva</span>
        </a>
      </div>
    </div>
    <div class="card-body">
      <app-clientes-table [clientes]="clientes"></app-clientes-table>

      <nav *ngIf="total>limit" aria-label="paginacion" class="mt-3">
        <ul class="pagination">
          <li class="page-item" [class.disabled]="page===1"><a class="page-link" (click)="go(page-1)">Anterior</a></li>
          <li class="page-item disabled"><span class="page-link">Página {{page}} / {{pages}}</span></li>
          <li class="page-item" [class.disabled]="page===pages"><a class="page-link" (click)="go(page+1)">Siguiente</a></li>
        </ul>
      </nav>
    </div>
  </div>
  `
})
export class ClientesListComponent implements OnInit {
  clientes: any[] = [];
  q = '';
  search$ = new Subject<string>();
  private searchSub: Subscription | null = null;
  page = 1;
  limit = 10;
  total = 0;
  pages = 1;
  constructor(private svc: ClientesService) { }
  ngOnInit() {
    this.load();
    this.searchSub = this.search$.pipe(debounceTime(300)).subscribe(q => { this.q = q; this.load(); });
  }
  ngOnDestroy() { if (this.searchSub) this.searchSub.unsubscribe(); }
  load() {
    this.svc.list(this.q, this.page, this.limit).subscribe((r: any) => { this.clientes = r.data; this.total = r.total; this.pages = Math.max(1, Math.ceil(this.total / this.limit)); });
  }
  go(p: number) { if (p<1 || p>this.pages) return; this.page = p; this.load(); }
}
