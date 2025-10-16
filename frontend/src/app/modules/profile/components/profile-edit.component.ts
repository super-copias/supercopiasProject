import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { ProfileService } from '../services/profile.service';
import { NotificationService } from '../../../services/notification.service';
import { Usuario, PerfilUsuario, ActualizarPerfil } from '../../../shared/interfaces';

/**
 * Componente para editar el perfil del usuario
 * Permite modificar datos personales y foto de perfil
 */
@Component({
  selector: 'app-profile-edit',
  template: `
    <div class="container-fluid p-4">
      <div class="row justify-content-center">
        <div class="col-xl-8">
          <!-- Header -->
          <div class="mb-4">
            <h2 class="mb-0">
              <i class="fas fa-user-edit me-2 text-primary"></i>
              Editar Perfil
            </h2>
          </div>

          <div class="row">
            <!-- Foto de Perfil -->
            <div class="col-md-4">
              <div class="card shadow-sm">
                <div class="card-header bg-primary text-white">
                  <h6 class="mb-0">
                    <i class="fas fa-camera me-2"></i>
                    Foto de Perfil
                  </h6>
                </div>
                <div class="card-body text-center">
                  <div class="profile-image-container mb-3">
                    <div class="profile-image-wrapper">
                      <img 
                        [src]="profileImageUrl || '/assets/img/default-avatar.svg'" 
                        alt="Foto de perfil"
                        class="profile-image"
                        [class.loading]="imageUploading"
                        (error)="onImageError($event)">
                      <div *ngIf="imageUploading" class="image-loading-overlay">
                        <i class="fas fa-spinner fa-spin"></i>
                      </div>
                    </div>
                  </div>
                  
                  <div class="btn-group-vertical w-100">
                    <input type="file" #fileInput accept="image/*" (change)="onImageSelected($event)" style="display: none;">
                    <button type="button" class="btn btn-outline-primary btn-sm mb-2" (click)="fileInput.click()" [disabled]="imageUploading">
                      <i class="fas fa-upload me-1"></i>
                      Cambiar Foto
                    </button>
                    <button type="button" class="btn btn-outline-danger btn-sm" (click)="removeImage()" 
                            [disabled]="!profileImageUrl || imageUploading">
                      <i class="fas fa-trash me-1"></i>
                      Eliminar
                    </button>
                  </div>
                  
                  <small class="text-muted d-block mt-2">
                    Formatos: JPG, PNG, GIF<br>
                    Tamaño máximo: 2MB
                  </small>
                </div>
              </div>
            </div>

            <!-- Formulario de Datos -->
            <div class="col-md-8">
              <div class="card shadow-sm">
                <div class="card-header bg-primary text-white">
                  <h6 class="mb-0">
                    <i class="fas fa-user me-2"></i>
                    Información Personal
                  </h6>
                </div>
                <div class="card-body">
                  <form [formGroup]="profileForm" (ngSubmit)="onSubmit()">
                    <div class="row">
                      <div class="col-md-6">
                        <div class="mb-3">
                          <label class="form-label">Nombre de Usuario *</label>
                          <input type="text" class="form-control" formControlName="username" 
                                 [class.is-invalid]="profileForm.get('username')?.invalid && profileForm.get('username')?.touched">
                          <div *ngIf="profileForm.get('username')?.invalid && profileForm.get('username')?.touched" class="invalid-feedback">
                            El nombre de usuario es requerido
                          </div>
                        </div>
                      </div>
                      
                      <div class="col-md-6">
                        <div class="mb-3">
                          <label class="form-label">Nombre Completo</label>
                          <input type="text" class="form-control" formControlName="fullName" 
                                 placeholder="Tu nombre completo">
                        </div>
                      </div>
                    </div>

                    <div class="row">
                      <div class="col-md-6">
                        <div class="mb-3">
                          <label class="form-label">Correo Electrónico</label>
                          <input type="email" class="form-control" formControlName="email" 
                                 placeholder="tu@email.com"
                                 [class.is-invalid]="profileForm.get('email')?.invalid && profileForm.get('email')?.touched">
                          <div *ngIf="profileForm.get('email')?.invalid && profileForm.get('email')?.touched" class="invalid-feedback">
                            Ingresa un correo válido
                          </div>
                        </div>
                      </div>
                      
                      <div class="col-md-6">
                        <div class="mb-3">
                          <label class="form-label">Teléfono</label>
                          <input type="tel" class="form-control" formControlName="phone" 
                                 placeholder="Tu número de teléfono">
                        </div>
                      </div>
                    </div>

                    <div class="mb-3">
                      <label class="form-label">Información Adicional</label>
                      <textarea class="form-control" formControlName="bio" rows="3" 
                                placeholder="Información adicional sobre ti..."></textarea>
                    </div>

                    <div class="d-flex justify-content-between">
                      <button type="button" class="btn btn-outline-secondary" (click)="goBack()">
                        <i class="fas fa-arrow-left me-1"></i>
                        Regresar al Dashboard
                      </button>
                      <button type="submit" class="btn btn-primary" [disabled]="!profileForm.valid || saving">
                        <span *ngIf="saving">
                          <i class="fas fa-spinner fa-spin me-1"></i>
                          Guardando...
                        </span>
                        <span *ngIf="!saving">
                          <i class="fas fa-save me-1"></i>
                          Guardar Cambios
                        </span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .profile-image-container {
      position: relative;
      display: inline-block;
    }
    
    .profile-image-wrapper {
      position: relative;
      width: 150px;
      height: 150px;
      margin: 0 auto;
    }
    
    .profile-image {
      width: 150px;
      height: 150px;
      border-radius: 50%;
      object-fit: cover;
      border: 4px solid #e9ecef;
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
      transition: all 0.3s ease;
    }
    
    .profile-image.loading {
      opacity: 0.6;
    }
    
    .image-loading-overlay {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 24px;
      color: #007bff;
    }
    
    .card {
      border: none;
      border-radius: 12px;
    }
    
    .card-header {
      border-radius: 12px 12px 0 0 !important;
      border: none;
    }
    
    .btn-group-vertical .btn {
      margin-bottom: 5px;
    }
    
    @media (max-width: 768px) {
      .col-md-4, .col-md-8 {
        margin-bottom: 20px;
      }
    }
  `]
})
export class ProfileEditComponent implements OnInit {
  profileForm: FormGroup;
  saving = false;
  imageUploading = false;
  profileImageUrl = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private profileService: ProfileService,
    private notificationService: NotificationService,
    private router: Router
  ) {
    this.profileForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      fullName: [''],
      email: ['', [Validators.email]],
      phone: [''],
      bio: ['']
    });
  }

  ngOnInit() {
    this.loadCurrentProfile();
  }

  /**
   * Cargar los datos actuales del perfil
   */
  loadCurrentProfile() {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.profileForm.patchValue({
        username: currentUser.username || '',
        fullName: currentUser.fullName || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        bio: currentUser.bio || ''
      });
      this.profileImageUrl = currentUser.profileImage || '';
    }

    // Cargar datos completos del backend
    this.profileService.getProfile().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const profile = response.data;
          this.profileForm.patchValue({
            username: profile.username || '',
            fullName: profile.fullName || '',
            email: profile.email || '',
            phone: profile.phone || '',
            bio: profile.bio || ''
          });
          this.profileImageUrl = profile.profileImage || '';
        }
      },
      error: (error) => {
      }
    });
  }

  /**
   * Manejar selección de nueva imagen
   */
  onImageSelected(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      this.notificationService.error('Por favor selecciona un archivo de imagen válido.');
      return;
    }

    // Validar tamaño (2MB máximo)
    if (file.size > 2 * 1024 * 1024) {
      this.notificationService.error('La imagen no puede ser mayor a 2MB.');
      return;
    }

    this.uploadImage(file);
  }

  /**
   * Subir imagen al servidor
   */
  uploadImage(file: File) {
    this.imageUploading = true;

    this.profileService.uploadProfileImage(file).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.profileImageUrl = response.data.imageUrl || '';
          this.notificationService.success(response.message || 'Imagen actualizada correctamente.');
          this.imageUploading = false;
          
          // Actualizar el usuario en el AuthService
          const currentUser = this.authService.getCurrentUser();
          if (currentUser) {
            currentUser.profileImage = response.data.imageUrl || '';
            this.authService.updateUser(currentUser);
          }
        }
      },
      error: (error) => {
        this.notificationService.error(error.error?.message || 'Error al subir la imagen.');
        this.imageUploading = false;
      }
    });
  }

  /**
   * Eliminar imagen de perfil
   */
  removeImage() {
    if (!confirm('¿Estás seguro de que deseas eliminar tu foto de perfil?')) {
      return;
    }

    this.imageUploading = true;
    this.profileService.removeProfileImage().subscribe({
      next: (response) => {
        if (response.success) {
          this.profileImageUrl = '';
          this.notificationService.success(response.message || 'Imagen eliminada correctamente.');
          this.imageUploading = false;
          
          // Actualizar el usuario en el AuthService
          const currentUser = this.authService.getCurrentUser();
          if (currentUser) {
            currentUser.profileImage = '';
            this.authService.updateUser(currentUser);
          }
        }
      },
      error: (error) => {
        this.notificationService.error(error.error?.message || 'Error al eliminar la imagen.');
        this.imageUploading = false;
      }
    });
  }

  /**
   * Enviar formulario de actualización
   */
  onSubmit() {
    if (!this.profileForm.valid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.saving = true;

    const formData: ActualizarPerfil = this.profileForm.value;
    
    this.profileService.updateProfile(formData).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success(response.message || 'Perfil actualizado correctamente.');
          this.saving = false;
          
          // Actualizar el usuario en el AuthService
          const currentUser = this.authService.getCurrentUser();
          if (currentUser && response.data) {
            const updatedUser = { ...currentUser, ...response.data };
            this.authService.updateUser(updatedUser);
          }
          
          // Redirigir al dashboard después de 2 segundos
          setTimeout(() => {
            this.router.navigate(['/admin/dashboard']);
          }, 2000);
        }
      },
      error: (error) => {
        this.notificationService.error(error.error?.message || 'Error al actualizar el perfil.');
        this.saving = false;
      }
    });
  }

  /**
   * Volver al dashboard
   */
  goBack() {
    this.router.navigate(['/admin/dashboard']);
  }

  /**
   * Manejar error al cargar imagen
   */
  onImageError(event: any) {
    // Si la imagen falla al cargar, usar un avatar SVG generado
    event.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCBmaWxsPSIjZGRkIiB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIvPjxjaXJjbGUgZmlsbD0iIzk5OSIgY3g9Ijc1IiBjeT0iNTUiIHI9IjI1Ii8+PHBhdGggZmlsbD0iIzk5OSIgZD0iTTQwIDExNWMwLTIwIDE1LTM1IDM1LTM1czM1IDE1IDM1IDM1eiIvPjwvc3ZnPg==';
  }
}