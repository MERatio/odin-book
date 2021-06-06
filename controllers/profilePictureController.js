const fsPromises = require('fs/promises');
const { upload } = require('../configs/multerConfig');
const authenticated = require('../middlewares/authenticated');
const validMongoObjectIdRouteParams = require('../middlewares/validMongoObjectIdRouteParams');
const ProfilePicture = require('../models/profilePicture');

exports.update = [
	authenticated,
	validMongoObjectIdRouteParams,
	async (req, res, next) => {
		try {
			const profilePicture = await ProfilePicture.findById(
				req.params.profilePictureId
			).exec();
			if (profilePicture === null) {
				const err = new Error(`profile picture not found.`);
				err.status = 404;
				throw err;
			} else if (!req.currentUser._id.equals(profilePicture.user)) {
				const err = new Error('Unauthorized');
				err.status = 401;
				throw err;
			} else {
				req.profilePicture = profilePicture;
				next();
			}
		} catch (err) {
			next(err);
		}
	},
	(req, res, next) => {
		upload.single('profilePicture')(req, res, (err) => {
			if (err) {
				req.multerErr = err;
			}
			next();
		});
	},
	async (req, res, next) => {
		try {
			// If there's a multer error or the user didn't upload an image.
			if (req.multerErr || !req.file) {
				let errors = [];
				if (req.file) {
					await fsPromises.unlink(`public/images/${req.file.filename}`);
				}
				if (req.multerErr) {
					errors = errors.concat({
						msg: req.multerErr.message,
					});
				}
				if (!req.file) {
					errors = errors.concat({
						msg: 'Upload a profile picture.',
					});
				}
				res.status(422).json({
					errors,
					profilePicture: { filename: req.file ? req.file.filename : '' },
				});
			} else {
				// Data form is valid.
				// Update user's profile picture
				// Delete the old profilePicture if it came from form and if there's any.
				if (
					req.profilePicture.origin === 'local' &&
					req.profilePicture.filename !== ''
				) {
					await fsPromises.unlink(
						`public/images/${req.profilePicture.filename}`
					);
				}
				req.profilePicture.filename = req.file.filename;
				const updatedProfilePicture = await req.profilePicture.save();
				// Successful
				res.status(200).json({ profilePicture: updatedProfilePicture });
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
