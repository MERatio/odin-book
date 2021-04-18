const { body, validationResult } = require('express-validator');
const {
	authenticated,
	validMongoObjectIdRouteParams,
} = require('../lib/middlewares');
const User = require('../models/user');
const Friendship = require('../models/friendship');

exports.create = [
	authenticated,
	// Validate field.
	body('requesteeId')
		.isMongoId()
		.withMessage('requesteeId is not a valid Mongo ID'),
	// Process request after validation.
	(req, res, next) => {
		// Extract the validation errors from a request.
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			// There are errors.
			res.status(422).json({
				friendship: req.body,
				errors: errors.array(),
			});
		} else if (req.currentUser._id.equals(req.body.requesteeId)) {
			const err = new Error('Cannot send a friend request to yourself.');
			err.status = 422;
			next(err);
		} else {
			req.currentUser.findRelationshipWith(
				req.body.requesteeId,
				(err, friendship) => {
					if (err) {
						next(err);
					} else if (friendship) {
						let err;
						switch (friendship.status) {
							case 'pending':
								err = new Error('You already sent a friend request to them.');
								break;
							case 'friends':
								err = new Error("You're already friends with them.");
								break;
						}
						err.status = 422;
						next(err);
					} else {
						// Create the new friendship
						req.currentUser.sendFriendRequest(
							req.body.requesteeId,
							(err, friendship) => {
								if (err) {
									next(err);
								} else {
									req.currentUser.friendships.push(friendship._id);
									req.currentUser.save((err) => {
										if (err) {
											friendship.remove((err) => {
												if (err) {
													return next(err);
												}
											});
											return next(err);
										} else {
											User.findById(req.body.requesteeId).exec(
												(err, requestee) => {
													if (err) {
														friendship.remove((err) => {
															if (err) {
																return next(err);
															}
														});
														next(err);
													} else {
														requestee.friendships.push(friendship._id);
														requestee.save((err) => {
															if (err) {
																friendship.remove((err) => {
																	if (err) {
																		return next(err);
																	}
																});
																return next(err);
															} else {
																// Successful
																res.status(201).json({ friendship });
															}
														});
													}
												}
											);
										}
									});
								}
							}
						);
					}
				}
			);
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
				const err = new Error('Friend request not found');
				err.status = 404;
				throw err;
			} else if (!friendship.requestee.equals(req.currentUser._id)) {
				// Check if requestee is not the currentUser
				const err = new Error('Not a valid friend request.');
				err.status = 403;
				throw err;
			} else if (friendship.status !== 'pending') {
				const err = new Error('Friend request is already accepted.');
				err.status = 400;
				throw err;
			} else {
				// Successful
				// Accept friend request.
				friendship.status = 'friends';
				const updatedFriendship = await friendship.save();
				res.status(200).json({ friendship: updatedFriendship });
			}
		} catch (err) {
			next(err);
		}
	},
];

exports.destroy = [
	authenticated,
	validMongoObjectIdRouteParams,
	async (req, res, next) => {
		try {
			const friendship = await Friendship.findById(req.params.friendshipId);
			if (friendship === null) {
				const err = new Error('Friend request not found.');
				err.status = 404;
				throw err;
			} else if (
				!(
					friendship.requestor.equals(req.currentUser._id) ||
					friendship.requestee.equals(req.currentUser._id)
				)
			) {
				// Check if currentUser is not the requestor or the requestee.
				const err = new Error('Not a valid friend request.');
				err.status = 403;
				throw err;
			} else {
				// Successful
				// Remove friendship.
				const removedFriendship = await friendship.remove();
				res.status(200).json({ friendship: removedFriendship });
			}
		} catch (err) {
			next(err);
		}
	},
];
