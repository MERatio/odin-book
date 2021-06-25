const { body, validationResult } = require('express-validator');
const authenticated = require('../middlewares/authenticated');
const validMongoObjectIdRouteParams = require('../middlewares/validMongoObjectIdRouteParams');
const getResourceFromParams = require('../middlewares/getResourceFromParams');
const Reaction = require('../models/reaction');
const Post = require('../models/post');

exports.index = [
	authenticated,
	validMongoObjectIdRouteParams,
	// Check if post exists.
	async (req, res, next) => {
		try {
			const postExists = await Post.exists({ _id: req.params.postId });
			if (!postExists) {
				const err = new Error('Post not found');
				err.status = 404;
				next(err);
			} else {
				next();
			}
		} catch (err) {
			next(err);
		}
	},
	async (req, res, next) => {
		try {
			const reactions = await Reaction.find({
				post: req.params.postId,
			})
				.skip(req.skip)
				.limit(req.query.limit)
				.sort({ updatedAt: -1 })
				.populate('user')
				.exec();
			const totalReactions = await Reaction.countDocuments({
				post: req.params.postId,
			}).exec();
			res.json({ reactions, totalReactions });
		} catch (err) {
			next(err);
		}
	},
];

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
	async (req, res, next) => {
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
			try {
				const reactionExists = await Reaction.exists({
					user: req.currentUser._id,
					post: post._id,
					reaction: req.body.reaction,
				});
				if (reactionExists) {
					const err = new Error(
						'You already have the same reaction to this post.'
					);
					err.status = 422;
					next(err);
				} else {
					// Create the new reaction
					const reaction = await Reaction.create({
						user: req.currentUser._id,
						post: post._id,
						type: req.body.type,
					});
					res.status(201).json({ reaction });
				}
			} catch (err) {
				next(err);
			}
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
