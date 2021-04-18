const express = require('express');
const router = express.Router({ mergeParams: true });

const reactionsController = require('../controllers/reactionsController');

router.post('/', reactionsController.create);

module.exports = router;
