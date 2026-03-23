const express = require('express');
const router = express.Router();
const devicesController = require('./controllers/devicesController');

// GET all devices in a floorplan
router.get('/getd', devicesController.getAllDevices);
// PUT update device floorplan
router.put('/putdf/:id', devicesController.putDevicesTofloorplan);
// GET all device types
router.get('/gettypes', devicesController.getAllDeviceTypes);
// POST create a new device
router.post('/postd', devicesController.createDevice);
// PUT update device location
router.put('/putdlo/:id', devicesController.putDevicesLocation);
// PUT update device details
router.put('/edit/:id', devicesController.saveEditDevice);
// PUT toggle device alert
router.put('/alert/:id', devicesController.toggleDeviceAlert);
// DELETE device
router.delete('/delete/:id', devicesController.deleteDevice);
module.exports = router;