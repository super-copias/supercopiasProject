import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ClientesService } from '../../services/clientes.service';

@Component({
  selector: 'app-clientes-form',
  template: `
  <div class="p-4">
    <h3>{{isEdit ? 'Editar Cliente' : 'Nuevo Cliente'}}</h3>
    <form (ngSubmit)="save()">
      <div class="mb-2"><label>Nombre completo</label><input class="form-control" [(ngModel)]="model.nombre" name="nombre" required /></div>
      <div class="mb-2"><label>Teléfono</label><input class="form-control" [(ngModel)]="model.telefono" name="telefono" /></div>
      <div class="mb-2"><label>Segundo teléfono</label><input class="form-control" [(ngModel)]="model.segundoTelefono" name="segundoTelefono" /></div>
      <div class="mb-2"><label>Correo</label><input class="form-control" [(ngModel)]="model.email" name="email" type="email" /></div>
      <div class="mb-2"><label>Dirección</label><input class="form-control" [(ngModel)]="model.direccion" name="direccion" /></div>
      <h5>Datos de facturación</h5>
      <div class="mb-2"><label>Razón social</label><input class="form-control" [(ngModel)]="model.razon" name="razon" /></div>
      <div class="mb-2"><label>RFC</label><input class="form-control" [(ngModel)]="model.rfc" name="rfc" /></div>
      <div class="mb-2"><label>Régimen Fiscal</label><input class="form-control" [(ngModel)]="model.regimen" name="regimen" /></div>
      <div class="mb-2"><label>Código Postal</label><input class="form-control" [(ngModel)]="model.cp" name="cp" /></div>
      <div class="mb-2">
        <label>Uso CFDI</label>
        <select class="form-control" [(ngModel)]="model.cfdi" name="cfdi">
          <option value="">Seleccione un uso CFDI...</option>
          <option *ngFor="let uso of usosCFDI" [value]="uso.codigo + ' - ' + uso.descripcion">
            {{uso.codigo}} - {{uso.descripcion}}
          </option>
        </select>
      </div>
      <div class="mt-3">
        <button class="btn btn-primary" type="submit">{{isEdit ? 'Actualizar' : 'Guardar'}}</button>
        <button class="btn btn-secondary ms-2" type="button" (click)="cancel()">Cancelar</button>
      </div>
    </form>
  </div>
  `
})
export class ClientesFormComponent implements OnInit {
  model: any = {};
  isEdit = false;
  clienteId: string | null = null;
  usosCFDI: any[] = [];
  
  constructor(
    private svc: ClientesService, 
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.loadUsosCFDI();
    this.route.queryParams.subscribe(params => {
      if (params['id']) {
        this.clienteId = params['id'];
        this.isEdit = true;
        this.loadCliente();
      }
    });
  }

  loadUsosCFDI() {
    this.svc.getUsosCFDI().subscribe(usos => {
      this.usosCFDI = usos;
    });
  }

  loadCliente() {
    if (this.clienteId) {
      this.svc.getById(this.clienteId).subscribe(cliente => {
        if (cliente) {
          this.model = { ...cliente };
        }
      });
    }
  }

  save() {
    if (this.isEdit && this.clienteId) {
      this.svc.update(this.clienteId, this.model).subscribe(() => {
        this.router.navigate(['/admin/clientes']);
      });
    } else {
      this.svc.create(this.model).subscribe(() => {
        this.router.navigate(['/admin/clientes']);
      });
    }
  }
  
  cancel() { 
    this.router.navigate(['/admin/clientes']); 
  }
}
