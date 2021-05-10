const { body, validationResult } = require('express-validator');
const {
	authenticated,
	validMongoObjectIdRouteParams,
	getResourceFromParams,
} = require('../lib/middlewares');
const Reaction = require('../models/reaction');

exports.create = [
	authenticated,
	validMongoObjectIdRouteParams,
	getResourceFromParams('Post'),
	// Validate field.
	body('type')
		.default('like')
		.isIn(['like'])
		.withMessage('Invalid reaction type.'),
	// Process request after validation.
	(req, res, next) => {
		// Extract the validation errors from a request.
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			// There are errors.
			res.status(422).json({
				errors: errors.array(),
				reaction: req.body,
			});
		} else {
			// Data form is valid.
			// If there is duplicate reaction.
			const post = req.post;
			Reaction.exists(
				{
					user: req.currentUser._id,
					post: post._id,
					reaction: req.body.reaction,
				},
				(err, reactionExists) => {
					if (err) {
						next(err);
					} else if (reactionExists) {
						const err = new Error(
							'You already have the same reaction to this post.'
						);
						err.status = 422;
						next(err);
					} else {
						// Create the new reaction
						Reaction.create(
							{
								user: req.currentUser._id,
								post: post._id,
								type: req.body.type,
							},
							(err, reaction) => {
								if (err) {
									next(err);
								} else {
									req.currentUser.reactions.push(reaction._id);
									req.currentUser.save((err) => {
										if (err) {
											reaction.remove((err) => {
												if (err) {
													return next(err);
												}
											});
											next(err);
										} else {
											post.reactions.push(reaction._id);
											post.save((err) => {
												if (err) {
													reaction.remove((err) => {
														if (err) {
															return next(err);
														}
													});
													next(err);
												} else {
													// Success
													res.status(201).json({ reaction });
												}
											});
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

exports.destroy = [
	authenticated,
	validMongoObjectIdRouteParams,
	getResourceFromParams('Reaction'),
	async (req, res, next) => {
		try {
			const reaction = req.reaction;
			if (!reaction.user.equals(req.currentUser._id)) {
				// If currentUser is not the reaction's user.
				const err = new Error('Not a valid reaction.');
				err.status = 401;
				throw err;
			} else {
				// Successful
				// Remove reaction.
				const removedReaction = await reaction.remove();
				res.json({ reaction: removedReaction });
			}
		} catch (err) {
			next(err);
		}
	},
];
