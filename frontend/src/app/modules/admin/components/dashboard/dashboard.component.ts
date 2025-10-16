import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { EmpleadosService } from '../../../../services/empleados.service';
import { ClientesService } from '../../../../services/clientes.service';

interface DashboardStats {
  totalClientes: number;
  clientesActivos: number;
  clientesInactivos: number;
  totalEmpleados: number;
  empleadosActivos: number;
  empleadosInactivos: number;
}

interface UltimosRegistros {
  clientes: any[];
  empleados: any[];
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  loading = false;

  // Para usar Date.now() en el template
  Date = Date;

  // Estadísticas principales
  stats: DashboardStats = {
    totalClientes: 0,
    clientesActivos: 0,
    clientesInactivos: 0,
    totalEmpleados: 0,
    empleadosActivos: 0,
    empleadosInactivos: 0
  };

  // Últimos registros
  ultimosClientes: any[] = [];
  ultimosEmpleados: any[] = [];

  // Control de vista
  mostrarClientes = true;
  mostrarEmpleados = true;

  constructor(
    private empleadosService: EmpleadosService,
    private clientesService: ClientesService
  ) {}

  ngOnInit() {
    this.cargarDashboard();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Carga todas las estadísticas del dashboard
   */
  cargarDashboard() {
    this.loading = true;

    forkJoin({
      // Obtener últimos 5 registros para mostrar en tablas
      ultimosClientes: this.clientesService.getList({ page: 1, limit: 5 }),
      ultimosEmpleados: this.empleadosService.getList({ page: 1, limit: 5 }),
      // Obtener TODOS los registros para contar activos/inactivos correctamente
      todosClientes: this.clientesService.getList({ page: 1, limit: 999999 }),
      todosEmpleados: this.empleadosService.getList({ page: 1, limit: 999999 })
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (resultado) => {
        // Procesar clientes
        if (resultado.ultimosClientes.success && resultado.todosClientes.success) {
          this.stats.totalClientes = resultado.todosClientes.pagination?.total || 0;
          this.ultimosClientes = resultado.ultimosClientes.data || [];
          
          // Contar activos e inactivos de TODOS los clientes (no solo los últimos 5)
          const todosLosClientes = resultado.todosClientes.data || [];
          this.stats.clientesActivos = todosLosClientes.filter(c => c.activo).length;
          this.stats.clientesInactivos = todosLosClientes.filter(c => !c.activo).length;
        }

        // Procesar empleados
        if (resultado.ultimosEmpleados.success && resultado.todosEmpleados.success) {
          this.stats.totalEmpleados = resultado.todosEmpleados.pagination?.total || 0;
          this.ultimosEmpleados = resultado.ultimosEmpleados.data || [];
          
          // Contar activos e inactivos de TODOS los empleados (no solo los últimos 5)
          const todosLosEmpleados = resultado.todosEmpleados.data || [];
          this.stats.empleadosActivos = todosLosEmpleados.filter(e => e.activo).length;
          this.stats.empleadosInactivos = todosLosEmpleados.filter(e => !e.activo).length;
        }

        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar dashboard:', error);
        this.loading = false;
      }
    });
  }

  /**
   * Recarga las estadísticas
   */
  recargar() {
    this.cargarDashboard();
  }

  /**
   * Alterna la visibilidad de la sección de clientes
   */
  toggleClientes() {
    this.mostrarClientes = !this.mostrarClientes;
  }

  /**
   * Alterna la visibilidad de la sección de empleados
   */
  toggleEmpleados() {
    this.mostrarEmpleados = !this.mostrarEmpleados;
  }

  /**
   * Obtiene el porcentaje de activos
   */
  getPorcentajeActivos(activos: number, total: number): number {
    return total > 0 ? Math.round((activos / total) * 100) : 0;
  }
}