const express = require('express');
const router = express.Router({ mergeParams: true });

const friendsController = require('../controllers/friendsController');

router.get('/', friendsController.index);

router.get('/:friendId', friendsController.show);

module.exports = router;
