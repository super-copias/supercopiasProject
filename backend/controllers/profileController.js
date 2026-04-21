/**
 * Controlador de Perfil de Usuario
 * Gestiona operaciones de perfil, edición y cambio de contraseña
 */

const { query, queryAudit } = require('../config/database');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const { nanoid } = require('nanoid');
const { 
  createResponse, 
  createErrorResponse, 
  CODIGOS_ERROR 
} = require('../utils/apiStandard');

/**
 * Obtener el perfil del usuario autenticado
 * Endpoint: GET /api/profile
 * 
 * @param {Object} req - Request object (debe contener req.user del middleware de auth)
 * @param {Object} res - Response object
 * @returns {Object} JSON con datos del perfil del usuario
 */
async function getProfile(req, res) {
  try {
    // El middleware de auth debe haber agregado el usuario al request
    if (!req.user) {
      return res.status(401).json(
        createErrorResponse(
          CODIGOS_ERROR.UNAUTHORIZED,
          'Usuario no autenticado'
        )
      );
    }

    // Buscar el usuario en PostgreSQL
    const result = await query(
      'SELECT * FROM usuarios WHERE id = $1',
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json(
        createErrorResponse(
          CODIGOS_ERROR.NOT_FOUND,
          'Usuario no encontrado'
        )
      );
    }

    const user = result.rows[0];
    
    // Remover la contraseña de la respuesta
    const { password, ...userProfile } = user;
    
    // Agregar información adicional del perfil
    const profileData = {
      ...userProfile,
      lastLogin: user.ultimo_acceso || null,
      profileImage: user.profile_image || null,
      fullName: user.full_name || user.nombre || null
    };

    res.json(
      createResponse(
        true,                           // success
        profileData,                    // data
        'Perfil obtenido exitosamente'  // message
      )
    );
    
  } catch (error) {

    res.status(500).json(
      createErrorResponse(
        CODIGOS_ERROR.INTERNAL_ERROR,
        'Error interno del servidor'
      )
    );
  }
}

/**
 * Actualizar el perfil del usuario
 * Endpoint: PUT /api/profile
 * 
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Object} JSON con confirmación de actualización
 */
