const express = require('express');
const router = express.Router();
const devicesController = require('../controllers/devicesController');

// GET all devices in a floorplan
router.get('/getd', devicesController.getAllDevices);
// PUT update device location
router.put('/putd/:id', devicesController.putDeviceslocation);
// GET all device types
router.get('/gettypes', devicesController.getAllDeviceTypes);
// POST create a new device
router.post('/postd', devicesController.createDevice);

module.exports = router;