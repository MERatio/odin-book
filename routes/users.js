const express = require('express');
const router = express.Router();

const usersController = require('../controllers/usersController');
const friendshipsController = require('../controllers/friendshipsController');
const postsController = require('../controllers/postsController');

router.get('/', usersController.index);

router.post('/', usersController.create);

router.get('/current-user', usersController.getCurrentUser);

router.get('/:userId', usersController.show);

router.get('/:userId/friend-requests', friendshipsController.friendRequests);

router.get('/:userId/friends', usersController.friends);

router.get('/:userId/posts', postsController.usersPostsIndex);

router.get('/:userId/edit', usersController.edit);

router.put('/:userId', usersController.updateInfo);

module.exports = router;
