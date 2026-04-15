import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  isPasswordVisible = false;
  constructor(
    private auth: AuthService, 
    private router: Router, 
    private fb: FormBuilder,
    private notificationService: NotificationService
  ) { }
  ngOnInit() {
    // Cargar credenciales guardadas si existen
    const savedIdentifier = localStorage.getItem('rememberedIdentifier');
    const savedPassword = localStorage.getItem('rememberedPassword');
    const rememberMe = localStorage.getItem('rememberMe') === 'true';

    this.loginForm = this.fb.group({
      identifier: [savedIdentifier || '', [Validators.required]],
      password: [savedPassword || '', [Validators.required, Validators.minLength(8)]],
      checkbox: [rememberMe]
    });
  }
  get identifierControl() { return this.loginForm.get('identifier')!; }
  get passwordControl() { return this.loginForm.get('password')!; }
  get identifierControlValid() { return this.identifierControl.touched && this.identifierControl.valid; }
  get identifierControlInvalid() { return this.identifierControl.touched && this.identifierControl.invalid; }
  get passwordControlValid() { return this.passwordControl.touched && this.passwordControl.valid; }
  get passwordControlInvalid() { return this.passwordControl.touched && this.passwordControl.invalid; }

  onSubmit() {
    if (this.loginForm.invalid) return;
    const v = this.loginForm.value;
    
    // Guardar o limpiar credenciales según el checkbox
    if (v.checkbox) {
      localStorage.setItem('rememberedIdentifier', v.identifier);
      localStorage.setItem('rememberedPassword', v.password);
      localStorage.setItem('rememberMe', 'true');
    } else {
      localStorage.removeItem('rememberedIdentifier');
      localStorage.removeItem('rememberedPassword');
      localStorage.removeItem('rememberMe');
    }

    this.auth.login(v.identifier, v.password).subscribe({
      next: (res: any) => {
        if (res && res.success && res.data && res.data.token) {
          localStorage.setItem('token', res.data.token);
          localStorage.setItem('user', JSON.stringify(res.data.usuario || {}));
          if (res.data.usuario?.mustResetPassword) {
            this.router.navigate(['/cambiar-password'], { replaceUrl: true });
          } else {
            this.router.navigate(['/admin/dashboard'], { replaceUrl: true });
          }
        } else {
          this.notificationService.error(
            'No se recibió un token válido del servidor',
            'Error de autenticación'
          );
        }
      }, error: err => {
        // Detectar cuenta desactivada (403 + código específico)
        const errorCode = err?.error?.error?.code || err?.error?.code;
        const errorMsg  = err?.error?.error?.message || err?.error?.message || err?.message;

        if (err.status === 403 && errorCode === 'CUENTA_DESACTIVADA') {
          this.notificationService.error(
            errorMsg || 'Tu cuenta está desactivada. Contacta al administrador.',
            'Acceso denegado'
          );
        } else {
          const msg = errorMsg || err.statusText || 'Error desconocido';
          this.notificationService.error(msg, 'Error al iniciar sesión');
        }
      }
    });
  }

  showPassword() { this.isPasswordVisible = true; }
  hidePassword() { this.isPasswordVisible = false; }
}
