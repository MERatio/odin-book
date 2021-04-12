const express = require('express');
const router = express.Router();

const friendshipsController = require('../controllers/friendshipsController');

router.post('/', friendshipsController.create);

module.exports = router;
