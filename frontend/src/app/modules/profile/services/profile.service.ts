import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../../../services/auth.service';

/**
 * Servicio para gestión del perfil de usuario
 * Maneja operaciones de perfil, edición y cambio de contraseña
 */
@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private baseUrl = '/api/profile';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  /**
   * Obtener el perfil completo del usuario actual
   * @returns Observable con los datos del perfil
   */
  getProfile(): Observable<any> {
    return this.http.get(`${this.baseUrl}`);
  }

  /**
   * Actualizar datos del perfil del usuario
   * @param profileData - Datos del perfil a actualizar
   * @returns Observable con la respuesta del servidor
   */
  updateProfile(profileData: any): Observable<any> {
    return this.http.put(`${this.baseUrl}`, profileData);
  }

  /**
   * Cambiar la contraseña del usuario
   * @param passwordData - Datos de cambio de contraseña
   * @returns Observable con la respuesta del servidor
   */
  changePassword(passwordData: { currentPassword: string, newPassword: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/change-password`, passwordData);
  }

  /**
   * Subir una foto de perfil
   * @param file - Archivo de imagen
   * @returns Observable con la respuesta del servidor
   */
  uploadProfileImage(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('profileImage', file);
    return this.http.post(`${this.baseUrl}/upload-image`, formData);
  }

  /**
   * Eliminar la foto de perfil
   * @returns Observable con la respuesta del servidor
   */
  removeProfileImage(): Observable<any> {
    return this.http.delete(`${this.baseUrl}/remove-image`);
  }
}