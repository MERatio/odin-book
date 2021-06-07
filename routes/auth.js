const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/local', authController.local);

router.post('/facebook', authController.facebook);

module.exports = router;
