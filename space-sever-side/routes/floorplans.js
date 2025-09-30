const express = require('express');
const router = express.Router();
const floorplansController = require('../controllers/floorplansController');

// GET all floorplans
router.get('/getf', floorplansController.getAllFloorplans);
// GET all devices in a floorplan
router.get('/getd', floorplansController.getAllDevices);
router.get('/getsensors', floorplansController.getAllSensorsInfo);
// PUT update device location
router.put('/putd/:id', floorplansController.putDeviceslocation);

// Handle 404 for undefined routes
router.all('*', (req, res) => {
  res.status(404).send(`No route for ${req.method} ${req.originalUrl}`);
});

module.exports = router;