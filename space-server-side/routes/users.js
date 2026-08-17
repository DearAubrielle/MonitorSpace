const express = require('express');
const router = express.Router();
const userController = require('./controllers/usersController');
const { verifyAccessToken, verifyRefreshToken } = require("../middleware/authMiddleware");

// Login a user
router.post('/login', userController.login);

// Logout a user and clear the refresh token cookie
router.post('/logout', userController.logout);

// Get user profile (protected)
router.get('/profile', verifyAccessToken, userController.getProfile);
router.put('/change-password', verifyAccessToken, userController.changePassword);

// Refresh token endpoint
router.post('/refresh-token', verifyRefreshToken, userController.refreshToken);

// User account management (admin only; role is also enforced by the controller)
router.post('/create-account', verifyAccessToken, userController.createAccount);
router.get('/getall', verifyAccessToken, userController.getAllUsers);

// Update user role (protected route)
router.put('/update-role/:id', verifyAccessToken, userController.updateUserRole);

// Role management routes
router.get('/roles', verifyAccessToken, userController.getAllRoles);
router.post('/roles', verifyAccessToken, userController.createRole);

// Dynamic routes must remain after named routes such as /roles and /profile
router.get('/:id', verifyAccessToken, userController.getUserById);

module.exports = router;
