import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColaboradoresTableComponent } from '../modules/admin/components/colaboradores-table/colaboradores-table.component';
import { NotificationComponent } from './notification/notification.component';

@NgModule({
  declarations: [ColaboradoresTableComponent, NotificationComponent],
  imports: [CommonModule],
  exports: [ColaboradoresTableComponent, NotificationComponent]
})
export class SharedModule { }
