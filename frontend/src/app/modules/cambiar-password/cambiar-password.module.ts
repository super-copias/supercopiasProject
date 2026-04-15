import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { CambiarPasswordComponent } from './cambiar-password.component';

@NgModule({
  declarations: [CambiarPasswordComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild([{ path: '', component: CambiarPasswordComponent }])
  ]
})
export class CambiarPasswordModule {}
