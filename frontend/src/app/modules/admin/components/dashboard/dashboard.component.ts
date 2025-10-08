import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, finalize, switchMap, takeUntil } from 'rxjs/operators';
import { EmpleadosService } from '../../../../services/empleados.service';
import { RequestCancellationService } from '../../../../services/request-cancellation.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  colaboradores: any[] = [];
  colaboradoresFiltered: any[] = [];
  search$ = new Subject<string>();
  private destroy$ = new Subject<void>();
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

  constructor(
    private svc: EmpleadosService,
    private cancellationService: RequestCancellationService
  ) {}

  ngOnInit() { 
    this.load();
    
    // Búsqueda optimizada con cancelación automática
    this.searchSub = this.search$.pipe(
      debounceTime(300),
      switchMap(q => {
        this.q = q; 
        this.page = 1; 
        return this.loadData();
      }),
      takeUntil(this.destroy$)
    ).subscribe();
  }

  private loadData() {
    this.loading = true;
    return this.svc.list(this.q, this.page, this.limit).pipe(
      takeUntil(this.destroy$),
      finalize(() => this.loading = false)
    );
  }

  load() {
    this.loadData().subscribe({
      next: (r: any) => {
        this.colaboradores = r.data || [];
        this.colaboradoresFiltered = [...this.colaboradores];
        this.total = r.total || this.colaboradores.length;
        this.pages = Math.max(1, Math.ceil(this.total / this.limit));
      },
      error: (error) => {
        console.error('Error loading dashboard data:', error);
        this.colaboradores = [];
        this.colaboradoresFiltered = [];
        this.total = 0;
        this.pages = 1;
      }
    });
  }

  ngOnDestroy() { 
    this.destroy$.next();
    this.destroy$.complete();
    if (this.searchSub) this.searchSub.unsubscribe(); 
  }

  go(p: number) { 
    if (p < 1 || p > this.pages || p === this.page) return; 
    this.page = p; 
    this.load(); 
  }
}