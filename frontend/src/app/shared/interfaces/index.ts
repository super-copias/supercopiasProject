/**
 * Interfaces compartidas - SuperCopias
 * Definiciones de tipos TypeScript para toda la aplicación
 */

// Interfaz base para respuestas API estándar
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  timestamp: string;
}

// Interfaz base para entidades con campos comunes
export interface BaseEntity {
  id: number;
  activo: boolean;
  fechaRegistro: string;
  fechaModificacion: string | null;
}

// Interfaz para Usuario (autenticación y perfil básico)
export interface Usuario extends BaseEntity {
  username: string;
  password?: string; // Opcional - solo para creación/actualización
  nombre: string;
  email: string;
  role: string; // Para compatibilidad con código existente
  roles?: number[]; // Nuevo campo para múltiples roles numéricos
  empleadoId?: number; // ID del empleado asociado
  ultimoAcceso?: string;
  // Campos de perfil
  fullName?: string;
  phone?: string;
  bio?: string;
  profileImage?: string;
  // Campos para permisos (calculados)
  tipoPermiso?: string; // Tipo de permiso del empleado asociado
  modulosPermitidos?: string[]; // Módulos a los que tiene acceso
  mustResetPassword?: boolean; // Forzar cambio de contraseña en el próximo acceso
}

// Interfaz específica para datos de perfil completo
export interface PerfilUsuario {
  id: number;
  username: string;
  nombre: string;
  fullName: string;
  email: string;
  phone: string;
  bio: string;
  profileImage: string;
  role: string;
  activo: boolean;
  fechaRegistro: string;
  fechaModificacion: string | null;
  ultimoAcceso: string | null;
}

// Interfaz para datos de actualización de perfil
export interface ActualizarPerfil {
  username?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  bio?: string;
}

// Interfaz para cambio de contraseña
export interface CambiarPassword {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// Interfaz para login
export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  usuario: Usuario;
}

// Interfaces para entidades de negocio
export interface Cliente extends BaseEntity {
  nombreComercial: string;
  razonSocial?: string;
  rfc?: string;
  regimenFiscal?: string;
  usoCfdi?: string;
  telefono?: string;
  segundoTelefono?: string;
  email?: string;
  segundoEmail?: string;
  direccionEntrega?: string;
  direccionFacturacion?: string;
  direccionCodigoPostal?: string;
}

// Interfaces para sistema de roles
export interface ModuloPermisos {
  crear: boolean;
  leer: boolean;
  actualizar: boolean;
  eliminar: boolean;
  administrar: boolean;
}

export interface RolSistema {
  id: number;
  nombre: string;
  descripcion: string;
  color: string;
  permisos: { [modulo: string]: ModuloPermisos };
}

export interface Empleado extends BaseEntity {
  nombre: string;
  email?: string;
  telefono?: string;
  puestoId?: number;
  puesto?: string; // Dato desnormalizado del join
  sucursalId?: number;
  sucursal?: string; // Dato desnormalizado del join
  salario?: number;
  fechaIngreso?: string;
  fechaBaja?: string;
  turno?: 'Matutino' | 'Vespertino' | 'Nocturno' | 'Mixto';
  tipoAcceso?: 'completo' | 'limitado';
  diasVacacionesSugeridos?: number;
  notasVacaciones?: string;
  roles?: string[];
  rolesInfo?: RolSistema[];
  tieneUsuario?: boolean;
  usuarioId?: number;
  username?: string; // Dato del join con usuarios
  usuarioRoles?: number[]; // Dato del join con usuarios
}

export interface CrearEmpleado {
  nombre: string;
  email?: string;
  telefono?: string;
  puestoId?: number;
  sucursalId?: number;
  salario?: number;
  fechaIngreso?: string;
  turno?: 'Matutino' | 'Vespertino' | 'Nocturno' | 'Mixto';
  tipoAcceso?: 'completo' | 'limitado';
  diasVacacionesSugeridos?: number;
  notasVacaciones?: string;
  roles?: string[];
  crearUsuario?: boolean;
}

export interface AsignarRoles {
  roles: string[];
  crearUsuario?: boolean;
}

export interface EmpleadoConUsuario {
  empleado: Empleado;
  usuario?: {
    id: number;
    username: string;
    password?: string;
    roles: number[];
  };
}

// Interface para Proveedor
export interface Proveedor extends BaseEntity {
  nombreComercial: string;
  razonSocial?: string;
  rfc?: string;
  tipoProveedor?: string;
  nombreContacto?: string;
  telefono?: string;
  email?: string;
  paginaWeb?: string;
  direccion?: string;
  metodoPagoPrincipal?: string;
  cuentaBancaria?: string;
  diasCredito?: number;
  notas?: string;
  // Compatibilidad con datos de backend (snake_case)
  nombre_comercial?: string;
  razon_social?: string;
  tipo_proveedor?: string;
  nombre_contacto?: string;
  pagina_web?: string;
  metodo_pago_principal?: string;
  cuenta_bancaria?: string;
  dias_credito?: number;
}

// Interfaces para operaciones comunes
export interface PaginationParams {
  page?: number;
  limit?: number;
  q?: string;
  includeInactive?: boolean;
  [key: string]: any;
}

export interface UploadResponse {
  success: boolean;
  imageUrl?: string;
  message?: string;
  error?: string;
}