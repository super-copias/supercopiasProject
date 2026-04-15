import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const nueva = group.get('nuevaPassword')?.value;
  const confirmar = group.get('confirmarPassword')?.value;
  return nueva && confirmar && nueva !== confirmar ? { noCoinciden: true } : null;
}

@Component({
  selector: 'app-cambiar-password',
  template: `
    <div class="d-flex justify-content-center align-items-center min-vh-100 bg-light">
      <div class="card shadow-sm" style="width: 100%; max-width: 440px;">
        <div class="card-header bg-warning bg-opacity-10 text-center py-4">
          <i class="fas fa-key fa-2x text-warning mb-2 d-block"></i>
          <h5 class="mb-0 fw-bold">Cambio de contraseña requerido</h5>
          <small class="text-muted">
            Un administrador asignó una contraseña temporal a tu cuenta.<br>
            Debes establecer una nueva contraseña para continuar.
          </small>
        </div>
        <div class="card-body p-4">
          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <div class="mb-3">
              <label class="form-label">Nueva contraseña *</label>
              <input
                type="password"
                class="form-control"
                formControlName="nuevaPassword"
                [class.is-invalid]="isInvalid('nuevaPassword')"
                placeholder="Mínimo 8 caracteres"
                autocomplete="new-password">
              <div class="invalid-feedback" *ngIf="isInvalid('nuevaPassword')">
                <span *ngIf="form.get('nuevaPassword')?.errors?.['required']">La contraseña es requerida</span>
                <span *ngIf="form.get('nuevaPassword')?.errors?.['minlength']">Debe tener al menos 8 caracteres</span>
              </div>
            </div>

            <div class="mb-4">
              <label class="form-label">Confirmar contraseña *</label>
              <input
                type="password"
                class="form-control"
                formControlName="confirmarPassword"
                [class.is-invalid]="isInvalid('confirmarPassword') || (form.errors?.['noCoinciden'] && form.get('confirmarPassword')?.touched)"
                placeholder="Repite la contraseña"
                autocomplete="new-password">
              <div class="invalid-feedback" *ngIf="form.errors?.['noCoinciden'] && form.get('confirmarPassword')?.touched">
                Las contraseñas no coinciden
              </div>
            </div>

            <button
              type="submit"
              class="btn btn-warning w-100 fw-bold"
              [disabled]="form.invalid || loading">
              <span *ngIf="loading">
                <i class="fas fa-spinner fa-spin me-1"></i>Guardando...
              </span>
              <span *ngIf="!loading">
                <i class="fas fa-check me-1"></i>Establecer nueva contraseña
              </span>
            </button>
          </form>
        </div>
      </div>
    </div>
  `
})
export class CambiarPasswordComponent {
  form: FormGroup;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private notificationService: NotificationService
  ) {
    this.form = this.fb.group(
      {
        nuevaPassword:    ['', [Validators.required, Validators.minLength(8)]],
        confirmarPassword: ['', Validators.required]
      },
      { validators: passwordsMatch }
    );
  }

  isInvalid(field: string): boolean {
    const c = this.form.get(field);
    return !!(c && c.invalid && (c.dirty || c.touched));
  }

  onSubmit() {
    if (this.form.invalid) return;

    this.loading = true;
    const nuevaPassword = this.form.get('nuevaPassword')!.value;

    this.auth.changePassword(nuevaPassword).subscribe({
      next: () => {
        this.loading = false;

        // Actualizar mustResetPassword en localStorage
        try {
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          user.mustResetPassword = false;
          localStorage.setItem('user', JSON.stringify(user));
        } catch (_) {}

        this.notificationService.success(
          'Tu contraseña ha sido actualizada correctamente.',
          'Contraseña cambiada'
        );
        this.router.navigate(['/admin/dashboard'], { replaceUrl: true });
      },
      error: (err: any) => {
        this.loading = false;
        this.notificationService.error(
          err?.error?.message || 'Error al cambiar la contraseña',
          'Error'
        );
      }
    });
  }
}
