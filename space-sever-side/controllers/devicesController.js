const e = require("express");
const db = require("../db");

exports.getAllDevices = async (req, res) => {
  try {
    const [results] = await db.query("SELECT * FROM devices");
    res.json(results);
  } catch (err) {
    console.error("Error executing query:", err);
    res.status(500).send("Database query error");
  }
}
exports.getAllDeviceTypes = async (req, res) => {
    try {
      const [results] = await db.query("SELECT * FROM device_type");
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
exports.createDevice = async (req, res) => {
  const { name, device_type_id, floorplan_id, path_topic, min_alert, max_alert } = req.body;
  try {
    await db.query(
      'INSERT INTO devices (name, device_type_id, floorplan_id, path_topic, min_alert, max_alert) VALUES (?, ?, ?, ?, ?, ?)',
      [name, device_type_id, floorplan_id, path_topic, min_alert, max_alert]
    );
    res.sendStatus(201);
  } catch (err) {
    console.error("Error creating new device:", err);
    res.status(500).send("Database insert error");
  }
}