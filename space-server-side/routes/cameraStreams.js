const express = require('express');
const cameraStreamController = require('./controllers/cameraStreamController');

const router = express.Router();

// The short-lived, camera-only token in the URL authorizes an <img> request.
router.get('/:id', cameraStreamController.streamCamera);

module.exports = router;
