const express = require('express');
const router = express.Router({ mergeParams: true });

const reactionsController = require('../controllers/reactionsController');

router.get('/', reactionsController.index);

router.post('/', reactionsController.create);

router.delete('/:reactionId', reactionsController.destroy);

module.exports = router;
