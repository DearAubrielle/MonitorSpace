const db = require("../../db");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const isAdmin = (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ message: 'Only admins can manage user accounts.' });
    return false;
  }
  return true;
};

exports.createAccount = async (req, res) => {
  if (!isAdmin(req, res)) return;

  const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  const role = typeof req.body.role === 'string' ? req.body.role.trim() : '';

  if (!username || !email || !password || !role) {
    return res.status(400).json({ message: 'Username, email, password, and role are required.' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'Enter a valid email address.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters.' });
  }

  try {
    const [roleRows] = await db.query(
      'SELECT id, name FROM roles WHERE name = ? AND is_active = TRUE LIMIT 1',
      [role]
    );
    if (roleRows.length === 0) {
      return res.status(400).json({ message: 'Select a valid active role.' });
    }

    const [duplicateRows] = await db.query(
      'SELECT username, email FROM users WHERE username = ? OR email = ? LIMIT 1',
      [username, email]
    );
    if (duplicateRows.length > 0) {
      const field = duplicateRows[0].username === username ? 'Username' : 'Email';
      return res.status(409).json({ message: `${field} is already in use.` });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO users (username, email, password, role_id) VALUES (?, ?, ?, ?)',
      [username, email, hashedPassword, roleRows[0].id]
    );

    const [createdRows] = await db.query(`
      SELECT u.id, u.username, u.email, u.created_at,
             r.name as role, r.display_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
    `, [result.insertId]);

    res.status(201).json({
      message: 'Account created successfully.',
      user: createdRows[0]
    });

    console.log(`Account created: ${username}, role: ${role}, by admin ${req.user.username || req.user.id}`);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Username or email is already in use.' });
    }
    console.error('Create account error:', error);
    res.status(500).json({ message: 'Server error while creating account.' });
  }
};

// Generate tokens
const createAccessToken = (user) =>
  jwt.sign({ 
    id: user.id, 
    username: user.username, 
    role: user.role_name || user.role 
  }, process.env.ACCESS_SECRET, { expiresIn: "1d" });

const createRefreshToken = (user) =>
  jwt.sign({ id: user.id }, process.env.REFRESH_SECRET, { expiresIn: "7d" });

// login user and return JWT token (post method)
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Validate input
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
    
    // Find user with role information
    const [rows] = await db.query(`
      SELECT u.*, r.name as role_name, r.display_name
      FROM users u 
      LEFT JOIN roles r ON u.role_id = r.id 
      WHERE u.username = ?
    `, [username]);

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = rows[0];

    // Compare password with hashed password in database
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Create tokens
    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);

    // Send refresh token in httpOnly cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Send access token in response
    res.json({ 
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        role: user.role_name || user.role
      }
    });

    console.log(`Login success for user: ${username} role: ${user.role_name || user.role} at ${new Date().toISOString()}`);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// Logout user by removing the httpOnly refresh token cookie
exports.logout = (req, res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
  res.sendStatus(204);
};

// Get all users with role information
exports.getAllUsers = async (req, res) => {
  if (!isAdmin(req, res)) return;

  try {
    const [results] = await db.query(`
      SELECT u.id, u.username, u.email, u.created_at, 
             r.name as role,
             r.display_name
      FROM users u 
      LEFT JOIN roles r ON u.role_id = r.id
      ORDER BY u.created_at DESC
    `);
    res.json(results);
  } catch (err) {
    console.error("Error executing query:", err);
    res.status(500).json({ message: "Database query error" });
  }
};

