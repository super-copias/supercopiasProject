import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { TicketComponent } from './ticket.component';

@NgModule({
  declarations: [TicketComponent],
  imports: [CommonModule, FormsModule, HttpClientModule],
  exports: [TicketComponent],
})
export class TicketModule {}
