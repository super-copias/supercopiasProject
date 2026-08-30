import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { EquiposService } from '../../../../services/equipos.service';
import { NotificationService } from '../../../../services/notification.service';

type TabCatalogo = 'tipos' | 'marcas';

@Component({
  selector: 'app-equipos-catalogos',
  templateUrl: './equipos-catalogos.component.html',
  styleUrls: ['./equipos-catalogos.component.scss']
})
export class EquiposCatalogosComponent implements OnInit {
  tab: TabCatalogo = 'tipos';
  loading = false;
  mostrarInactivos = false;

  tipos: any[] = [];
  marcas: any[] = [];

  // Formulario compartido (alta / edición)
  showForm = false;
  isEdit = false;
  editingId: number | null = null;
  form: any = { nombre: '', descripcion: '', requiere_contador: false, activo: true };

  constructor(
    private location: Location,
    private equiposService: EquiposService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cambiarTab(tab: TabCatalogo): void {
    if (this.tab === tab) return;
    this.tab = tab;
    this.cancelarForm();
    this.cargar();
  }

  get registros(): any[] {
    return this.tab === 'tipos' ? this.tipos : this.marcas;
  }

  cargar(): void {
    this.loading = true;
    const req = this.tab === 'tipos'
      ? this.equiposService.getTiposEquipo(true)
      : this.equiposService.getMarcasEquipo(true);

    req.subscribe({
      next: (res) => {
        this.loading = false;
        const data = res.success ? (res.data || []) : [];
        if (this.tab === 'tipos') {
          this.tipos = [...data];
        } else {
          this.marcas = [...data];
        }
      },
      error: (err) => {
        this.loading = false;
        this.notificationService.error('Error al cargar el catálogo');
        console.error(err);
      }
    });
  }

  registrosVisibles(): any[] {
    return this.mostrarInactivos ? this.registros : this.registros.filter(r => r.activo);
  }

  // ---------- Formulario ----------
  onNuevo(): void {
    this.showForm = true;
    this.isEdit = false;
    this.editingId = null;
    this.form = { nombre: '', descripcion: '', requiere_contador: false, activo: true };
  }

  onEditar(registro: any): void {
    this.showForm = true;
    this.isEdit = true;
    this.editingId = registro.id;
    this.form = {
      nombre: registro.nombre || '',
      descripcion: registro.descripcion || '',
      requiere_contador: !!registro.requiere_contador,
      activo: registro.activo !== false
    };
  }

  cancelarForm(): void {
    this.showForm = false;
    this.isEdit = false;
    this.editingId = null;
    this.form = { nombre: '', descripcion: '', requiere_contador: false, activo: true };
  }

  guardar(): void {
    const nombre = (this.form.nombre || '').trim();
    if (!nombre) {
      this.notificationService.warning('El nombre es obligatorio');
      return;
    }

    this.loading = true;

    const esTipos = this.tab === 'tipos';
    let req;

    if (this.isEdit && this.editingId) {
      const payload: any = {
        nombre,
        descripcion: (this.form.descripcion || '').trim() || null,
        activo: !!this.form.activo
      };
      if (esTipos) payload.requiere_contador = !!this.form.requiere_contador;
      req = esTipos
        ? this.equiposService.updateTipo(this.editingId, payload)
        : this.equiposService.updateMarca(this.editingId, payload);
    } else {
      const descripcion = (this.form.descripcion || '').trim() || undefined;
      req = esTipos
        ? this.equiposService.createTipo(nombre, descripcion, !!this.form.requiere_contador)
        : this.equiposService.createMarca(nombre, descripcion);
    }

    req.subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success) {
          this.notificationService.success(this.isEdit ? 'Registro actualizado' : 'Registro agregado al catálogo');
          this.cancelarForm();
          this.cargar();
        }
      },
      error: (err) => {
        this.loading = false;
        const msg = err?.error?.error?.message || err?.error?.message || 'No se pudo guardar el registro';
        this.notificationService.error(msg);
      }
    });
  }

  // ---------- Activar / Desactivar ----------
  toggleActivo(registro: any): void {
    const esTipos = this.tab === 'tipos';
    const activar = registro.activo === false;

    if (!activar && !confirm(`¿Ocultar "${registro.nombre}" del catálogo?\n\nEl registro no se elimina: podrá reactivarlo cuando quiera y los equipos que ya lo usan no se ven afectados.`)) {
      return;
    }

    this.loading = true;

    let req;
    if (activar) {
      req = esTipos
        ? this.equiposService.updateTipo(registro.id, { activo: true })
        : this.equiposService.updateMarca(registro.id, { activo: true });
    } else {
      req = esTipos
        ? this.equiposService.deleteTipo(registro.id)
        : this.equiposService.deleteMarca(registro.id);
    }

    req.subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success) {
          this.notificationService.success(activar ? 'Registro reactivado' : 'Registro ocultado del catálogo');
          this.cargar();
        }
      },
      error: (err) => {
        this.loading = false;
        const msg = err?.error?.error?.message || err?.error?.message || 'No se pudo actualizar el registro';
        this.notificationService.error(msg);
      }
    });
  }

  volver(): void {
    this.location.back();
  }
}
