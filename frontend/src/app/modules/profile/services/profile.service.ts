import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { ConfigService } from '../../../services/config.service';
import { 
  ApiResponse, 
  PerfilUsuario, 
  ActualizarPerfil, 
  CambiarPassword,
  UploadResponse 
} from '../../../shared/interfaces';

/**
 * Servicio para gestión del perfil de usuario
 * Maneja operaciones de perfil, edición y cambio de contraseña
 */
@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private baseUrl: string;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private configService: ConfigService
  ) {
    this.baseUrl = this.configService.buildApiUrl('profile');
  }

  /**
   * Obtener el perfil completo del usuario actual
   * @returns Observable con los datos del perfil
   */
  getProfile(): Observable<ApiResponse<PerfilUsuario>> {
    return this.http.get<ApiResponse<PerfilUsuario>>(`${this.baseUrl}`);
  }

  /**
   * Actualizar datos del perfil del usuario
   * @param profileData - Datos del perfil a actualizar
   * @returns Observable con la respuesta del servidor
   */
  updateProfile(profileData: ActualizarPerfil): Observable<ApiResponse<PerfilUsuario>> {
    return this.http.put<ApiResponse<PerfilUsuario>>(`${this.baseUrl}`, profileData);
  }

  /**
   * Cambiar la contraseña del usuario
   * @param passwordData - Datos de cambio de contraseña
   * @returns Observable con la respuesta del servidor
   */
  changePassword(passwordData: CambiarPassword): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/change-password`, passwordData);
  }

  /**
   * Subir una foto de perfil
   * @param file - Archivo de imagen
   * @returns Observable con la respuesta del servidor
   */
  uploadProfileImage(file: File): Observable<ApiResponse<UploadResponse>> {
    const formData = new FormData();
    formData.append('profileImage', file);
    return this.http.post<ApiResponse<UploadResponse>>(`${this.baseUrl}/upload-image`, formData);
  }

  /**
   * Eliminar la foto de perfil
   * @returns Observable con la respuesta del servidor
   */
  removeProfileImage(): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/remove-image`);
  }
}