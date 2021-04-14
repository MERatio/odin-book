const { body, validationResult } = require('express-validator');
const { authenticated } = require('../lib/middlewares');
const Post = require('../models/post');

exports.create = [
	authenticated,
	// Validate and sanitise fields.
	body('text')
		.trim()
		.isLength({ min: 1 })
		.withMessage('Text is required')
		.isLength({ max: 1000 })
		.withMessage('Text is too long (maximum is 1000 characters)')
		.escape(),
	// Process request after validation and sanitization.
	(req, res, next) => {
		// Extract the validation errors from a request.
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			// There are errors.
			res.status(422).json({
				post: req.body,
				errors: errors.array(),
			});
		} else {
			// Data is valid.
			// Create an Post object with escaped and trimmed data.
			const post = new Post({
				author: req.currentUser._id,
				text: req.body.text,
			});
			post.save((err, post) => {
				if (err) {
					next(err);
				} else {
					// Successful
					req.currentUser.posts.push(post._id);
					req.currentUser.save((err) => {
						if (err) {
							post.remove((err) => {
								if (err) {
									return next(err);
								}
							});
							return next(err);
						} else {
							res.status(201).json({ post });
						}
					});
				}
			});
		}
	},
];
