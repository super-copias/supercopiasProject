import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColaboradoresTableComponent } from '../modules/admin/components/colaboradores-table/colaboradores-table.component';

@NgModule({
  declarations: [ColaboradoresTableComponent],
  imports: [CommonModule],
  exports: [ColaboradoresTableComponent]
})
export class SharedModule { }
