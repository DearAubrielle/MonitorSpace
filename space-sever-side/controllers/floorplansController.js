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
exports.getAllDevices = async (req, res) => {
  try {
    const [results] = await db.query("SELECT * FROM devices");
    res.json(results);
  } catch (err) {
    console.error("Error executing query:", err);
    res.status(500).send("Database query error");
  }
}
exports.putDeviceslocation = async (req, res) => {
  const { id } = req.params;
  const { floorplan_id } = req.body;
  try {
    await db.query(
      'UPDATE devices SET floorplan_id = ? WHERE id = ?',
      [floorplan_id, id]
    );
    res.sendStatus(200);
  } catch (err) {
    console.error("Error updating device location:", err);
    res.status(500).send("Database update error");
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
