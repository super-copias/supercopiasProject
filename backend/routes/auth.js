const express = require('express');
const router  = express.Router();
const { login, verifyToken, logout, activityHeartbeat, changePassword } = require('../controllers/authController');
const auth = require('../middlewares/auth');

router.post('/login',           login);
router.get('/verify',           auth, verifyToken);
router.post('/logout',          auth, logout);
router.post('/activity',        auth, activityHeartbeat);
router.put('/change-password',  auth, changePassword);

module.exports = router;
