const express = require('express');
const router = express.Router();
const userController = require('./controllers/usersController');
const { verifyAccessToken, verifyRefreshToken } = require("../middleware/authMiddleware");

// GET all users
router.get('/getall', userController.getAllUsers);

// GET single user by ID
router.get('/:id', userController.getUserById);

// Register a new user
router.post('/register', userController.register);

// Login a user
router.post('/login', userController.login);

// Logout a user and clear the refresh token cookie
router.post('/logout', userController.logout);

// Get user profile (protected)
router.get('/profile', verifyAccessToken, userController.getProfile);

// Refresh token endpoint
router.post('/refresh-token', verifyRefreshToken, userController.refreshToken);

// Update user role (protected route)
router.put('/update-role/:id', verifyAccessToken, userController.updateUserRole);

// Role management routes
router.get('/roles', verifyAccessToken, userController.getAllRoles);
router.post('/roles', verifyAccessToken, userController.createRole);

module.exports = router;
