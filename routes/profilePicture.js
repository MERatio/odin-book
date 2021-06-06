const express = require('express');
const router = express.Router();

const profilePictureController = require('../controllers/profilePictureController');

router.put('/:profilePictureId', profilePictureController.update);

module.exports = router;
