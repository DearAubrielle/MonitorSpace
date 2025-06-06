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
exports.getAllSensorsInfo = async (req, res) => {
  try {
    const [results] = await db.query("SELECT * FROM sensor_info");
    res.json(results);
  } catch (err) {
    console.error("Error executing query:", err);
    res.status(500).send("Database query error");
  }
}

exports.putFloorplan = async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;

  try {
    await db.query(
      'UPDATE floorplan SET name = ?, description = ? WHERE id = ?',
      [name, description, id]
    );
    res.sendStatus(200);
  } catch (err) {
    console.error("Error updating floorplan:", err);
    res.status(500).send("Database update error");
  }
}
