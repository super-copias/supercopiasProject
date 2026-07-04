import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { EquiposService } from '../../../../services/equipos.service';
import { NotificationService } from '../../../../services/notification.service';
import { SocketService } from '../../../../services/socket.service';

@Component({
  selector: 'app-equipo-detalle',
  templateUrl: './equipo-detalle.component.html',
  styleUrls: ['./equipo-detalle.component.scss']
})
export class EquipoDetalleComponent implements OnInit, OnDestroy {
  equipo: any = null;
  loading = false;
  equipoId!: number;
  
  // Tabs
  activeTab = 'info';
  
  // Historiales
  historialContador: any[] = [];
  historialMantenimiento: any[] = [];
  consumibles: any[] = [];
  
  // Formularios
  showFormContador = false;
  showFormMantenimiento = false;
  showFormConsumible = false;

  private destroy$ = new Subject<void>();

  formContador = { contador_actual: null, tecnico_nombre: '', observaciones: '' };
  formMantenimiento = { descripcion: '', contador_servicio: null, costo: null, tecnico_nombre: '', proveedor_nombre: '', observaciones: '' };
  formConsumible = { tipo_consumible: '', rendimiento_estimado: null, contador_instalacion: null, contador_proximo_cambio: null, observaciones: '' };

  // Edición de registros
  editingContadorId: number | null = null;
  editingMantenimientoId: number | null = null;
  editingConsumibleId: number | null = null;

  formEditContador: any = {};
  formEditMantenimiento: any = {};
  formEditConsumible: any = {};
  
