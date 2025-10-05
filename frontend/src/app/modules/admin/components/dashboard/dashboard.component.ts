import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, finalize } from 'rxjs/operators';
import { EmpleadosService } from '../../../../services/empleados.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  colaboradores: any[] = [];
  colaboradoresFiltered: any[] = [];
  search$ = new Subject<string>();
  private searchSub: Subscription | null = null;
  page = 1;
  limit = 10;
  total = 0;
  pages = 1;
  q = '';
  loading = false;

  estadisticas = {
    trabajosPendientes: 24,
    clientesActivos: 150,
    ingresosMensuales: 40000,
    serviciosCompletados: 215
  };

  constructor(private svc: EmpleadosService) {}

  ngOnInit() { 
    this.load();
    this.searchSub = this.search$.pipe(debounceTime(300)).subscribe(q => { this.q = q; this.page = 1; this.load(); });
  }

  load() {
    this.loading = true;
    this.svc.list(this.q, this.page, this.limit).pipe(finalize(() => this.loading = false)).subscribe((r: any) => {
      this.colaboradores = r.data || [];
      this.colaboradoresFiltered = [...this.colaboradores];
      this.total = r.total || this.colaboradores.length;
      this.pages = Math.max(1, Math.ceil(this.total / this.limit));
    });
  }

  ngOnDestroy() { if (this.searchSub) this.searchSub.unsubscribe(); }

  go(p: number) { if (p<1 || p>this.pages) return; this.page = p; this.load(); }
}