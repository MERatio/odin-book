const express = require('express');
const router = express.Router();

const friendshipsController = require('../controllers/friendshipsController');

router.post('/', friendshipsController.create);

router.put('/:friendshipId', friendshipsController.update);

router.delete('/:friendshipId', friendshipsController.destroy);

module.exports = router;
