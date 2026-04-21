import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ReportesComponent } from './reportes.component';

@NgModule({
  declarations: [ReportesComponent],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild([{ path: '', component: ReportesComponent }])
  ]
})
export class ReportesModule { }

