const express = require('express');
const router = express.Router();

const usersController = require('../controllers/usersController');

router.get('/', usersController.index);

router.post('/', usersController.create);

router.get('/:userId', usersController.edit);

router.put('/:userId', usersController.updateInfo);

router.put('/:userId/profile-picture', usersController.updateProfilePicture);

module.exports = router;
