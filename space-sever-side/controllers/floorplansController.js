const db = require("../db");

exports.getAllFloorplans = async (req, res) => {
  try {
    const [results] = await db.query("SELECT * FROM floorplan");
    res.json(results);
  } catch (err) {
    console.error("Error executing query:", err);
    res.status(500).send("Database query error");
  }
}
