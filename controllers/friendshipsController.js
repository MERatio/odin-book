const { body, validationResult } = require('express-validator');
const {
	authenticated,
	validMongoObjectIdRouteParams,
} = require('../lib/middlewares');
const Friendship = require('../models/friendship');

exports.create = [
	authenticated,
	// Validate field.
	body('requesteeId')
		.isMongoId()
		.withMessage('requesteeId is not a valid Mongo ID')
		// Check if requestor already sent a friend request to the requestee.
		.custom(async (value, { req }) => {
			const friendship = await req.currentUser.findRelationshipWith(value);
			if (friendship) {
				switch (friendship.status) {
					case 'pending':
						throw new Error('You already sent a friend request to them.');
					case 'friends':
						throw new Error("You're already friends with them.");
				}
			} else {
				return true;
			}
		})
		// Cannot send a friend request to themselves
		.custom((value, { req }) => {
			// ._id have a type of object
			if (req.currentUser._id.equals(value)) {
				throw new Error('Cannot send a friend request to yourself.');
			} else {
				return true;
			}
		}),
	// Process request after validation.
	async (req, res, next) => {
		// Extract the validation errors from a request.
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			// There are errors.
			res.status(422).json({
				friendship: req.body,
				errors: errors.array(),
			});
		} else {
			// Data form is valid.
			// Create the new friendship
			try {
				const friendship = await req.currentUser.sendFriendRequest(
					req.body.requesteeId
				);
				// Successful
				res.status(201).json({ friendship });
			} catch (err) {
				next(err);
			}
		}
	},
];

exports.update = [
	authenticated,
	validMongoObjectIdRouteParams,
	async (req, res, next) => {
		try {
			const friendship = await Friendship.findById(req.params.friendshipId);
			if (friendship === null) {
				const error = new Error('Friend request does not exists.');
				error.status = 404;
				throw error;
			} else if (!friendship.requestee.equals(req.currentUser._id)) {
				// Check if requestee is not the currentUser
				const error = new Error('Not a valid friend request.');
				error.status = 403;
				throw error;
			} else {
				// Successful
				// Accept friend request.
				friendship.status = 'friends';
				const updatedFriendship = await friendship.save();
				res.status(201).json({ friendship: updatedFriendship });
			}
		} catch (err) {
			next(err);
		}
	},
];
