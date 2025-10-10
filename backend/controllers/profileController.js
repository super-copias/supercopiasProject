/**
 * Controlador de Perfil de Usuario
 * Gestiona operaciones de perfil, edición y cambio de contraseña
 */

const { db, init } = require('../db');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const { nanoid } = require('nanoid');

/**
 * Obtener el perfil del usuario autenticado
 * Endpoint: GET /api/profile
 * 
 * @param {Object} req - Request object (debe contener req.user del middleware de auth)
 * @param {Object} res - Response object
 * @returns {Object} JSON con datos del perfil del usuario
 */
function getProfile(req, res) {
  try {
    init();
    
    // El middleware de auth debe haber agregado el usuario al request
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Usuario no autenticado' 
      });
    }

    // Buscar el usuario en la base de datos para obtener datos actualizados
    const user = db.get('usuarios').find({ id: req.user.id }).value();
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Usuario no encontrado' 
      });
    }

    // Remover la contraseña de la respuesta
    const { password, ...userProfile } = user;
    
    // Agregar información adicional del perfil
    const profileData = {
      ...userProfile,
      lastLogin: user.lastLogin || null,
      createdAt: user.createdAt || null,
      profileImage: user.profileImage || null,
      fullName: user.fullName || null,
      email: user.email || null,
      phone: user.phone || null,
      bio: user.bio || null
    };

    res.json({
      success: true,
      data: profileData
    });
    
  } catch (error) {
    console.error('Error getting profile:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
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
function updateProfile(req, res) {
  try {
    init();
    
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Usuario no autenticado' 
      });
    }

    const { username, fullName, email, phone, bio } = req.body;
    
    // Validaciones básicas
    if (!username || username.trim().length < 3) {
      return res.status(400).json({ 
        success: false, 
        message: 'El nombre de usuario debe tener al menos 3 caracteres' 
      });
    }

    // Verificar si el username ya existe (excluyendo el usuario actual)
    const existingUser = db.get('usuarios')
      .find(u => u.username === username.trim() && u.id !== req.user.id)
      .value();
    
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'El nombre de usuario ya está en uso' 
      });
    }

    // Validar email si se proporciona
    if (email && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({ 
          success: false, 
          message: 'El formato del correo electrónico no es válido' 
        });
      }
    }

    // Preparar datos para actualización
    const updateData = {
      username: username.trim(),
      fullName: fullName?.trim() || null,
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      bio: bio?.trim() || null,
      updatedAt: new Date().toISOString()
    };

    // Actualizar en la base de datos
    db.get('usuarios')
      .find({ id: req.user.id })
      .assign(updateData)
      .write();

    // Obtener usuario actualizado (sin contraseña)
    const updatedUser = db.get('usuarios').find({ id: req.user.id }).value();
    const { password, ...userProfile } = updatedUser;

    res.json({
      success: true,
      message: 'Perfil actualizado correctamente',
      data: userProfile
    });
    
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
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
function changePassword(req, res) {
  try {
    init();
    
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Usuario no autenticado' 
      });
    }

    const { currentPassword, newPassword } = req.body;
    
    // Validaciones
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'La contraseña actual y la nueva contraseña son requeridas' 
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ 
        success: false, 
        message: 'La nueva contraseña debe tener al menos 8 caracteres' 
      });
    }

    // Validar fortaleza de la contraseña
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
      return res.status(400).json({ 
        success: false, 
        message: 'La nueva contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial' 
      });
    }

    // Obtener usuario actual
    const user = db.get('usuarios').find({ id: req.user.id }).value();
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Usuario no encontrado' 
      });
    }

    // Verificar contraseña actual
    const isCurrentPasswordValid = bcrypt.compareSync(currentPassword, user.password);
    
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ 
        success: false, 
        message: 'La contraseña actual es incorrecta' 
      });
    }

    // Generar hash de la nueva contraseña
    const saltRounds = 8;
    const hashedNewPassword = bcrypt.hashSync(newPassword, saltRounds);

    // Actualizar contraseña en la base de datos
    db.get('usuarios')
      .find({ id: req.user.id })
      .assign({ 
        password: hashedNewPassword,
        passwordChangedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .write();

    res.json({
      success: true,
      message: 'Contraseña cambiada correctamente'
    });
    
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
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
function uploadProfileImage(req, res) {
  try {
    init();
    
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Usuario no autenticado' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No se encontró archivo de imagen' 
      });
    }

    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      // Eliminar archivo subido
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ 
        success: false, 
        message: 'Tipo de archivo no permitido. Solo JPG, PNG y GIF' 
      });
    }

    // Validar tamaño (2MB máximo)
    if (req.file.size > 2 * 1024 * 1024) {
      // Eliminar archivo subido
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ 
        success: false, 
        message: 'El archivo es demasiado grande. Máximo 2MB' 
      });
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
    
    // Eliminar imagen anterior si existe
    const user = db.get('usuarios').find({ id: req.user.id }).value();
    if (user.profileImage) {
      const oldImagePath = path.join(__dirname, '..', user.profileImage);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    // Actualizar usuario en la base de datos
    db.get('usuarios')
      .find({ id: req.user.id })
      .assign({ 
        profileImage: imageUrl,
        updatedAt: new Date().toISOString()
      })
      .write();

    res.json({
      success: true,
      message: 'Imagen de perfil subida correctamente',
      imageUrl: imageUrl
    });
    
  } catch (error) {
    console.error('Error uploading profile image:', error);
    
    // Limpiar archivo si hay error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
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
function removeProfileImage(req, res) {
  try {
    init();
    
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Usuario no autenticado' 
      });
    }

    const user = db.get('usuarios').find({ id: req.user.id }).value();
    
    if (!user.profileImage) {
      return res.status(400).json({ 
        success: false, 
        message: 'No hay imagen de perfil para eliminar' 
      });
    }

    // Eliminar archivo físico
    const imagePath = path.join(__dirname, '..', user.profileImage);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    // Actualizar usuario en la base de datos
    db.get('usuarios')
      .find({ id: req.user.id })
      .assign({ 
        profileImage: null,
        updatedAt: new Date().toISOString()
      })
      .write();

    res.json({
      success: true,
      message: 'Imagen de perfil eliminada correctamente'
    });
    
  } catch (error) {
    console.error('Error removing profile image:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
}

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  uploadProfileImage,
  removeProfileImage
};