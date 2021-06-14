const express = require('express');
const router = express.Router();

const picturesController = require('../controllers/picturesController');

router.put('/:pictureId', picturesController.update);

module.exports = router;
