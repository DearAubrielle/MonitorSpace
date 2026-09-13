const express = require('express');
const router = express.Router();
const userController = require('./controllers/usersController');
const { verifyAccessToken, verifyRefreshToken, requireRoles } = require("../middleware/authMiddleware");

// Login a user
router.post('/login', userController.login);

// Logout a user and clear the refresh token cookie
router.post('/logout', userController.logout);

// Get user profile (protected)
router.get('/profile', verifyAccessToken, userController.getProfile);
router.put('/change-password', verifyAccessToken, userController.changePassword);

// Refresh token endpoint
router.post('/refresh-token', verifyRefreshToken, userController.refreshToken);

// User account management (admin only)
router.post('/create-account', verifyAccessToken, requireRoles('admin'), userController.createAccount);
router.get('/getall', verifyAccessToken, requireRoles('admin'), userController.getAllUsers);

// Update user role (admin only)
router.put('/update-role/:id', verifyAccessToken, requireRoles('admin'), userController.updateUserRole);

// Role management routes (admin only)
router.get('/roles', verifyAccessToken, requireRoles('admin'), userController.getAllRoles);
router.post('/roles', verifyAccessToken, requireRoles('admin'), userController.createRole);

// Dynamic routes must remain after named routes such as /roles and /profile
router.get('/:id', verifyAccessToken, requireRoles('admin'), userController.getUserById);

module.exports = router;
