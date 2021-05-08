const { body, validationResult } = require('express-validator');
const {
	authenticated,
	validMongoObjectIdRouteParams,
	resourceFoundAndCurrentUserIsTheAuthor,
} = require('../lib/middlewares');
// const Friendship = require('../models/friendship');
const Post = require('../models/post');

const postValidationAndSanitation = [
	body('text')
		.trim()
		.isLength({ min: 1 })
		.withMessage('Text is required')
		.isLength({ max: 1000 })
		.withMessage('Text is too long (maximum is 1000 characters)')
		.escape(),
];

exports.index = [
	authenticated,
	async (req, res, next) => {
		try {
			const friends = await req.currentUser.getFriends();
			const friendsIds = friends.map((friend) => friend._id);
			const posts = await Post.find({})
				.where('author')
				.in([req.currentUser._id, ...friendsIds])
				.sort({ createdAt: -1 })
				.populate('author reactions')
				.populate({
					path: 'comments',
					populate: { path: 'author' },
					options: {
						limit: 3,
						sort: { createdAt: -1 },
					},
				})
				.exec();
			res.json({ posts });
		} catch (err) {
			next(err);
		}
	},
];

exports.create = [
	authenticated,
	...postValidationAndSanitation,
	// Validate and sanitise fields.
	// Process request after validation and sanitization.
	(req, res, next) => {
		// Extract the validation errors from a request.
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			// There are errors.
			res.status(422).json({
				errors: errors.array(),
				post: req.body,
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
							next(err);
						} else {
							res.status(201).json({ post });
						}
					});
				}
			});
		}
	},
];

exports.show = [
	validMongoObjectIdRouteParams,
	async (req, res, next) => {
		try {
			const post = await Post.findById(req.params.postId)
				.populate('author reactions')
				.populate({
					path: 'comments',
					populate: { path: 'author' },
					options: {
						sort: { createdAt: -1 },
					},
				});
			if (post === null) {
				const err = new Error('Page not found');
				err.status = 404;
				next(err);
			} else {
				res.json({ post });
			}
		} catch (err) {
			next(err);
		}
	},
];

exports.update = [
	authenticated,
	validMongoObjectIdRouteParams,
	resourceFoundAndCurrentUserIsTheAuthor('Post'),
	// Validate and sanitise fields.
	...postValidationAndSanitation,
	// Process request after validation and sanitization.
	async (req, res, next) => {
		// Extract the validation errors from a request.
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			// There are errors.
			res.status(422).json({
				errors: errors.array(),
				post: req.body,
			});
		} else {
			// Data is valid.
			try {
				const post = await Post.findById(req.params.postId);
				// Successful
				// Update the record with escaped and trimmed data.
				post.text = req.body.text;
				const updatedPost = await post.save();
				res.status(200).json({ post: updatedPost });
			} catch (err) {
				next(err);
			}
		}
	},
];

exports.destroy = [
	authenticated,
	validMongoObjectIdRouteParams,
	async (req, res, next) => {
		try {
			const post = await Post.findById(req.params.postId);
			if (post === null) {
				const err = new Error('Post not found.');
				err.status = 404;
				throw err;
			} else if (!post.author.equals(req.currentUser._id)) {
				// If author is not the currentUser.
				const err = new Error("You don't own that post.");
				err.status = 403;
				throw err;
			} else {
				// Successful
				// Remove post.
				const removedPost = await post.remove();
				res.json({ post: removedPost });
			}
		} catch (err) {
			next(err);
		}
	},
];
