import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ClientesListComponent } from './clientes-list.component';
import { ClientesFormComponent } from './clientes-form.component';
import { ClientesUploadComponent } from './clientes-upload.component';
import { ClientesTableComponent } from './clientes-table/clientes-table.component';

@NgModule({
  declarations: [ClientesListComponent, ClientesFormComponent, ClientesUploadComponent, ClientesTableComponent],
  imports: [CommonModule, FormsModule, RouterModule.forChild([
    { path: '', component: ClientesListComponent },
    { path: 'nuevo', component: ClientesFormComponent },
    { path: 'upload', component: ClientesUploadComponent }
  ])]
})
export class ClientesModule { }
// touched to refresh TS server
