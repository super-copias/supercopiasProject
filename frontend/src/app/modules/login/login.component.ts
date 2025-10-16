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
    this.loginForm = this.fb.group({
      identifier: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      checkbox: [false]
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
    this.auth.login(v.identifier, v.password).subscribe({
      next: (res: any) => {
        if (res && res.success && res.data && res.data.token) {
          localStorage.setItem('token', res.data.token);
          localStorage.setItem('user', JSON.stringify(res.data.user || {}));
          this.router.navigate(['/admin/dashboard'], { replaceUrl: true });
        } else {
          this.notificationService.error(
            'No se recibió un token válido del servidor',
            'Error de autenticación'
          );
        }
      }, error: err => {
        const msg = (err && err.error && err.error.message) ? err.error.message : (err.statusText || err.message || 'Error desconocido');
        this.notificationService.error(
          msg,
          'Error al iniciar sesión'
        );
      }
    });
  }

  showPassword() { this.isPasswordVisible = true; }
  hidePassword() { this.isPasswordVisible = false; }
}
