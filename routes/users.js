const express = require('express');
const router = express.Router();

const usersController = require('../controllers/usersController');

router.post('/', usersController.create);

router.put('/:userId', usersController.updateInfo);

module.exports = router;
