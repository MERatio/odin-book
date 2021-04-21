const { body, validationResult } = require('express-validator');
const {
	authenticated,
	validMongoObjectIdRouteParams,
} = require('../lib/middlewares');
const Post = require('../models/post');
const Comment = require('../models/comment');

exports.create = [
	authenticated,
	validMongoObjectIdRouteParams,
	// Validate and sanitise fields.
	body('text')
		.trim()
		.isLength({ min: 1 })
		.withMessage('Text is required')
		.isLength({ max: 200 })
		.withMessage('Text is too long (maximum is 200 characters)')
		.escape(),
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
			Post.findById(req.params.postId).exec((err, post) => {
				if (err) {
					next(err);
				} else if (post === null) {
					const err = new Error('Post not found.');
					err.status = 404;
					next(err);
				} else {
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
			});
		}
	},
];

exports.update = [
	authenticated,
	validMongoObjectIdRouteParams,
	// Validate and sanitise fields.
	body('text')
		.trim()
		.isLength({ min: 1 })
		.withMessage('Text is required')
		.isLength({ max: 200 })
		.withMessage('Text is too long (maximum is 200 characters)')
		.escape(),
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
				const post = await Post.findById(req.params.postId);
				if (post === null) {
					const err = new Error('Post not found');
					err.status = 404;
					throw err;
				}
				const comment = await Comment.findById(req.params.commentId);
				if (comment === null) {
					const err = new Error('Comment not found');
					err.status = 404;
					throw err;
				}
				if (!comment.author.equals(req.currentUser._id)) {
					// Check if author is not the currentUser
					const err = new Error("You don't own that comment.");
					err.status = 403;
					throw err;
				} else {
					// Successful
					// Update the record with escaped and trimmed data.
					comment.text = req.body.text;
					const updatedComment = await comment.save();
					res.status(200).json({ comment: updatedComment });
				}
			} catch (err) {
				next(err);
			}
		}
	},
];
