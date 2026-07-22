const e = require("express");
const db = require("../../db");
const axios = require('axios');
const { normalizeDeviceName, isDuplicateEntryError } = require('../utils/deviceName');

const DUPLICATE_DEVICE_NAME_MESSAGE = 'A device with this name already exists.';

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
exports.putDevicesTofloorplan = async (req, res) => {
  const { id } = req.params;
  const { floorplan_id } = req.body;
  
  try {
    // Check if we're trying to unassign the device (floorplan_id is 0, null, or undefined)
    if (floorplan_id === 0 || floorplan_id === null || floorplan_id === undefined) {
      // First, check if an "Unassigned" floorplan exists
      const [unassignedFloorplan] = await db.query(
        "SELECT id FROM floorplan WHERE name = 'Unassigned' OR name = 'unassigned'"
      );
      
      let unassignedId;
      if (unassignedFloorplan.length === 0) {
        // Create the "Unassigned" floorplan if it doesn't exist
        const [result] = await db.query(
          "INSERT INTO floorplan (name, description, image_url) VALUES (?, ?, ?)",
          ['Unassigned', 'Temporary holding area for unassigned devices', null]
        );
        unassignedId = result.insertId;
        console.log(`Created "Unassigned" floorplan with ID: ${unassignedId}`);
      } else {
        unassignedId = unassignedFloorplan[0].id;
      }
      
      // Update the device to use the "Unassigned" floorplan
      await db.query(
        'UPDATE devices SET floorplan_id = ? WHERE id = ?',
        [unassignedId, id]
      );
    } else {
      // Validate that the floorplan exists
      const [floorplan] = await db.query(
        "SELECT id FROM floorplan WHERE id = ?",
        [floorplan_id]
      );
      
      if (floorplan.length === 0) {
        return res.status(400).json({ message: 'Floorplan not found' });
      }
      
      // Normal assignment to a valid floorplan
      await db.query(
        'UPDATE devices SET floorplan_id = ? WHERE id = ?',
        [floorplan_id, id]
      );
    }
    
    res.sendStatus(200);
  } catch (err) {
    console.error("Error updating device location:", err);
    res.status(500).json({ 
      message: "Database update error",
      error: err.message 
    });
  }
}
exports.createDevice = async (req, res) => {
  const { name, device_type_id, floorplan_id, path_topic, min_alert, max_alert } = req.body;
  const normalizedName = normalizeDeviceName(name);
  
  try {
    // Validate required fields
    if (!normalizedName || !device_type_id || !floorplan_id) {
      return res.status(400).json({ message: 'Name, device type, and floorplan are required' });
    }

    // Validate name length and characters
    if (normalizedName.length < 2 || normalizedName.length > 100) {
      return res.status(400).json({ message: 'Device name must be between 2 and 100 characters' });
    }

    // Check if device type exists
    const [deviceType] = await db.query('SELECT * FROM device_type WHERE id = ?', [device_type_id]);
    if (deviceType.length === 0) {
      return res.status(400).json({ message: 'Invalid device type' });
    }

    // Check if floorplan exists
    const [floorplan] = await db.query('SELECT * FROM floorplan WHERE id = ?', [floorplan_id]);
    if (floorplan.length === 0) {
      return res.status(400).json({ message: 'Invalid floorplan' });
    }

    // Check for a duplicate device name across the entire system.
    const [existingDevice] = await db.query(
      'SELECT id FROM devices WHERE name = ? LIMIT 1',
      [normalizedName]
    );
    if (existingDevice.length > 0) {
      return res.status(409).json({ message: DUPLICATE_DEVICE_NAME_MESSAGE });
    }

    const isCamera = deviceType[0].name === 'Camera';

    // Validate based on device type
    if (isCamera) {

      // Insert camera device (no alert values)
      const [result] = await db.query(
        'INSERT INTO devices (name, device_type_id, floorplan_id, path_topic, x_percent, y_percent) VALUES (?, ?, ?, ?, 0.5, 0.5)',
        [normalizedName, device_type_id, floorplan_id, path_topic || null]
      );

      res.status(201).json({ 
        message: 'Camera device created successfully',
        device_id: result.insertId
      });
    } else {
      // For other devices, validate alert values
      if (min_alert === null || min_alert === undefined || min_alert === '') {
        return res.status(400).json({ message: 'Min alert value is required for sensor devices' });
      }
      if (max_alert === null || max_alert === undefined || max_alert === '') {
        return res.status(400).json({ message: 'Max alert value is required for sensor devices' });
      }

      if (isNaN(Number(min_alert)) || isNaN(Number(max_alert))) {
        return res.status(400).json({ message: 'Alert values must be valid numbers' });
      }

      if (Number(min_alert) >= Number(max_alert)) {
        return res.status(400).json({ message: 'Min alert must be less than max alert' });
      }

      // Insert sensor device with alert values
      const [result] = await db.query(
        'INSERT INTO devices (name, device_type_id, floorplan_id, path_topic, min_alert, max_alert, x_percent, y_percent) VALUES (?, ?, ?, ?, ?, ?, 0.5, 0.5)',
        [normalizedName, device_type_id, floorplan_id, path_topic || null, min_alert, max_alert]
      );

      // Generate path topic for non-camera devices: deviceType.name/device.id
      const generatedPathTopic = `${deviceType[0].name}/${result.insertId}`;
      
      // Update the device with the generated path topic
      await db.query(
        'UPDATE devices SET path_topic = ? WHERE id = ?',
        [generatedPathTopic, result.insertId]
      );

      // Send topic to MQTT subscriber service
      try {
        const axios = require('axios');
        const response = await axios.post(
          `${process.env.PYTHON_SERVER_HOST}/add_topic`,
          new URLSearchParams({ topic: generatedPathTopic }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        );
        console.log("Topic sent to MQTT service:", response.data);
      } catch (mqttError) {
        console.error("Failed to send topic to MQTT service:", mqttError.message);
        // Don't fail the device creation if MQTT service is unavailable
      }

      res.status(201).json({ 
        message: 'Sensor device created successfully',
        device_id: result.insertId
      });
    }
  } catch (err) {
    console.error("Error creating new device:", err);
    
    // Handle specific database errors
    if (isDuplicateEntryError(err)) {
      return res.status(409).json({ message: DUPLICATE_DEVICE_NAME_MESSAGE });
    }
    
    res.status(500).json({ message: "Database error occurred while creating device" });
  }
}
exports.putDevicesLocation = async (req, res) => {
  const { id } = req.params;
  const { x_percent, y_percent } = req.body;
  try {
    await db.query(
      'UPDATE devices SET x_percent = ?, y_percent = ? WHERE id = ?',
      [x_percent, y_percent, id]
    );
    res.sendStatus(200);
  } catch (err) {
    console.error("Error updating device location:", err);
    res.status(500).send("Database update error");
  }
}

exports.saveEditDevice = async (req, res) => {
  const { id } = req.params;
  const { name, floorplan_id, path_topic, min_alert, max_alert } = req.body;
  const normalizedName = normalizeDeviceName(name);

  try {
    // Validate input
    if (!normalizedName || !floorplan_id) {
      return res.status(400).json({ message: 'Name and floorplan are required' });
    }

    if (normalizedName.length < 2 || normalizedName.length > 100) {
      return res.status(400).json({ message: 'Device name must be between 2 and 100 characters' });
    }

    // Get current device to check device type
    const [device] = await db.query('SELECT * FROM devices WHERE id = ?', [id]);
    if (device.length === 0) {
      return res.status(404).json({ message: 'Device not found' });
    }

    const [existingDevice] = await db.query(
      'SELECT id FROM devices WHERE name = ? AND id <> ? LIMIT 1',
      [normalizedName, id]
    );
    if (existingDevice.length > 0) {
      return res.status(409).json({ message: DUPLICATE_DEVICE_NAME_MESSAGE });
    }

    // Get device type to validate required fields
    const [deviceType] = await db.query('SELECT * FROM device_type WHERE id = ?', [device[0].device_type_id]);
    if (deviceType.length === 0) {
      return res.status(400).json({ message: 'Invalid device type' });
    }

    const isCamera = deviceType[0].name === 'Camera';

    // Validate based on device type
    if (isCamera) {
      // For cameras, only validate name, floorplan_id, and path_topic
      await db.query(
        'UPDATE devices SET name = ?, floorplan_id = ?, path_topic = ? WHERE id = ?',
        [normalizedName, floorplan_id, path_topic || null, id]
      );
    } else {
      // For other devices, validate alert values are numbers
      if (min_alert !== null && min_alert !== undefined && isNaN(Number(min_alert))) {
        return res.status(400).json({ message: 'Min alert must be a valid number' });
      }
      if (max_alert !== null && max_alert !== undefined && isNaN(Number(max_alert))) {
        return res.status(400).json({ message: 'Max alert must be a valid number' });
      }

      // Validate min_alert <= max_alert if both provided
      if (min_alert !== null && max_alert !== null && Number(min_alert) > Number(max_alert)) {
        return res.status(400).json({ message: 'Min alert cannot be greater than max alert' });
      }

      await db.query(
        'UPDATE devices SET name = ?, floorplan_id = ?, path_topic = ?, min_alert = ?, max_alert = ? WHERE id = ?',
        [normalizedName, floorplan_id, path_topic || null, min_alert, max_alert, id]
      );
    }

    res.status(200).json({ message: 'Device updated successfully' });
  } catch (err) {
    console.error("Error updating device:", err);
    if (isDuplicateEntryError(err)) {
      return res.status(409).json({ message: DUPLICATE_DEVICE_NAME_MESSAGE });
    }
    res.status(500).json({ message: "Database update error" });
  }
}

exports.toggleDeviceAlert = async (req, res) => {
  const { id } = req.params;
  const { alert } = req.body;
  
  try {
    // Validate input
    if (alert === null || alert === undefined) {
      return res.status(400).json({ message: 'Alert status is required' });
    }

    // Check if device exists
    const [device] = await db.query('SELECT * FROM devices WHERE id = ?', [id]);
    if (device.length === 0) {
      return res.status(404).json({ message: 'Device not found' });
    }

    // Update the device alert status
    await db.query(
      'UPDATE devices SET alert = ? WHERE id = ?',
      [alert ? 1 : 0, id]
    );
    
    res.status(200).json({ message: `Device alert ${alert ? 'activated' : 'deactivated'} successfully` });
  } catch (err) {
    console.error("Error toggling device alert:", err);
    res.status(500).json({ message: "Database update error" });
  }
}

exports.deleteDevice = async (req, res) => {
  const { id } = req.params;
  
  try {
    // Check if device exists
    const [device] = await db.query('SELECT * FROM devices WHERE id = ?', [id]);
    if (device.length === 0) {
      return res.status(404).json({ message: 'Device not found' });
    }

    // Delete the device
    await db.query('DELETE FROM devices WHERE id = ?', [id]);
    
    res.status(200).json({ message: 'Device deleted successfully' });
  } catch (err) {
    console.error("Error deleting device:", err);
    res.status(500).json({ message: "Database delete error" });
  }
}
