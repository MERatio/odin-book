const fs = require('fs/promises');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const { upload } = require('../configs/multerConfig');
const { unauthenticated } = require('../lib/middlewares');
const User = require('../models/user');

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
	// Process request after validation and sanitization.
	async (req, res, next) => {
		// Extract the validation errors from a request.
		const errors = validationResult(req);
		try {
			// There is multerErr or express-validator errors.
			if (req.multerErr || !errors.isEmpty()) {
				// If there's an uploaded image delete it.
				if (req.file) {
					await fs.unlink(`public/images/${req.file.filename}`);
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
					profilePicture: req.file ? req.file.filename : '',
				});
				const savedUser = await user.save();
				// Successful
				res.status(201).json({ user: savedUser });
			}
		} catch (err) {
			// If there's an uploaded image delete it.
			if (req.file) {
				(async () => {
					await fs.unlink(`public/images/${req.file.filename}`);
				})();
			}
			next(err);
		}
	},
];
