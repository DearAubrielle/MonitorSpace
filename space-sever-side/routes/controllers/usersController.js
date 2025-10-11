const db = require("../../db");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  await db.query(
    'INSERT INTO users (username, email, password) VALUES (?, ?, ?)', 
    [username, email, hashedPassword]
  );
  res.json({ message: 'User registered' });
};


const users = [
  { id: 1, username: "admin", password: "123456", role: "admin" },
  { id: 2, username: "editor", password: "123456", role: "editor" },
];

// Generate tokens
const createAccessToken = (user) =>
  jwt.sign({ id: user.id, role: user.role }, process.env.ACCESS_SECRET, { expiresIn: "15m" });

const createRefreshToken = (user) =>
  jwt.sign({ id: user.id }, process.env.REFRESH_SECRET, { expiresIn: "7d" });
// login user and return JWT token (post method)

exports.login = async (req, res) => {
  const { username, password } = req.body;
  const user = users.find((u) => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  const accessToken = createAccessToken(user);
  const refreshToken = createRefreshToken(user);

  // Send refresh token in httpOnly cookie
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  // Send access token in response
  res.json({ accessToken });
  /*
  const { username, password } = req.body;
  
  const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);

  if (rows.length === 0 || !(await bcrypt.compare(password, rows[0].password))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }



  const token = jwt.sign(
    { id: rows[0].id }, 
    process.env.JWT_SECRET, 
    { expiresIn: '1h' }
  );

  res.json({ message: "Login successful", token });
  console.log(`Login success for user: ${username} , token: ${token} , expiration: ${new Date(Date.now() + 3600000).toISOString()}`); // Log login success
*/
  };
  


exports.getAllUsers = async (req, res) => {
  try {
    const [results] = await db.query("SELECT * FROM users");
    res.json(results);
  } catch (err) {
    console.error("Error executing query:", err);
    res.status(500).send("Database query error");
  }
};

exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id; // 👈 comes from verifyToken
    const [rows] = await db.query('SELECT id, username, role FROM users WHERE id = ?', [userId]);
    if (rows.length === 0) return res.status(404).json({ message: 'User not found' });

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.refreshToken = (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) return res.status(401).json({ message: "No token provided" });

  jwt.verify(token, process.env.REFRESH_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Invalid token" });

    const userData = users.find(u => u.id === user.id);
    if (!userData) return res.status(404).json({ message: "User not found" });

    const newAccessToken = createAccessToken(user);
    res.json({ accessToken: newAccessToken });
  });
};

/* const getAllUsers = (req, res) => {
  const query = "SELECT * FROM users";
  db.query(query, (err, results) => {
    if (err) {
      console.error("Error executing query:", err);
      return res.status(500).send("Database query error");
    }
    res.json(results);
  });
};

module.exports = {
  getAllUsers,
};
 */