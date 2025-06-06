const db = require("../db");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  const { username, password } = req.body;
  const hash = await bcrypt.hash(password, 10);
  await db.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hash]);
  res.json({ message: 'User registered' });
};

exports.login = async (req, res) => {
  const { username, password } = req.body;
  const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);

  if (rows.length === 0 || !(await bcrypt.compare(password, rows[0].password))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: rows[0].id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.json({ token });
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