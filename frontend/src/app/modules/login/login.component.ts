import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  template: `
  <div class="login-container">
    <h2>Iniciar sesión</h2>
    <form (ngSubmit)="login()">
      <label>Usuario</label>
      <input [(ngModel)]="username" name="username" required />
      <label>Contraseña</label>
      <input type="password" [(ngModel)]="password" name="password" required />
      <button type="submit">Entrar</button>
    </form>
  </div>
  `
})
export class LoginComponent {
  username = '';
  password = '';
  constructor(private auth: AuthService, private router: Router) { }
  login() {
    console.log('intentando login', this.username);
    this.auth.login(this.username, this.password).subscribe({
      next: (res: any) => {
        console.log('login ok', res);
        if (res && res.token) {
          // guardar token y usuario
          localStorage.setItem('token', res.token);
          localStorage.setItem('user', JSON.stringify(res.user || {}));
          // navegar al panel admin
          this.router.navigate(['/admin']);
        } else {
          alert('Login correcto pero no se recibió token');
        }
      },
      error: err => {
        console.error('error login', err);
        const msg = (err && err.error && err.error.message) ? err.error.message : (err.statusText || err.message || JSON.stringify(err));
        alert('Error en login: ' + msg);
      }
    });
  }
}
