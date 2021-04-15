const express = require('express');
const router = express.Router();

const postsController = require('../controllers/postsController');

router.post('/', postsController.create);

router.put('/:postId', postsController.update);

router.delete('/:postId', postsController.destroy);

module.exports = router;
