/**
 * Rutas de Perfil de Usuario
 * Gestiona endpoints para operaciones de perfil
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();

// Importar controlador
const profileController = require('../controllers/profileController');

// Importar middleware de autenticación
const authMiddleware = require('../middlewares/auth');

// Configuración de multer para subida de imágenes
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/temp/'); // Directorio temporal
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'temp-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB máximo
  },
  fileFilter: function (req, file, cb) {
    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido'), false);
    }
  }
});

/**
 * @route GET /api/profile
 * @desc Obtener perfil del usuario autenticado
 * @access Private
 */
router.get('/', authMiddleware, profileController.getProfile);

/**
 * @route PUT /api/profile
 * @desc Actualizar perfil del usuario
 * @access Private
 */
router.put('/', authMiddleware, profileController.updateProfile);

/**
 * @route POST /api/profile/change-password
 * @desc Cambiar contraseña del usuario
 * @access Private
 */
router.post('/change-password', authMiddleware, profileController.changePassword);

/**
 * @route POST /api/profile/upload-image
 * @desc Subir imagen de perfil
 * @access Private
 */
router.post('/upload-image', authMiddleware, upload.single('profileImage'), profileController.uploadProfileImage);

/**
 * @route DELETE /api/profile/remove-image
 * @desc Eliminar imagen de perfil
 * @access Private
 */
router.delete('/remove-image', authMiddleware, profileController.removeProfileImage);

module.exports = router;