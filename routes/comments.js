const express = require('express');
const router = express.Router({ mergeParams: true });

const commentsController = require('../controllers/commentsController');

router.post('/', commentsController.create);

router.put('/:commentId', commentsController.update);

module.exports = router;