// Get single user by ID with role information
exports.getUserById = async (req, res) => {
  if (!isAdmin(req, res)) return;

  try {
    const { id } = req.params;
    const [results] = await db.query(`
      SELECT u.id, u.username, u.email, u.created_at, 
             r.name as role,
             r.display_name
      FROM users u 
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
    `, [id]);
    
    if (results.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json(results[0]);
  } catch (err) {
    console.error("Error executing query:", err);
    res.status(500).json({ message: "Database query error" });
  }
};

// Get user profile with role information
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await db.query(`
      SELECT u.id, u.username, u.email,
             r.name as role,
             r.display_name
      FROM users u 
      LEFT JOIN roles r ON u.role_id = r.id 
      WHERE u.id = ?
    `, [userId]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.changePassword = async (req, res) => {
  const currentPassword = typeof req.body.currentPassword === 'string' ? req.body.currentPassword : '';
  const newPassword = typeof req.body.newPassword === 'string' ? req.body.newPassword : '';

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current password and new password are required.' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'New password must be at least 8 characters.' });
  }

  try {
    const [rows] = await db.query('SELECT id, password FROM users WHERE id = ? LIMIT 1', [req.user.id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const passwordMatches = await bcrypt.compare(currentPassword, rows[0].password);
    if (!passwordMatches) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }

    const reusesCurrentPassword = await bcrypt.compare(newPassword, rows[0].password);
    if (reusesCurrentPassword) {
      return res.status(400).json({ message: 'New password must be different from the current password.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);

    res.json({ message: 'Password updated successfully.' });
    console.log(`Password updated by user ID ${req.user.id} at ${new Date().toISOString()}`);
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error while updating password.' });
  }
};

// Refresh token with updated role information
exports.refreshToken = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ message: "No token provided" });

    jwt.verify(token, process.env.REFRESH_SECRET, async (err, decoded) => {
      if (err) return res.status(403).json({ message: "Invalid token" });

      try {
        // Find user with role information
        const [rows] = await db.query(`
          SELECT u.id, u.username,
                 r.name as role_name
          FROM users u 
          LEFT JOIN roles r ON u.role_id = r.id 
          WHERE u.id = ?
        `, [decoded.id]);
        
        if (rows.length === 0) {
          return res.status(404).json({ message: "User not found" });
        }

        const userData = rows[0];
        const newAccessToken = createAccessToken(userData);
        
        res.json({ 
          accessToken: newAccessToken,
          user: {
            id: userData.id,
            username: userData.username,
            role: userData.role_name
          }
        });
      } catch (dbError) {
        console.error('Database error in refresh token:', dbError);
        res.status(500).json({ message: "Server error" });
      }
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update user role using role table
exports.updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    // Only allow admins to update roles
    if (!isAdmin(req, res)) return;

    // Get valid roles from database
    const [validRoles] = await db.query('SELECT id, name FROM roles WHERE is_active = TRUE');
    const roleMap = validRoles.reduce((acc, r) => {
      acc[r.name] = r.id;
      return acc;
    }, {});

    if (!roleMap[role]) {
      const validRoleNames = Object.keys(roleMap);
      return res.status(400).json({ 
        message: `Invalid role. Must be one of: ${validRoleNames.join(', ')}` 
      });
    }

    // Check if user exists
    const [userRows] = await db.query('SELECT id, username FROM users WHERE id = ?', [id]);
    if (userRows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user role
    await db.query('UPDATE users SET role_id = ? WHERE id = ?', [roleMap[role], id]);

    // Return updated user info with role details
    const [updatedRows] = await db.query(`
      SELECT u.id, u.username, u.email, u.created_at,
             r.name as role, r.display_name
      FROM users u 
      LEFT JOIN roles r ON u.role_id = r.id 
      WHERE u.id = ?
    `, [id]);
    
    res.json({ 
      message: 'User role updated successfully',
      user: updatedRows[0]
    });

    console.log(`User role updated: ID ${id}, new role: ${role} by user ${req.user?.username || 'unknown'} at ${new Date().toISOString()}`);
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ message: 'Server error during role update' });
  }
};

// Get all available roles
exports.getAllRoles = async (req, res) => {
  if (!isAdmin(req, res)) return;

  try {
    const [roles] = await db.query(`
      SELECT id, name, display_name, description, is_active
      FROM roles 
      WHERE is_active = TRUE
      ORDER BY id ASC
    `);
    res.json(roles);
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ message: 'Server error fetching roles' });
  }
};

// Create new role (admin only)
exports.createRole = async (req, res) => {
  try {
    if (!isAdmin(req, res)) return;

    const { name, display_name, description } = req.body;
    
    if (!name || !display_name) {
      return res.status(400).json({ message: 'Name and display name are required' });
    }

    const [result] = await db.query(`
      INSERT INTO roles (name, display_name, description)
      VALUES (?, ?, ?)
    `, [name, display_name, description]);

    const [newRole] = await db.query('SELECT * FROM roles WHERE id = ?', [result.insertId]);
    
    res.status(201).json({
      message: 'Role created successfully',
      role: newRole[0]
    });

    console.log(`New role created: ${name} by user ${req.user?.username || 'unknown'} at ${new Date().toISOString()}`);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Role name already exists' });
    }
    console.error('Create role error:', error);
    res.status(500).json({ message: 'Server error creating role' });
  }
};

module.exports = {
  createAccount: exports.createAccount,
  login: exports.login,
  logout: exports.logout,
  getAllUsers: exports.getAllUsers,
  getUserById: exports.getUserById,
  getProfile: exports.getProfile,
  changePassword: exports.changePassword,
  refreshToken: exports.refreshToken,
  updateUserRole: exports.updateUserRole,
  getAllRoles: exports.getAllRoles,
  createRole: exports.createRole
};
