const db = require("../../db");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Get default user role (role_id = 1)
    const [roleResult] = await db.query('SELECT id FROM roles WHERE name = "user" LIMIT 1');
    const defaultRoleId = roleResult[0]?.id || 1;
    
    await db.query(
      'INSERT INTO users (username, email, password, role_id) VALUES (?, ?, ?, ?)', 
      [username, email, hashedPassword, defaultRoleId]
    );
    
    res.json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
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
      SELECT u.*, r.name as role_name, r.display_name, r.permissions 
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
        role: user.role_name || user.role,
        permissions: user.permissions
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
  try {
    const [results] = await db.query(`
      SELECT u.id, u.username, u.email, u.created_at, 
             r.name as role,
             r.display_name, r.permissions
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
  try {
    const { id } = req.params;
    const [results] = await db.query(`
      SELECT u.id, u.username, u.email, u.created_at, 
             r.name as role,
             r.display_name, r.permissions
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
             r.display_name, r.permissions
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
                 r.name as role_name,
                 r.permissions
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
            role: userData.role_name,
            permissions: userData.permissions
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
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can update roles.' });
    }

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
             r.name as role, r.display_name, r.permissions
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
  try {
    const [roles] = await db.query(`
      SELECT id, name, display_name, description, permissions, is_active
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
    const { name, display_name, description, permissions } = req.body;
    
    if (!name || !display_name) {
      return res.status(400).json({ message: 'Name and display name are required' });
    }

    const [result] = await db.query(`
      INSERT INTO roles (name, display_name, description, permissions) 
      VALUES (?, ?, ?, ?)
    `, [name, display_name, description, JSON.stringify(permissions || [])]);

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
  register: exports.register,
  login: exports.login,
  logout: exports.logout,
  getAllUsers: exports.getAllUsers,
  getUserById: exports.getUserById,
  getProfile: exports.getProfile,
  refreshToken: exports.refreshToken,
  updateUserRole: exports.updateUserRole,
  getAllRoles: exports.getAllRoles,
  createRole: exports.createRole
};
