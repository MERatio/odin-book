const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/local', authController.local);

router.get('/facebook', authController.facebookOauth);

router.get('/facebook/callback', authController.facebookCallback);

module.exports = router;
