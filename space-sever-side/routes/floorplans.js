const express = require('express');
const router = express.Router();
const floorplanController = require('../controllers/floorplansController');

// GET all floorplans
router.get('/', floorplanController.getAllFloorplans);
router.get('/getsensors', floorplanController.getAllSensorsInfo);

module.exports = router;