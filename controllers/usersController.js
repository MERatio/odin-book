const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const { unauthenticated } = require('../lib/middlewares');
const User = require('../models/user');

exports.create = [
	unauthenticated,
	// Validate and sanitise fields.
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
			const user = await User.findOne({ email: value });
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
	// Process request after validation and sanitization.
	(req, res, next) => {
		// Extract the validation errors from a request.
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			// There are errors.
			res.json({
				user: req.body,
				errors: errors.array(),
			});
		} else {
			// Data form is valid.
			// Create the new user with hashed password
			bcrypt.hash(req.body.password, 10, (err, hashedPassword) => {
				if (err) {
					next(err);
				} else {
					const user = new User({
						firstName: req.body.firstName,
						lastName: req.body.lastName,
						email: req.body.email,
						password: hashedPassword,
					});
					user.save((err) => {
						if (err) {
							next(err);
						} else {
							// Successful
							res.json({ user });
						}
					});
				}
			});
		}
	},
];