  // Configuración de mantenimiento preventivo
  configMantenimiento = {
    intervalo_dias: null,
    fecha_inicio: null,
    dias_alerta: 7
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private equiposService: EquiposService,
    private notificationService: NotificationService,
    private socketService: SocketService,
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.equipoId = parseInt(id);
      this.loadEquipo();
      this.loadHistoriales();

      // Escuchar actualizaciones de contador en tiempo real vía Socket.io.
      // Reemplaza el polling HTTP frecuente para este equipo específico.
      this.socketService.onContadorUpdated(this.equipoId)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.loadHistoriales();
          this.loadEquipo(); // refresca el último contador del header
        });
    }
  }

  loadEquipo() {
    this.loading = true;
    this.equiposService.getEquipoById(this.equipoId).subscribe({
      next: (response) => {
        if (response.success) {
          this.equipo = response.data;
          // Cargar configuración de mantenimiento preventivo si existe
          this.configMantenimiento = {
            intervalo_dias: this.equipo.mantenimiento_intervalo_dias,
            fecha_inicio: this.equipo.mantenimiento_fecha_inicio,
            dias_alerta: this.equipo.mantenimiento_dias_alerta || 7
          };
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

  loadHistoriales() {
    // Cargar historial de contadores
    this.equiposService.getHistorialContador(this.equipoId).subscribe({
      next: (response) => {
        if (response.success) {
          this.historialContador = response.data || [];
        }
      },
      error: (err) => console.error('Error al cargar historial contador:', err)
    });

    // Cargar historial de mantenimientos
    this.equiposService.getHistorialMantenimiento(this.equipoId).subscribe({
      next: (response) => {
        if (response.success) {
          this.historialMantenimiento = response.data || [];
        }
      },
      error: (err) => console.error('Error al cargar historial mantenimiento:', err)
    });

    // Cargar consumibles
    this.equiposService.getConsumibles(this.equipoId).subscribe({
      next: (response) => {
        if (response.success) {
          this.consumibles = response.data || [];
        }
      },
      error: (err) => console.error('Error al cargar consumibles:', err)
    });
  }

  setTab(tab: string) {
    this.activeTab = tab;
  }

  onEditar() {
    this.router.navigate(['/admin/equipos/editar', this.equipoId]);
  }

  onVolver() {
    this.router.navigate(['/admin/equipos']);
  }

  // Contador
  onAgregarContador() {
    this.showFormContador = true;
  }

  onGuardarContador() {
    if (!this.formContador.contador_actual) {
      this.notificationService.warning('El contador es obligatorio');
      return;
    }

    this.equiposService.addContador(this.equipoId, this.formContador).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Contador registrado exitosamente');
          this.showFormContador = false;
          this.formContador = { contador_actual: null, tecnico_nombre: '', observaciones: '' };
          this.loadEquipo();
          this.loadHistoriales();
        }
      },
      error: (err) => {
        console.error('Error al guardar contador:', err);
        this.notificationService.error('Error al guardar contador');
      }
    });
  }

  onCancelarContador() {
    this.showFormContador = false;
    this.formContador = { contador_actual: null, tecnico_nombre: '', observaciones: '' };
  }

  // Mantenimiento
  onAgregarMantenimiento() {
    this.showFormMantenimiento = true;
  }

  onGuardarMantenimiento() {
    if (!this.formMantenimiento.descripcion) {
      this.notificationService.warning('La descripción es obligatoria');
      return;
    }

    this.equiposService.addMantenimiento(this.equipoId, this.formMantenimiento).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Mantenimiento registrado exitosamente');
          this.showFormMantenimiento = false;
          this.formMantenimiento = { descripcion: '', contador_servicio: null, costo: null, tecnico_nombre: '', proveedor_nombre: '', observaciones: '' };
          this.loadEquipo();
          this.loadHistoriales();
        }
      },
      error: (err) => {
        console.error('Error al guardar mantenimiento:', err);
        this.notificationService.error('Error al guardar mantenimiento');
      }
    });
  }

  onCancelarMantenimiento() {
    this.showFormMantenimiento = false;
    this.formMantenimiento = { descripcion: '', contador_servicio: null, costo: null, tecnico_nombre: '', proveedor_nombre: '', observaciones: '' };
  }

  // Consumible
  onAgregarConsumible() {
    this.showFormConsumible = true;
  }

  onGuardarConsumible() {
    if (!this.formConsumible.tipo_consumible) {
      this.notificationService.warning('El tipo de consumible es obligatorio');
      return;
    }

    this.equiposService.addConsumible(this.equipoId, this.formConsumible).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Consumible registrado exitosamente');
          this.showFormConsumible = false;
          this.formConsumible = { tipo_consumible: '', rendimiento_estimado: null, contador_instalacion: null, contador_proximo_cambio: null, observaciones: '' };
          this.loadHistoriales();
        }
      },
      error: (err) => {
        console.error('Error al guardar consumible:', err);
        this.notificationService.error('Error al guardar consumible');
      }
    });
  }

  onCancelarConsumible() {
    this.showFormConsumible = false;
    this.formConsumible = { tipo_consumible: '', rendimiento_estimado: null, contador_instalacion: null, contador_proximo_cambio: null, observaciones: '' };
  }

  // ---- Edición / Eliminación: Contador ----
  onEditarContador(item: any) {
    this.editingContadorId = item.id;
    this.editingMantenimientoId = null;
    this.editingConsumibleId = null;
    this.showFormContador = false;
    this.formEditContador = {
      contador_actual: item.contador_actual,
      tecnico_nombre: item.tecnico_nombre || '',
      observaciones: item.observaciones || ''
    };
  }

  onGuardarEditContador() {
    if (!this.formEditContador.contador_actual) {
      this.notificationService.warning('El contador es obligatorio');
      return;
    }
    this.equiposService.updateContador(this.equipoId, this.editingContadorId!, this.formEditContador).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Contador actualizado exitosamente');
          this.editingContadorId = null;
          this.loadEquipo();
          this.loadHistoriales();
        }
      },
      error: (err) => {
        console.error('Error al actualizar contador:', err);
        this.notificationService.error('Error al actualizar contador');
      }
    });
  }

  onCancelarEditContador() {
    this.editingContadorId = null;
  }

  onEliminarContador(item: any) {
    if (!confirm(`¿Eliminar la lectura de contador ${item.contador_actual}? Esta acción no se puede deshacer.`)) return;
    this.equiposService.deleteContador(this.equipoId, item.id).subscribe({
      next: () => {
        this.notificationService.success('Registro eliminado exitosamente');
        this.loadEquipo();
        this.loadHistoriales();
      },
      error: (err) => {
        console.error('Error al eliminar contador:', err);
        this.notificationService.error('Error al eliminar registro');
      }
    });
  }

  // ---- Edición / Eliminación: Mantenimiento ----
  onEditarMantenimiento(item: any) {
    this.editingMantenimientoId = item.id;
    this.editingContadorId = null;
    this.editingConsumibleId = null;
    this.showFormMantenimiento = false;
    this.formEditMantenimiento = {
      descripcion: item.descripcion || '',
      contador_servicio: item.contador_servicio,
      costo: item.costo,
      tecnico_nombre: item.tecnico_nombre || '',
      proveedor_nombre: item.proveedor_nombre || '',
      observaciones: item.observaciones || ''
    };
  }

  onGuardarEditMantenimiento() {
    if (!this.formEditMantenimiento.descripcion) {
      this.notificationService.warning('La descripción es obligatoria');
      return;
    }
    this.equiposService.updateMantenimiento(this.equipoId, this.editingMantenimientoId!, this.formEditMantenimiento).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Mantenimiento actualizado exitosamente');
          this.editingMantenimientoId = null;
          this.loadEquipo();
          this.loadHistoriales();
        }
      },
      error: (err) => {
        console.error('Error al actualizar mantenimiento:', err);
        this.notificationService.error('Error al actualizar mantenimiento');
      }
    });
  }

  onCancelarEditMantenimiento() {
    this.editingMantenimientoId = null;
  }

  onEliminarMantenimiento(item: any) {
    if (!confirm(`¿Eliminar el registro de mantenimiento "${item.descripcion}"? Esta acción no se puede deshacer.`)) return;
    this.equiposService.deleteMantenimiento(this.equipoId, item.id).subscribe({
      next: () => {
        this.notificationService.success('Registro eliminado exitosamente');
        this.loadEquipo();
        this.loadHistoriales();
      },
      error: (err) => {
        console.error('Error al eliminar mantenimiento:', err);
        this.notificationService.error('Error al eliminar registro');
      }
    });
  }

  // ---- Edición / Eliminación: Consumible ----
  onEditarConsumible(item: any) {
    this.editingConsumibleId = item.id;
    this.editingContadorId = null;
    this.editingMantenimientoId = null;
    this.showFormConsumible = false;
    this.formEditConsumible = {
      tipo_consumible: item.tipo_consumible || '',
      rendimiento_estimado: item.rendimiento_estimado,
      contador_instalacion: item.contador_instalacion,
      contador_proximo_cambio: item.contador_proximo_cambio,
      observaciones: item.observaciones || ''
    };
  }

  onGuardarEditConsumible() {
    if (!this.formEditConsumible.tipo_consumible) {
      this.notificationService.warning('El tipo de consumible es obligatorio');
      return;
    }
    this.equiposService.updateConsumible(this.equipoId, this.editingConsumibleId!, this.formEditConsumible).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Consumible actualizado exitosamente');
          this.editingConsumibleId = null;
          this.loadHistoriales();
        }
      },
      error: (err) => {
        console.error('Error al actualizar consumible:', err);
        this.notificationService.error('Error al actualizar consumible');
      }
    });
  }

  onCancelarEditConsumible() {
    this.editingConsumibleId = null;
  }

  onEliminarConsumible(item: any) {
    if (!confirm(`¿Eliminar el consumible "${item.tipo_consumible}"? Esta acción no se puede deshacer.`)) return;
    this.equiposService.deleteConsumible(this.equipoId, item.id).subscribe({
      next: () => {
        this.notificationService.success('Consumible eliminado exitosamente');
        this.loadHistoriales();
      },
      error: (err) => {
        console.error('Error al eliminar consumible:', err);
        this.notificationService.error('Error al eliminar consumible');
      }
    });
  }

  get esImpresora(): boolean {
    if (!this.equipo) return false;
    return this.equipo.tipo_equipo === 'fotocopiadora' || this.equipo.tipo_equipo === 'impresora';
  }

  // Características
  hasCaracteristicas(): boolean {
    if (!this.equipo || !this.equipo.caracteristicas) return false;
    return Object.keys(this.equipo.caracteristicas).length > 0;
  }

  getCaracteristicasArray(): Array<{key: string, value: any}> {
    if (!this.equipo || !this.equipo.caracteristicas) return [];
    return Object.keys(this.equipo.caracteristicas)
      .filter(key => {
        const value = this.equipo.caracteristicas[key];
        // Excluir contador_actual (se muestra dinámicamente desde el historial)
        if (key === 'contador_actual') return false;
        // Filtrar solo valores que no sean null, undefined, vacíos o strings vacíos
        return value !== null && value !== undefined && value !== '' && value !== 0 && !(Array.isArray(value) && value.length === 0);
      })
      .map(key => ({
        key: this.formatearNombreCampo(key),
        value: this.equipo.caracteristicas[key]
      }));
  }

  private formatearNombreCampo(key: string): string {
    // Convertir de snake_case o camelCase a formato legible
    return key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .trim();
  }

  // Mantenimiento Preventivo
  onGuardarConfigMantenimiento() {
    if (!this.configMantenimiento.intervalo_dias) {
      this.notificationService.warning('El intervalo de días es obligatorio');
      return;
    }

    if (!this.configMantenimiento.fecha_inicio) {
      this.notificationService.warning('La fecha de inicio es obligatoria');
      return;
    }

    const config = {
      mantenimiento_intervalo_dias: this.configMantenimiento.intervalo_dias,
      mantenimiento_fecha_inicio: this.configMantenimiento.fecha_inicio,
      mantenimiento_dias_alerta: this.configMantenimiento.dias_alerta || 7
    };

    this.equiposService.configurarMantenimientoPreventivo(this.equipoId, config).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Mantenimiento preventivo configurado exitosamente');
          this.loadEquipo(); // Recargar para obtener los nuevos valores
        }
      },
      error: (err) => {
        console.error('Error al configurar mantenimiento:', err);
        this.notificationService.error('Error al guardar configuración');
      }
    });
  }

  onDeshabilitarMantenimientoPreventivo() {
    if (confirm('¿Está seguro de deshabilitar el mantenimiento preventivo?')) {
      const config = {
        mantenimiento_intervalo_dias: null,
        mantenimiento_fecha_inicio: null,
        mantenimiento_dias_alerta: 7
      };

      this.equiposService.configurarMantenimientoPreventivo(this.equipoId, config).subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.success('Mantenimiento preventivo deshabilitado');
            this.configMantenimiento = { intervalo_dias: null, fecha_inicio: null, dias_alerta: 7 };
            this.loadEquipo();
          }
        },
        error: (err) => {
          console.error('Error:', err);
          this.notificationService.error('Error al deshabilitar');
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
