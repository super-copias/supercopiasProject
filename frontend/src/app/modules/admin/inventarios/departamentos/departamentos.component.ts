import { Component, OnInit } from '@angular/core';
import { InventariosService, Departamento } from '../../../../services/inventarios.service';
import { NotificationService } from '../../../../services/notification.service';

@Component({
  selector: 'app-departamentos',
  templateUrl: './departamentos.component.html',
  styleUrls: ['./departamentos.component.scss']
})
export class DepartamentosComponent implements OnInit {

  departamentos: Departamento[] = [];
  loading = false;

  // Formulario inline
  modoForm: 'nuevo' | 'editar' | null = null;
  form: Partial<Departamento> = {};
  editandoId: number | null = null;
  guardando = false;

  coloresPreset = ['#0d6efd','#6610f2','#6f42c1','#d63384','#dc3545','#fd7e14','#ffc107','#198754','#20c997','#0dcaf0','#6c757d'];

  constructor(
    private inventariosService: InventariosService,
    private notif: NotificationService
  ) {}

  ngOnInit() { this.cargar(); }

  cargar() {
    this.loading = true;
    this.inventariosService.getDepartamentos().subscribe({
      next: r => { this.loading = false; if (r.success) this.departamentos = r.data || []; },
      error: () => { this.loading = false; this.notif.error('Error al cargar departamentos'); }
    });
  }

  nuevo() {
    this.form = { nombre: '', descripcion: '', color: '#0d6efd' };
    this.editandoId = null;
    this.modoForm = 'nuevo';
  }

  editar(d: Departamento) {
    this.form = { ...d };
    this.editandoId = d.id!;
    this.modoForm = 'editar';
  }

  cancelar() { this.modoForm = null; this.form = {}; this.editandoId = null; }

  guardar() {
    if (!this.form.nombre?.trim()) { this.notif.warning('El nombre es obligatorio'); return; }
    this.guardando = true;

    const req = this.modoForm === 'editar'
      ? this.inventariosService.updateDepartamento(this.editandoId!, this.form)
      : this.inventariosService.createDepartamento(this.form);

    req.subscribe({
      next: r => {
        this.guardando = false;
        if (r.success) {
          this.notif.success(this.modoForm === 'editar' ? 'Departamento actualizado' : 'Departamento creado');
          this.cancelar();
          this.cargar();
        }
      },
      error: e => { this.guardando = false; this.notif.error(e.error?.message || 'Error al guardar'); }
    });
  }

  eliminar(d: Departamento) {
    const aviso = d.total_articulos
      ? `\n⚠ También se archivarán los ${d.total_articulos} artículo(s) asignados.`
      : '';
    if (!confirm(`¿Archivar el departamento "${d.nombre}"?${aviso}\n\nPodrás restaurarlos desde la vista de archivados.`)) return;
    this.inventariosService.deleteDepartamento(d.id!).subscribe({
      next: r => { this.notif.success(r.message || 'Departamento archivado'); this.cargar(); },
      error: e => this.notif.error(e.error?.message || 'Error al archivar')
    });
  }

  seleccionarColor(c: string) { this.form.color = c; }
}
