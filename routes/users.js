const express = require('express');
const router = express.Router();

const usersController = require('../controllers/usersController');

router.post('/', usersController.create);

router.get('/:userId', usersController.editInfo);

router.put('/:userId', usersController.updateInfo);

router.put('/:userId/profile-picture', usersController.updateProfilePicture);

module.exports = router;
