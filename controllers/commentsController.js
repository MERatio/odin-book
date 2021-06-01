const { body, validationResult } = require('express-validator');
const authenticated = require('../middlewares/authenticated');
const validMongoObjectIdRouteParams = require('../middlewares/validMongoObjectIdRouteParams');
const getResourceFromParams = require('../middlewares/getResourceFromParams');
const getResourceFromParamsAndCurrentUserIsTheAuthor = require('../middlewares/getResourceFromParamsAndCurrentUserIsTheAuthor');

const Comment = require('../models/comment');

const commentSanitationAndValidation = [
	body('text')
		.trim()
		.isLength({ min: 1 })
		.withMessage('Text is required')
		.isLength({ max: 200 })
		.withMessage('Text is too long (maximum is 200 characters)')
		.escape(),
];

exports.create = [
	authenticated,
	validMongoObjectIdRouteParams,
	getResourceFromParams('Post'),
	...commentSanitationAndValidation,
	// Validate and sanitise fields.
	// Process request after validation and sanitization.
	(req, res, next) => {
		// Extract the validation errors from a request.
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			// There are errors.
			res.status(422).json({
				errors: errors.array(),
				comment: req.body,
			});
		} else {
			// Data is valid.
			const post = req.post;
			// Create a Comment object with escaped and trimmed data.
			const comment = new Comment({
				author: req.currentUser._id,
				post: post._id,
				text: req.body.text,
			});
			comment.save((err, comment) => {
				if (err) {
					next(err);
				} else {
					req.currentUser.comments.push(comment._id);
					req.currentUser.save((err) => {
						if (err) {
							comment.remove((err) => {
								if (err) {
									return next(err);
								}
							});
							next(err);
						} else {
							post.comments.push(comment._id);
							post.save((err) => {
								if (err) {
									comment.remove((err) => {
										if (err) {
											return next(err);
										}
									});
									next(err);
								} else {
									// Successful
									res.status(201).json({ comment });
								}
							});
						}
					});
				}
			});
		}
	},
];

exports.update = [
	authenticated,
	validMongoObjectIdRouteParams,
	getResourceFromParams('Post'),
	getResourceFromParamsAndCurrentUserIsTheAuthor('Comment'),
	// Validate and sanitise fields.
	...commentSanitationAndValidation,
	// Process request after validation and sanitization.
	async (req, res, next) => {
		// Extract the validation errors from a request.
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			// There are errors.
			res.status(422).json({
				errors: errors.array(),
				comment: req.body,
			});
		} else {
			// Data is valid.
			try {
				const comment = req.comment;
				// Successful
				// Update the record with escaped and trimmed data.
				comment.text = req.body.text;
				const updatedComment = await comment.save();
				res.json({ comment: updatedComment });
			} catch (err) {
				next(err);
			}
		}
	},
];

exports.destroy = [
	authenticated,
	validMongoObjectIdRouteParams,
	getResourceFromParams('Post'),
	getResourceFromParamsAndCurrentUserIsTheAuthor('Comment'),
	async (req, res, next) => {
		try {
			const comment = req.comment;
			// Successful
			// Remove comment.
			const removedComment = await comment.remove();
			res.json({ comment: removedComment });
		} catch (err) {
			next(err);
		}
	},
];
