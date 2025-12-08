/**
 * Estándar de Comunicación API - SuperCopias
 * 
 * Este archivo define el estándar de comunicación entre frontend y backend
 * para garantizar consistencia en todos los módulos del sistema.
 */

// ========================================
// ESTRUCTURA ESTÁNDAR DE ENTIDADES
// ========================================

/**
 * Campos comunes que TODAS las entidades deben tener:
 */
const CAMPOS_COMUNES = {
  id: "string",                    // ID único (formato: ENT_XXX)
  activo: "boolean",               // Estado activo/inactivo
  fechaRegistro: "ISO 8601 string", // Fecha de creación
  fechaModificacion: "ISO 8601 string | null" // Fecha de última modificación
};

/**
 * Prefijos de ID por entidad:
 * - Usuarios: USR_XXX
 * - Clientes: CLI_XXX  
 * - Empleados: EMP_XXX
 * - Proveedores: PRV_XXX
 * - Productos: PRD_XXX
 * - Pedidos: PED_XXX
 * - Facturas: FAC_XXX
 */

// ========================================
// ESTRUCTURA ESTÁNDAR DE RESPUESTAS
// ========================================

/**
 * Respuesta exitosa para operaciones CRUD:
 */
const RESPUESTA_EXITOSA = {
  success: true,
  data: {}, // o [] para listas
  message: "string opcional",
  timestamp: "ISO 8601 string"
};

/**
 * Respuesta de error:
 */
const RESPUESTA_ERROR = {
  success: false,
  error: {
    code: "string", // ERROR_CODE
    message: "string",
    details: {} // opcional
  },
  timestamp: "ISO 8601 string"
};

/**
 * Respuesta paginada para listas:
 */
const RESPUESTA_PAGINADA = {
  success: true,
  data: [],
  pagination: {
    page: "number",
    limit: "number", 
    total: "number",
    pages: "number"
  },
  timestamp: "ISO 8601 string"
};

/**
 * Respuesta para carga masiva:
 */
const RESPUESTA_UPLOAD = {
  success: true,
  data: {
    imported: "number",
    errors: ["string"],
    created: []
  },
  message: "string",
  timestamp: "ISO 8601 string"
};

// ========================================
// CÓDIGOS DE ERROR ESTÁNDAR
// ========================================

const CODIGOS_ERROR = {
  // Errores de validación
  VALIDATION_ERROR: "Datos de entrada inválidos",
  REQUIRED_FIELD: "Campo requerido faltante",
  INVALID_FORMAT: "Formato de datos inválido",
  
  // Errores de recurso
  NOT_FOUND: "Recurso no encontrado",
  ALREADY_EXISTS: "El recurso ya existe",
  DEPENDENCY_ERROR: "El recurso tiene dependencias",
  
  // Errores de autenticación
  UNAUTHORIZED: "No autorizado",
  FORBIDDEN: "Acceso denegado",
  TOKEN_EXPIRED: "Token expirado",
  
  // Errores del servidor
  INTERNAL_ERROR: "Error interno del servidor",
  DATABASE_ERROR: "Error de base de datos",
  FILE_ERROR: "Error al procesar archivo",
  
  // Errores de negocio
  BUSINESS_RULE: "Regla de negocio violada",
  INSUFFICIENT_PERMISSIONS: "Permisos insuficientes"
};

// ========================================
// EJEMPLO DE IMPLEMENTACIÓN
// ========================================

/**
 * Función helper para crear respuestas estándar
 */
function createResponse(success, data = null, message = null, error = null) {
  const response = {
    success,
    timestamp: new Date().toISOString()
  };
  
  if (success) {
    if (data !== null) response.data = data;
    if (message) response.message = message;
  } else {
    response.error = error;
  }
  
  return response;
}

/**
 * Función helper para respuestas paginadas
 */
function createPaginatedResponse(data, page, limit, total) {
  return {
    success: true,
    data,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Función helper para respuestas de error
 * @param {string} message - Mensaje de error descriptivo
 * @param {string} code - Código de error del catálogo CODIGOS_ERROR
 * @param {*} details - Detalles adicionales opcionales
 */
function createErrorResponse(message, code = CODIGOS_ERROR.INTERNAL_ERROR, details = null) {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details && { details })
    },
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  CAMPOS_COMUNES,
  RESPUESTA_EXITOSA,
  RESPUESTA_ERROR,
  RESPUESTA_PAGINADA,
  RESPUESTA_UPLOAD,
  CODIGOS_ERROR,
  createResponse,
  createPaginatedResponse,
  createErrorResponse
};