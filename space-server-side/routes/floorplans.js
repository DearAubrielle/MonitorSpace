const express = require('express');
const router = express.Router();
const floorplansController = require('./controllers/floorplansController');

// GET all floorplans
router.get('/getf', floorplansController.getAllFloorplans);

// POST create a new floorplan (image upload required)
router.post('/createf', floorplansController.createFloorplan);

// PUT edit existing floorplan
router.put('/edit/:id', floorplansController.editFloorplan);

// DELETE floorplan
router.delete('/delete/:id', floorplansController.deleteFloorplan);

// Handle 404 for undefined routes
router.all('*', (req, res) => {
  res.status(404).send(`No route for ${req.method} ${req.originalUrl}`);
});

module.exports = router;