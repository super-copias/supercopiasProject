import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-colaboradores-table',
  templateUrl: './colaboradores-table.component.html',
  styleUrls: ['./colaboradores-table.component.scss']
})
export class ColaboradoresTableComponent {
  @Input() colaboradores: any[] = [];
  
  verDetalles(colaborador: any) {
    // TODO: Implementar modal o navegación a detalles
  }
}