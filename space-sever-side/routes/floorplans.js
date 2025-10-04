const express = require('express');
const router = express.Router();
const floorplansController = require('../controllers/floorplansController');

// GET all floorplans
router.get('/getf', floorplansController.getAllFloorplans);

// Handle 404 for undefined routes
router.all('*', (req, res) => {
  res.status(404).send(`No route for ${req.method} ${req.originalUrl}`);
});

module.exports = router;