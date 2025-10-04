import { Component } from '@angular/core';
import { EmpleadosService } from '../../services/empleados.service';

@Component({
  selector: 'app-empleados-admin',
  template: `
  <div>
    <h3>Administrar empleados</h3>
    <div>
      <label>Importar Excel</label>
      <input type="file" (change)="onFile($event)" />
      <button (click)="import()">Importar</button>
    </div>
    <div>
      <h4>Asignar rol</h4>
      <input placeholder="ID empleado" [(ngModel)]="id" />
      <input placeholder="Rol" [(ngModel)]="role" />
      <button (click)="assign()">Asignar</button>
    </div>
  </div>
  `
})
export class EmpleadosAdminComponent {
  file?: File;
  id = '';
  role = '';
  constructor(private svc: EmpleadosService) { }
  onFile(e: any) { this.file = e.target.files[0]; }
  import() { if (!this.file) return; this.svc.import(this.file).subscribe(r => console.log(r)); }
  assign() { if (!this.id || !this.role) return; this.svc.assignRole(this.id, this.role).subscribe(r => console.log(r)); }
}
