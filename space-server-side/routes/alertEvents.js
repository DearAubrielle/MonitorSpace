const express = require('express');
const { verifyAccessToken } = require('../middleware/authMiddleware');
const alertEventsController = require('./controllers/alertEventsController');

const router = express.Router();

router.use(verifyAccessToken);
router.get('/', alertEventsController.getAlertEvents);

module.exports = router;
