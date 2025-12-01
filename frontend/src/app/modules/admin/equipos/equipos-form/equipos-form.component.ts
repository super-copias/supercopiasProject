import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { EquiposService } from '../../../../services/equipos.service';
import { NotificationService } from '../../../../services/notification.service';

@Component({
  selector: 'app-equipos-form',
  templateUrl: './equipos-form.component.html',
  styleUrls: ['./equipos-form.component.scss']
})
export class EquiposFormComponent implements OnInit {
  form!: FormGroup;
  isEdit = false;
  equipoId: number | null = null;
  loading = false;
  
  // Catálogos desde BD
  tiposEquipo: any[] = [];
  estatusEquipo: any[] = [];
  marcasEquipo: any[] = [];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private equiposService: EquiposService,
    private notificationService: NotificationService
  ) {
    this.buildForm();
  }

  ngOnInit() {
    // Cargar catálogos
    this.loadCatalogos();
    
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.equipoId = parseInt(id);
      this.loadEquipo();
    }
    
    // Escuchar cambios en tipo de equipo para mostrar campos específicos
    this.form.get('tipo_equipo')?.valueChanges.subscribe(tipo => {
      this.onTipoChange(tipo);
    });
  }
  
  loadCatalogos() {
    this.equiposService.getCatalogosCompletos().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.tiposEquipo = response.data.tipos || [];
          this.estatusEquipo = response.data.estatus || [];
          this.marcasEquipo = response.data.marcas || [];
        }
      },
      error: (err) => {
        console.error('Error al cargar catálogos:', err);
      }
    });
  }

  buildForm() {
    this.form = this.fb.group({
      tipo_equipo: ['', Validators.required],
      marca: [''],
      modelo: [''],
      numero_serie: [''],
      nombre_equipo: [''],
      area_ubicacion: [''],
      cliente_nombre: [''],
      estatus: ['activo'],
      responsable_nombre: [''],
      observaciones: [''],
      foto_url: [''],
      // Características específicas
      caracteristicas: this.fb.group({
        // Fotocopiadoras/Impresoras
        contador_actual: [null],
        capacidad_bandejas: [''],
        tipo_consumible: [''],
        rendimiento_toner: [null],
        // PC/Laptop
        procesador: [''],
        ram: [''],
        almacenamiento: [''],
        sistema_operativo: [''],
        direccion_ip: [''],
        // Monitor
        tamano_pulgadas: [null],
        tipo_panel: [''],
        resolucion: ['']
      })
    });
  }

  loadEquipo() {
    if (!this.equipoId) return;
    
    this.loading = true;
    this.equiposService.getEquipoById(this.equipoId).subscribe({
      next: (response) => {
        if (response.success) {
          const equipo = response.data;
          this.form.patchValue({
            tipo_equipo: equipo.tipo_equipo,
            marca: equipo.marca,
            modelo: equipo.modelo,
            numero_serie: equipo.numero_serie,
            nombre_equipo: equipo.nombre_equipo,
            area_ubicacion: equipo.area_ubicacion,
            cliente_nombre: equipo.cliente_nombre,
            estatus: equipo.estatus,
            responsable_nombre: equipo.responsable_nombre,
            observaciones: equipo.observaciones,
            foto_url: equipo.foto_url,
            caracteristicas: equipo.caracteristicas || {}
          });
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar equipo:', err);
        this.notificationService.error('Error al cargar equipo');
        this.loading = false;
      }
    });
  }

  onTipoChange(tipo: string) {
    // Lógica para mostrar/ocultar campos según el tipo
    // Se manejará en el template
  }

  onSubmit() {
    if (this.form.invalid) {
      this.notificationService.warning('Por favor complete los campos requeridos');
      return;
    }

    this.loading = true;
    const formData = this.form.value;

    const request = this.isEdit && this.equipoId
      ? this.equiposService.updateEquipo(this.equipoId, formData)
      : this.equiposService.createEquipo(formData);

    request.subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success(
            this.isEdit ? 'Equipo actualizado exitosamente' : 'Equipo creado exitosamente'
          );
          this.router.navigate(['/admin/equipos']);
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al guardar equipo:', err);
        this.notificationService.error('Error al guardar equipo');
        this.loading = false;
      }
    });
  }

  onCancel() {
    this.router.navigate(['/admin/equipos']);
  }

  get tipoSeleccionado(): string {
    return this.form.get('tipo_equipo')?.value || '';
  }

  get esImpresora(): boolean {
    const tipo = this.tipoSeleccionado;
    return tipo === 'fotocopiadora' || tipo === 'impresora';
  }

  get esComputadora(): boolean {
    const tipo = this.tipoSeleccionado;
    return tipo === 'pc' || tipo === 'laptop';
  }

  get esMonitor(): boolean {
    return this.tipoSeleccionado === 'monitor';
  }
}
