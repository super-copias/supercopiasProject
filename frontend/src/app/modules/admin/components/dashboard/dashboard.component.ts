import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  colaboradores = [
    {
      id: 1,
      nombre: 'Juan Pérez',
      correo: 'juan.perez@supercopias.com',
      cargo: 'Operador de Impresión',
      departamento: 'Producción',
      fechaIngreso: '2024-01-15',
      estado: 'Activo'
    },
    {
      id: 2,
      nombre: 'María González',
      correo: 'maria.gonzalez@supercopias.com',
      cargo: 'Atención al Cliente',
      departamento: 'Ventas',
      fechaIngreso: '2024-02-01',
      estado: 'Activo'
    }
  ];
  colaboradoresFiltered: any[] = [];
  search$ = new Subject<string>();
  private searchSub: Subscription | null = null;

  estadisticas = {
    trabajosPendientes: 24,
    clientesActivos: 150,
    ingresosMensuales: 40000,
    serviciosCompletados: 215
  };

  ngOnInit() { this.colaboradoresFiltered = [...this.colaboradores]; this.searchSub = this.search$.pipe(debounceTime(300)).subscribe(q => this.filter(q)); }
  ngOnDestroy() { if (this.searchSub) this.searchSub.unsubscribe(); }

  private filter(q: string) {
    const qnorm = (q || '').normalize ? (q || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase() : (q || '').toLowerCase();
    this.colaboradoresFiltered = this.colaboradores.filter(c => Object.values(c).some(v => (v || '').toString().normalize ? (v || '').toString().normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().includes(qnorm) : (v || '').toString().toLowerCase().includes(qnorm)));
  }
}