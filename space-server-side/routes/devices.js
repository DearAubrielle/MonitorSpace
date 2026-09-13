const express = require('express');
const router = express.Router();
const devicesController = require('./controllers/devicesController');
const { verifyAccessToken, requireRoles } = require('../middleware/authMiddleware');

router.use(verifyAccessToken);

// GET all devices in a floorplan
router.get('/getd', devicesController.getAllDevices);
// PUT update device floorplan
router.put('/putdf/:id', requireRoles('manager', 'admin'), devicesController.putDevicesTofloorplan);
// GET all device types
router.get('/gettypes', devicesController.getAllDeviceTypes);
// POST create a new device
router.post('/postd', requireRoles('manager', 'admin'), devicesController.createDevice);
// PUT update device location
router.put('/putdlo/:id', requireRoles('manager', 'admin'), devicesController.putDevicesLocation);
// PUT update device details
router.put('/edit/:id', requireRoles('manager', 'admin'), devicesController.saveEditDevice);
// PUT toggle device alert
router.put('/alert/:id', requireRoles('manager', 'admin'), devicesController.toggleDeviceAlert);
// DELETE device
router.delete('/delete/:id', requireRoles('manager', 'admin'), devicesController.deleteDevice);
module.exports = router;
