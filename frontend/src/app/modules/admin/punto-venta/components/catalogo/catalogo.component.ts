import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { FormControl } from '@angular/forms';
import { PosService, CatalogoItem } from '../../../../../services/pos.service';

@Component({
  selector: 'app-pos-catalogo',
  templateUrl: './catalogo.component.html',
  styleUrls: ['./catalogo.component.scss']
})
export class CatalogoComponent implements OnInit, OnDestroy {

  @Output() agregarItem     = new EventEmitter<CatalogoItem>();
  @Output() agregarItemLibre = new EventEmitter<{ nombre: string; precio: number; cantidad: number }>();

  private destroy$ = new Subject<void>();

  items: CatalogoItem[] = [];
  itemsFiltrados: CatalogoItem[] = [];
  departamentos: { id: number; nombre: string; color: string }[] = [];
  departamentoActivo: number | null = null;

  busqueda = new FormControl('');
  cargando = false;
  error = '';

  // Modal ítem libre
  mostrarModalLibre = false;
  itemLibre = { nombre: '', precio: 0, cantidad: 1 };

  constructor(private posService: PosService) {}

  ngOnInit(): void {
    this.cargarCatalogo();
    this.busqueda.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => this.filtrar());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarCatalogo(): void {
    this.cargando = true;
    this.error = '';
    this.posService.getCatalogo().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.items = r.data || [];
        this.extraerDepartamentos();
        this.filtrar();
        this.cargando = false;
      },
      error: () => {
        this.error = 'Error al cargar el catálogo';
        this.cargando = false;
      }
    });
  }

  extraerDepartamentos(): void {
    const map = new Map<number, any>();
    this.items.forEach(i => {
      if (i.departamento_id && !map.has(i.departamento_id)) {
        map.set(i.departamento_id, {
          id: i.departamento_id,
          nombre: i.departamento_nombre || 'Sin categoría',
          color: i.departamento_color || '#6c757d'
        });
      }
    });
    this.departamentos = Array.from(map.values());
  }

  filtrar(): void {
    const q = (this.busqueda.value || '').toLowerCase().trim();
    this.itemsFiltrados = this.items.filter(i => {
      const matchQ = !q || i.nombre.toLowerCase().includes(q) || (i.sku || '').toLowerCase().includes(q);
      const matchDep = this.departamentoActivo === null || i.departamento_id === this.departamentoActivo;
      return matchQ && matchDep;
    });
  }

  seleccionarDepartamento(id: number | null): void {
    this.departamentoActivo = id;
    this.filtrar();
  }

  agregar(item: CatalogoItem): void {
    if (item.nivel_stock === 'sin_stock' && !item.es_servicio) return;
    this.agregarItem.emit(item);
  }

  abrirModalLibre(): void {
    this.itemLibre = { nombre: '', precio: 0, cantidad: 1 };
    this.mostrarModalLibre = true;
  }

  confirmarItemLibre(): void {
    if (!this.itemLibre.nombre.trim() || this.itemLibre.precio <= 0 || this.itemLibre.cantidad <= 0) return;
    this.agregarItemLibre.emit({ ...this.itemLibre });
    this.mostrarModalLibre = false;
  }

  badgeNivelStock(nivel: string): string {
    const map: Record<string, string> = {
      ok: 'success', bajo: 'warning', critico: 'danger', sin_stock: 'secondary', servicio: 'info'
    };
    return map[nivel] || 'secondary';
  }

  labelNivelStock(nivel: string): string {
    const map: Record<string, string> = {
      ok: 'Stock OK', bajo: 'Stock Bajo', critico: 'Stock Crítico', sin_stock: 'Sin stock', servicio: 'Servicio'
    };
    return map[nivel] || nivel;
  }
}
