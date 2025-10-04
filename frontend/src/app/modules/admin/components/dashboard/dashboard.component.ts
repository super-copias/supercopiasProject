import { Component, OnInit } from '@angular/core';

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

  estadisticas = {
    trabajosPendientes: 24,
    clientesActivos: 150,
    ingresosMensuales: 40000,
    serviciosCompletados: 215
  };

  ngOnInit() {}
}