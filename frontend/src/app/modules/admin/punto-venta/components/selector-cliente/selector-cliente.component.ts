import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { FormControl } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { PosService } from '../../../../../services/pos.service';
import { environment } from '../../../../../../environments/environment';

@Component({
  selector: 'app-pos-selector-cliente',
  templateUrl: './selector-cliente.component.html',
  styleUrls: ['./selector-cliente.component.scss']
})
export class SelectorClienteComponent implements OnInit, OnDestroy {

  @Input() clienteActual: any = null;
  @Output() clienteSeleccionado = new EventEmitter<any>();

  private destroy$ = new Subject<void>();

  busqueda = new FormControl('');
  resultados: any[] = [];
  cargando = false;
  mostrarDropdown = false;
  puntosCliente: any = null;

  constructor(private http: HttpClient, private posService: PosService) {}

  ngOnInit(): void {
    this.busqueda.valueChanges.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(q => {
      if (q && q.trim().length >= 2) {
        this.buscarClientes(q.trim());
      } else {
        this.resultados = [];
        this.mostrarDropdown = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  buscarClientes(q: string): void {
    this.cargando = true;
    const params = new HttpParams().set('q', q).set('limit', '8');
    this.http.get<any>(`${environment.apiUrl}/clientes`, { params }).subscribe({
      next: (r) => {
        this.resultados = r.data || [];
        this.mostrarDropdown = true;
        this.cargando = false;
      },
      error: () => { this.cargando = false; }
    });
  }

  seleccionar(cliente: any): void {
    this.clienteActual = cliente;
    this.busqueda.setValue('', { emitEvent: false });
    this.resultados = [];
    this.mostrarDropdown = false;

    // Cargar puntos del cliente
    this.posService.getPuntosByCliente(cliente.id).subscribe({
      next: (r) => {
        this.puntosCliente = r.data;
        this.clienteSeleccionado.emit({
          ...cliente,
          nivel_cliente: r.data?.puntos?.nivel_cliente || 'estandar',
          puntos_disponibles: r.data?.puntos?.puntos_disponibles || 0,
        });
      },
      error: () => {
        this.clienteSeleccionado.emit(cliente);
      }
    });
  }

  quitarCliente(): void {
    this.clienteActual = null;
    this.puntosCliente = null;
    this.clienteSeleccionado.emit(null);
  }

  get nombreCliente(): string {
    if (!this.clienteActual) return '';
    return this.clienteActual.nombreComercial || this.clienteActual.razonSocial
        || this.clienteActual.nombre_comercial || this.clienteActual.razon_social || 'Cliente';
  }

  get badgeNivel(): string {
    const nivel = this.puntosCliente?.puntos?.nivel_cliente || this.clienteActual?.nivel_cliente;
    const map: Record<string, string> = { estandar: 'secondary', frecuente: 'primary', vip: 'warning' };
    return map[nivel] || 'secondary';
  }

  get labelNivel(): string {
    const nivel = this.puntosCliente?.puntos?.nivel_cliente || this.clienteActual?.nivel_cliente;
    const map: Record<string, string> = { estandar: 'Estándar', frecuente: 'Frecuente', vip: 'VIP' };
    return map[nivel] || 'Estándar';
  }
}
