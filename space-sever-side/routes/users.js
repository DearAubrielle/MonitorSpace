const express = require('express');
const router = express.Router();
const userController = require('./controllers/usersController');
const { verifyAccessToken, verifyRefreshToken } = require("../middleware/authMiddleware");

// GET all users
router.get('/getall', userController.getAllUsers);

// Register a new user
router.post('/register', userController.register);

// Login a user
router.post('/login', userController.login);

// refresh token endpoint
router.post('/refresh-token', verifyRefreshToken, userController.refreshToken);

module.exports = router;
