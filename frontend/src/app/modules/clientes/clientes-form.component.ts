import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ClientesService } from '../../services/clientes.service';

@Component({
  selector: 'app-clientes-form',
  template: `
  <div class="p-4">
    <h3>Nuevo Cliente</h3>
    <form (ngSubmit)="save()">
      <div class="mb-2"><label>Nombre completo</label><input class="form-control" [(ngModel)]="model.nombre" name="nombre" required /></div>
      <div class="mb-2"><label>Teléfono</label><input class="form-control" [(ngModel)]="model.telefono" name="telefono" /></div>
      <div class="mb-2"><label>Correo</label><input class="form-control" [(ngModel)]="model.email" name="email" type="email" /></div>
      <div class="mb-2"><label>Dirección</label><input class="form-control" [(ngModel)]="model.direccion" name="direccion" /></div>
      <div class="mb-2"><label>Forma de entrega</label>
        <select class="form-control" [(ngModel)]="model.entrega" name="entrega">
          <option value="recoge">Recoge</option>
          <option value="envio">Envío</option>
        </select>
      </div>
      <h5>Datos de facturación</h5>
      <div class="mb-2"><label>Razón social</label><input class="form-control" [(ngModel)]="model.razon" name="razon" /></div>
      <div class="mb-2"><label>RFC</label><input class="form-control" [(ngModel)]="model.rfc" name="rfc" /></div>
      <div class="mb-2"><label>Régimen Fiscal</label><input class="form-control" [(ngModel)]="model.regimen" name="regimen" /></div>
      <div class="mb-2"><label>Código Postal</label><input class="form-control" [(ngModel)]="model.cp" name="cp" /></div>
      <div class="mb-2"><label>Uso CFDI</label><input class="form-control" [(ngModel)]="model.cfdi" name="cfdi" /></div>
      <div class="mt-3">
        <button class="btn btn-primary" type="submit">Guardar</button>
        <button class="btn btn-secondary ms-2" type="button" (click)="cancel()">Cancelar</button>
      </div>
    </form>
  </div>
  `
})
export class ClientesFormComponent {
  model: any = { entrega: 'recoge' };
  constructor(private svc: ClientesService, private router: Router) {}
  save() {
    this.svc.create(this.model).subscribe(() => this.router.navigate(['/admin/clientes']));
  }
  cancel() { this.router.navigate(['/admin/clientes']); }
}
