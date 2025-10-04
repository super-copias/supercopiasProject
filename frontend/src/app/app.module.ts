import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { RouterModule, Routes } from '@angular/router';

import { AppComponent } from './app.component';
import { LoginModule } from './modules/login/login.module';
import { AdminModule } from './modules/admin/admin.module';
import { ClientesModule } from './modules/clientes/clientes.module';
import { EmpleadosModule } from './modules/empleados/empleados.module';

const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, HttpClientModule, RouterModule.forRoot(routes), LoginModule, AdminModule, ClientesModule, EmpleadosModule],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