async function updateProfile(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json(
        createErrorResponse(
          CODIGOS_ERROR.UNAUTHORIZED,
          'Usuario no autenticado'
        )
      );
    }

    const { username, fullName, email, phone, bio } = req.body;
    
    // Validaciones básicas
    if (!username || username.trim().length < 3) {
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.VALIDATION_ERROR,
          'El nombre de usuario debe tener al menos 3 caracteres'
        )
      );
    }

    // Verificar si el username ya existe en PostgreSQL (excluyendo el usuario actual)
    const existingUser = await query(
      'SELECT id FROM usuarios WHERE username = $1 AND id != $2',
      [username.trim(), req.user.id]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.ALREADY_EXISTS,
          'El nombre de usuario ya está en uso'
        )
      );
    }

    // Validar email si se proporciona
    if (email && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json(
          createErrorResponse(
            CODIGOS_ERROR.VALIDATION_ERROR,
            'El formato del correo electrónico no es válido'
          )
        );
      }
    }

    // Construir consulta de actualización dinámica
    const camposUpdate = [];
    const valoresUpdate = [];
    let paramIndex = 1;
    
    const campos = {
      username: username?.trim(),
      full_name: fullName?.trim(),
      email: email?.trim(),
      phone: phone?.trim(),
      bio: bio?.trim()
    };
    
    Object.entries(campos).forEach(([campo, valor]) => {
      if (valor !== undefined) {
        camposUpdate.push(`${campo} = $${paramIndex}`);
        valoresUpdate.push(valor);
        paramIndex++;
      }
    });
    
    // Agregar fecha de modificación
    camposUpdate.push(`fecha_modificacion = NOW()`);
    
    // Agregar el ID para la condición WHERE
    valoresUpdate.push(req.user.id);

    const updateQuery = `
      UPDATE usuarios 
      SET ${camposUpdate.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await queryAudit(updateQuery, valoresUpdate, req.user.id, req.user.nombre || req.user.username);
    const updatedUser = result.rows[0];
    
    // Remover contraseña de la respuesta
    const { password, ...userProfile } = updatedUser;

    res.json(
      createResponse(
        true,                                 // success
        userProfile,                          // data
        'Perfil actualizado correctamente'    // message
      )
    );
    
  } catch (error) {

    res.status(500).json(
      createErrorResponse(
        CODIGOS_ERROR.INTERNAL_ERROR,
        'Error interno del servidor'
      )
    );
  }
}

/**
 * Cambiar contraseña del usuario
 * Endpoint: POST /api/profile/change-password
 * 
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Object} JSON con confirmación de cambio
 */
async function changePassword(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json(
        createErrorResponse(
          CODIGOS_ERROR.UNAUTHORIZED,
          'Usuario no autenticado'
        )
      );
    }

    const { currentPassword, newPassword } = req.body;
    
    // Validaciones
    if (!currentPassword || !newPassword) {
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.REQUIRED_FIELD,
          'La contraseña actual y la nueva contraseña son requeridas'
        )
      );
    }

    if (newPassword.length < 8) {
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.VALIDATION_ERROR,
          'La nueva contraseña debe tener al menos 8 caracteres'
        )
      );
    }

    // Validar fortaleza de la contraseña
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.VALIDATION_ERROR,
          'La nueva contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial'
        )
      );
    }

    // Obtener usuario actual de PostgreSQL
    const result = await query(
      'SELECT id, password FROM usuarios WHERE id = $1',
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json(
        createErrorResponse(
          CODIGOS_ERROR.NOT_FOUND,
          'Usuario no encontrado'
        )
      );
    }

    const user = result.rows[0];

    // Verificar contraseña actual
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    
    if (!isCurrentPasswordValid) {
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.VALIDATION_ERROR,
          'La contraseña actual es incorrecta'
        )
      );
    }

    // Generar hash de la nueva contraseña
    const saltRounds = 8;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Actualizar contraseña en PostgreSQL
    await queryAudit(
      `UPDATE usuarios 
       SET password = $1, 
           fecha_modificacion = NOW()
       WHERE id = $2`,
      [hashedNewPassword, req.user.id],
      req.user.id, req.user.nombre || req.user.username
    );

    res.json(
      createResponse(
        true,                                   // success
        null,                                   // data
        'Contraseña cambiada correctamente'     // message
      )
    );
    
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json(
      createErrorResponse(
        CODIGOS_ERROR.INTERNAL_ERROR,
        'Error interno del servidor'
      )
    );
  }
}

/**
 * Subir imagen de perfil
 * Endpoint: POST /api/profile/upload-image
 * 
 * @param {Object} req - Request object (con multer para archivos)
 * @param {Object} res - Response object
 * @returns {Object} JSON con URL de la imagen
 */
async function uploadProfileImage(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json(
        createErrorResponse(
          CODIGOS_ERROR.UNAUTHORIZED,
          'Usuario no autenticado'
        )
      );
    }

    if (!req.file) {
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.REQUIRED_FIELD,
          'No se encontró archivo de imagen'
        )
      );
    }

    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      // Eliminar archivo subido
      fs.unlinkSync(req.file.path);
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.VALIDATION_ERROR,
          'Tipo de archivo no permitido. Solo JPG, PNG y GIF'
        )
      );
    }

    // Validar tamaño (2MB máximo)
    if (req.file.size > 2 * 1024 * 1024) {
      // Eliminar archivo subido
      fs.unlinkSync(req.file.path);
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.VALIDATION_ERROR,
          'El archivo es demasiado grande. Máximo 2MB'
        )
      );
    }

    // Generar nombre único para el archivo
    const fileExtension = path.extname(req.file.originalname);
    const fileName = `profile-${req.user.id}-${nanoid()}${fileExtension}`;
    const uploadDir = path.join(__dirname, '../uploads/profiles');
    
    // Crear directorio si no existe
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const finalPath = path.join(uploadDir, fileName);
    
    // Mover archivo a su ubicación final
    fs.renameSync(req.file.path, finalPath);
    
    // URL de la imagen
    const imageUrl = `/uploads/profiles/${fileName}`;
    
    // Obtener imagen anterior y eliminarla si existe
    const userResult = await query(
      'SELECT profile_image FROM usuarios WHERE id = $1',
      [req.user.id]
    );
    
    if (userResult.rows.length > 0 && userResult.rows[0].profile_image) {
      const oldImagePath = path.join(__dirname, '..', userResult.rows[0].profile_image);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    // Actualizar usuario en PostgreSQL
    await queryAudit(
      `UPDATE usuarios 
       SET profile_image = $1, 
           fecha_modificacion = NOW()
       WHERE id = $2`,
      [imageUrl, req.user.id],
      req.user.id, req.user.nombre || req.user.username
    );

    res.json(
      createResponse(
        true,                                       // success
        { imageUrl },                               // data
        'Imagen de perfil subida correctamente'     // message
      )
    );
    
  } catch (error) {

    
    // Limpiar archivo si hay error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json(
      createErrorResponse(
        CODIGOS_ERROR.INTERNAL_ERROR,
        'Error interno del servidor'
      )
    );
  }
}

/**
 * Eliminar imagen de perfil
 * Endpoint: DELETE /api/profile/remove-image
 * 
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Object} JSON con confirmación de eliminación
 */
async function removeProfileImage(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json(
        createErrorResponse(
          CODIGOS_ERROR.UNAUTHORIZED,
          'Usuario no autenticado'
        )
      );
    }

    // Obtener imagen actual del usuario
    const userResult = await query(
      'SELECT profile_image FROM usuarios WHERE id = $1',
      [req.user.id]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json(
        createErrorResponse(
          CODIGOS_ERROR.NOT_FOUND,
          'Usuario no encontrado'
        )
      );
    }

    const user = userResult.rows[0];
    
    if (!user.profile_image) {
      return res.status(400).json(
        createErrorResponse(
          CODIGOS_ERROR.VALIDATION_ERROR,
          'No hay imagen de perfil para eliminar'
        )
      );
    }

    // Eliminar archivo físico
    const imagePath = path.join(__dirname, '..', user.profile_image);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    // Actualizar usuario en PostgreSQL
    await queryAudit(
      `UPDATE usuarios 
       SET profile_image = NULL, 
           fecha_modificacion = NOW()
       WHERE id = $1`,
      [req.user.id],
      req.user.id, req.user.nombre || req.user.username
    );

    res.json(
      createResponse(
        true,                                         // success
        null,                                         // data
        'Imagen de perfil eliminada correctamente'    // message
      )
    );
    
  } catch (error) {

    res.status(500).json(
      createErrorResponse(
        CODIGOS_ERROR.INTERNAL_ERROR,
        'Error interno del servidor'
      )
    );
  }
}

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  uploadProfileImage,
  removeProfileImage
};
