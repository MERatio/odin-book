const fsPromises = require('fs/promises');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const { upload } = require('../configs/multerConfig');
const createJwt = require('../lib/createJwt');
const authenticated = require('../middlewares/authenticated');
const unauthenticated = require('../middlewares/unauthenticated');
const validMongoObjectIdRouteParams = require('../middlewares/validMongoObjectIdRouteParams');
const getResourceFromParams = require('../middlewares/getResourceFromParams');
const User = require('../models/user');
const ProfilePicture = require('../models/profilePicture');
const Friendship = require('../models/friendship');

const userValidationAndSanitation = [
	body('firstName')
		.trim()
		.isLength({ min: 1 })
		.withMessage('Enter your first name.')
		.isLength({ max: 255 })
		.withMessage('First name is too long (maximum is 255 characters).')
		.escape(),
	body('lastName')
		.trim()
		.isLength({ min: 1 })
		.withMessage('Enter your last name.')
		.isLength({ max: 255 })
		.withMessage('Last name is too long (maximum is 255 characters).')
		.escape(),
	body('email')
		.trim()
		.isEmail()
		.withMessage('Email is invalid.')
		.normalizeEmail()
		.custom(async (value) => {
			const user = await User.findOne({ email: value }).exec();
			if (user) {
				throw new Error('Email is already taken. Pick another');
			} else {
				return true;
			}
		}),
	body('password')
		.isLength({ min: 8 })
		.withMessage('Password is too short (minimum is 8 characters).'),
	body('passwordConfirmation').custom((value, { req }) => {
		if (value !== req.body.password) {
			throw new Error('Password confirmation does not match password.');
		} else {
			return true;
		}
	}),
];

exports.index = [
	authenticated,
	async (req, res, next) => {
		try {
			const requesteesIds = await Friendship.find({
				requestor: req.currentUser._id,
			})
				.distinct('requestee')
				.exec();
			const requestorsIds = await Friendship.find({
				requestee: req.currentUser._id,
			})
				.distinct('requestor')
				.exec();
			const userIds = [req.currentUser._id, ...requesteesIds, ...requestorsIds];
			// Subset of users with no friendship with currentUser (users per page).
			const users = await User.find()
				.where('_id')
				.nin(userIds)
				.skip(req.skip)
				.limit(req.query.limit)
				.populate('profilePicture')
				.exec();
			// Total count of users with no friendship with currentUser.
			const usersCount = await User.countDocuments({
				_id: { $nin: userIds },
			}).exec();
			res.json({
				users,
				usersCount,
			});
		} catch (err) {
			next(err);
		}
	},
];

exports.create = [
	unauthenticated,
	(req, res, next) => {
		upload.single('profilePicture')(req, res, (err) => {
			if (err) {
				req.multerErr = err;
			}
			next();
		});
	},
	// Validate and sanitise fields.
	...userValidationAndSanitation,
	// Process request after validation and sanitization.
	async (req, res, next) => {
		// Extract the validation errors from a request.
		const errors = validationResult(req);
		try {
			// There is multerErr or express-validator errors.
			if (req.multerErr || !errors.isEmpty()) {
				// If there's an uploaded image delete it.
				if (req.file) {
					await fsPromises.unlink(`public/images/${req.file.filename}`);
				}
				const multerErrInArray = req.multerErr
					? [{ msg: req.multerErr.message }]
					: [];
				res.status(422).json({
					errors: multerErrInArray.concat(errors.array()),
					user: req.body,
				});
			} else {
				// Data form is valid.
				// Create the new user with hashed password
				const hashedPassword = await bcrypt.hash(req.body.password, 10);
				const user = new User({
					firstName: req.body.firstName,
					lastName: req.body.lastName,
					email: req.body.email,
					password: hashedPassword,
				});
				const profilePicture = new ProfilePicture({
					filename: req.file ? req.file.filename : '',
					origin: 'local',
				});
				user.profilePicture = profilePicture._id;
				profilePicture.user = user._id;
				await user.save();
				await profilePicture.save();
				const jwt = createJwt(user);
				// Successful
				res.status(201).json({ user, jwt });
			}
		} catch (err) {
			// If there's an uploaded image delete it.
			if (req.file) {
				(async () => {
					await fsPromises.unlink(`public/images/${req.file.filename}`);
				})();
			}
			next(err);
		}
	},
];

