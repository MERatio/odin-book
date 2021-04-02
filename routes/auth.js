const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/local', authController.local);

module.exports = router;
