const fsPromises = require('fs/promises');
const { body, validationResult } = require('express-validator');
const { upload } = require('../configs/multerConfig');
const authenticated = require('../middlewares/authenticated');
const validMongoObjectIdRouteParams = require('../middlewares/validMongoObjectIdRouteParams');
const getResourceFromParamsAndCurrentUserIsTheAuthor = require('../middlewares/getResourceFromParamsAndCurrentUserIsTheAuthor');
const Post = require('../models/post');
const Picture = require('../models/picture');
const User = require('../models/user');

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
			const friendsIds = await req.currentUser.getFriendsIds();
			const userIds = [req.currentUser._id, ...friendsIds];
			// currentUser and friends posts per page.
			const posts = await Post.find({})
				.where('author')
				.in(userIds)
				.skip(req.skip)
				.limit(req.query.limit)
				.sort({ updatedAt: -1 })
				.exec();
			const totalPosts = await Post.countDocuments({
				author: { $in: userIds },
			}).exec();
			res.json({ posts, totalPosts });
		} catch (err) {
			next(err);
		}
	},
];

exports.create = [
	authenticated,
	(req, res, next) => {
		upload.single('picture')(req, res, (err) => {
			if (err) {
				req.multerErr = err;
			}
			next();
		});
	},
	// Validate and sanitise fields.
	...postValidationAndSanitation,
	// Process request after validation and sanitization.
	async (req, res, next) => {
		// Extract the validation errors from a request.
		const errors = validationResult(req);
		try {
			// There is multerErr or express-validator errors.
			if (req.multerErr || !errors.isEmpty()) {
				// If there's an uploaded picture delete it.
				if (req.file) {
					await fsPromises.unlink(`public/images/${req.file.filename}`);
				}
				const multerErrInArray = req.multerErr
					? [{ msg: req.multerErr.message, param: 'picture', location: 'body' }]
					: [];
				res.status(422).json({
					errors: multerErrInArray.concat(errors.array()),
					post: req.body,
				});
			} else {
				// Data is valid.
				const picture = new Picture({
					ofModel: 'Post',
					filename: req.file ? req.file.filename : '',
					isLocal: true,
				});
				// Create an Post object with escaped and trimmed data.
				const post = new Post({
					author: req.currentUser._id,
					text: req.body.text,
				});
				picture.of = post._id;
				post.picture = picture._id;
				await picture.save();
				await post.save();
				res.status(201).json({ post });
			}
		} catch (err) {
			// If there's an uploaded picture delete it.
			if (req.file) {
				(async () => {
					await fsPromises.unlink(`public/images/${req.file.filename}`);
				})();
			}
			next(err);
		}
	},
];

exports.show = [
	authenticated,
	validMongoObjectIdRouteParams,
	async (req, res, next) => {
		try {
			const post = await Post.findById(req.params.postId).exec();
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
	getResourceFromParamsAndCurrentUserIsTheAuthor('Post'),
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
				const post = req.post;
				// Successful
				// Update the record with escaped and trimmed data.
				post.text = req.body.text;
				const updatedPost = await post.save();
				res.json({ post: updatedPost });
			} catch (err) {
				next(err);
			}
		}
	},
];

exports.destroy = [
	authenticated,
	validMongoObjectIdRouteParams,
	getResourceFromParamsAndCurrentUserIsTheAuthor('Post'),
	async (req, res, next) => {
		try {
			const post = req.post;
			// Successful
			// Remove post.
			const removedPost = await post.remove();
			res.json({ post: removedPost });
		} catch (err) {
			next(err);
		}
	},
];

exports.usersPostsIndex = [
	authenticated,
	// Check if user exists.
	async (req, res, next) => {
		try {
			const userExists = await User.exists({ _id: req.params.userId });
			if (!userExists) {
				const err = new Error('User not found.');
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
			const posts = await Post.find({ author: req.params.userId })
				.skip(req.skip)
				.limit(req.query.limit)
				.sort({ updatedAt: -1 })
				.exec();
			const totalPosts = await Post.countDocuments({
				author: req.params.userId,
			}).exec();
			res.json({ posts, totalPosts });
		} catch (err) {
			next(err);
		}
	},
];
