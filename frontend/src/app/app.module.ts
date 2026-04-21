import { NgModule, ErrorHandler } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { RouterModule, Routes } from '@angular/router';

import { AppComponent, ChunkErrorHandler } from './app.component';
import { LoginModule } from './modules/login/login.module';
import { AdminModule } from './modules/admin/admin.module';
import { ClientesModule } from './modules/clientes/clientes.module';
import { EmpleadosModule } from './modules/empleados/empleados.module';
import { AuthInterceptor } from './services/auth-interceptor';
import { AuthGuard } from './services/auth.guard';
import { SharedModule } from './shared/shared.module';

const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', loadChildren: () => import('./modules/login/login.module').then(m => m.LoginModule) },
  { path: 'cambiar-password', loadChildren: () => import('./modules/cambiar-password/cambiar-password.module').then(m => m.CambiarPasswordModule), canActivate: [AuthGuard] },
  { path: 'admin', loadChildren: () => import('./modules/admin/admin.module').then(m => m.AdminModule), canLoad: [AuthGuard] }
];

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, HttpClientModule, RouterModule.forRoot(routes), SharedModule],
  providers: [
    { provide: ErrorHandler, useClass: ChunkErrorHandler },
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
