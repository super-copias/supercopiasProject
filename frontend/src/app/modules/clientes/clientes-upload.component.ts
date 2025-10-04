import { Component } from '@angular/core';
import { ClientesService } from '../../services/clientes.service';

@Component({
  selector: 'app-clientes-upload',
  template: `
    <div class="p-4">
      <h3>Alta masiva clientes</h3>
      <p>Sube un archivo Excel (.xlsx) con los clientes. (Funcionalidad esqueleto - requiere backend)</p>
      <input type="file" (change)="onFile($event)" accept=".xlsx,.xls" />
      <div *ngIf="uploaded" class="mt-3 alert alert-success">Archivo procesado (mock)</div>
    </div>
  `
})
export class ClientesUploadComponent {
  uploaded = false;
  constructor(private svc: ClientesService) {}
  onFile(e: any) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    // Mock processing: in development we just mark uploaded; real parsing + API later
    setTimeout(() => this.uploaded = true, 600);
  }
}