exports.getCurrentUser = async (req, res, next) => {
	const currentUser = req.currentUser
		? await req.currentUser
				.populate('profilePicture')
				.populate({
					path: 'friendships',
					populate: { path: 'requestor requestee' },
					options: {
						sort: { createdAt: -1 },
					},
				})
				.populate({
					path: 'posts',
					options: {
						sort: { createdAt: -1 },
					},
				})
				.populate({
					path: 'reactions',
					populate: { path: 'post' },
					options: {
						sort: { createdAt: -1 },
					},
				})
				.populate({
					path: 'comments',
					populate: { path: 'post' },
					options: {
						sort: { createdAt: -1 },
					},
				})
				.execPopulate()
		: false;
	res.json({ currentUser });
};

// Get user's profile information except password.
exports.show = [
	authenticated,
	validMongoObjectIdRouteParams,
	async (req, res, next) => {
		try {
			const user = await User.findById(req.params.userId)
				.populate('profilePicture')
				.populate({
					path: 'friendships',
					populate: { path: 'requestor requestee' },
					options: {
						sort: { createdAt: -1 },
					},
				})
				.populate({
					path: 'posts',
					options: {
						sort: { createdAt: -1 },
					},
				})
				.populate({
					path: 'reactions',
					populate: { path: 'post' },
					options: {
						sort: { createdAt: -1 },
					},
				})
				.populate({
					path: 'comments',
					populate: { path: 'post' },
					options: {
						sort: { createdAt: -1 },
					},
				})
				.exec();
			if (user === null) {
				const err = new Error('User not found.');
				err.status = 404;
				next(err);
			} else {
				res.json({ user });
			}
		} catch (err) {
			next(err);
		}
	},
];

// Get all currentUser's properties except password.
exports.edit = [
	authenticated,
	validMongoObjectIdRouteParams,
	getResourceFromParams('User'),
	async (req, res, next) => {
		try {
			const user = req.user;
			if (!req.currentUser._id.equals(user._id)) {
				const err = new Error('Unauthorized');
				err.status = 401;
				next(err);
			} else {
				next();
			}
		} catch (err) {
			next(err);
		}
	},
	async (req, res, next) => {
		// Successful
		res.json({ user: req.user });
	},
];

// Update user's firstName, lastName, email and password.
exports.updateInfo = [
	authenticated,
	validMongoObjectIdRouteParams,
	getResourceFromParams('User'),
	async (req, res, next) => {
		try {
			const user = req.user;
			if (!req.currentUser._id.equals(user._id)) {
				const err = new Error('Unauthorized');
				err.status = 401;
				next(err);
			} else {
				next();
			}
		} catch (err) {
			next(err);
		}
	},
	// Validate and sanitise fields.
	[
		...userValidationAndSanitation,
		body('password').custom(async (value, { req }) => {
			const res = await bcrypt.compare(value, req.currentUser.password);
			if (res) {
				throw new Error(
					'Password should not be the same as the current password'
				);
			} else {
				return true;
			}
		}),
		body('oldPassword').custom(async (value, { req }) => {
			const res = await bcrypt.compare(value, req.currentUser.password);
			if (res) {
				return true;
			} else {
				throw new Error('Old password is incorrect.');
			}
		}),
	],
	// Process request after validation and sanitization.
	async (req, res, next) => {
		// Extract the validation errors from a request.
		const errors = validationResult(req);
		try {
			// There are errors.
			if (!errors.isEmpty()) {
				res.status(422).json({
					errors: errors.array(),
					user: req.body,
				});
			} else {
				// Data form is valid.
				// Update the user info with hashed password
				const hashedPassword = await bcrypt.hash(req.body.password, 10);
				const user = req.currentUser;
				user.firstName = req.body.firstName;
				user.lastName = req.body.email;
				user.password = hashedPassword;
				const updatedUser = await user.save();
				// Successful
				res.json({ user: updatedUser });
			}
		} catch (err) {
			next(err);
		}
	},
];
