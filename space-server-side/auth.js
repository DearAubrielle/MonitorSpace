const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Login route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  // Fetch user from DB, check password, etc.
  // If valid:
  
  const token = jwt.sign({ userId: user.id }, 'your_jwt_secret');
  res.json({ token });
});

module.exports = router;