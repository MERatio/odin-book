const { body, validationResult } = require('express-validator');
const {
	authenticated,
	validMongoObjectIdRouteParams,
	resourceFound,
} = require('../lib/middlewares');
const Post = require('../models/post');
const Reaction = require('../models/reaction');

exports.create = [
	authenticated,
	validMongoObjectIdRouteParams,
	resourceFound('Post'),
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
			Post.findById(req.params.postId).exec((err, post) => {
				if (err) {
					next(err);
				} else {
					// If there is duplicate reaction.
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
			});
		}
	},
];

exports.destroy = [
	authenticated,
	validMongoObjectIdRouteParams,
	async (req, res, next) => {
		try {
			const reaction = await Reaction.findById(req.params.reactionId);
			if (reaction === null) {
				const err = new Error('Reaction not found.');
				err.status = 404;
				throw err;
			} else if (!reaction.user.equals(req.currentUser._id)) {
				// If currentUser is reaction's user.
				const err = new Error('Not a valid reaction.');
				err.status = 403;
				throw err;
			} else {
				// Successful
				// Remove reaction.
				const removedReaction = await reaction.remove();
				res.status(200).json({ reaction: removedReaction });
			}
		} catch (err) {
			next(err);
		}
	},
];
