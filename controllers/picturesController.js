const fsPromises = require('fs/promises');
const { upload } = require('../configs/multerConfig');
const authenticated = require('../middlewares/authenticated');
const validMongoObjectIdRouteParams = require('../middlewares/validMongoObjectIdRouteParams');
const Picture = require('../models/picture');

exports.update = [
	authenticated,
	validMongoObjectIdRouteParams,
	async (req, res, next) => {
		try {
			const picture = await Picture.findById(req.params.pictureId)
				.populate('of')
				.exec();
			if (picture === null) {
				const err = new Error(`Picture not found.`);
				err.status = 404;
				throw err;
			} else if (
				!(
					req.currentUser._id.equals(picture.of._id) ||
					req.currentUser._id.equals(picture.of.author && picture.of.author._id)
				)
			) {
				const err = new Error('Unauthorized');
				err.status = 401;
				throw err;
			} else {
				req.picture = picture;
				next();
			}
		} catch (err) {
			next(err);
		}
	},
	(req, res, next) => {
		upload.single('picture')(req, res, (err) => {
			if (err) {
				req.multerErr = err;
			}
			next();
		});
	},
	async (req, res, next) => {
		try {
			// If there's a multer error or the user didn't upload an picture.
			if (req.multerErr || !req.file) {
				let errors = [];
				if (req.file) {
					await fsPromises.unlink(`public/images/${req.file.filename}`);
				}
				if (req.multerErr) {
					errors = errors.concat({
						msg: req.multerErr.message,
						param: 'picture',
						location: 'body',
					});
				}
				if (!req.file) {
					errors = errors.concat({
						msg: 'Upload a picture.',
						param: 'picture',
						location: 'body',
					});
				}
				res.status(422).json({
					errors,
					picture: { filename: req.file ? req.file.filename : '' },
				});
			} else {
				// Data form is valid.
				// Update user's picture
				// Delete the old picture if there's any and if it's local.
				if (req.picture.isLocal && req.picture.filename !== '') {
					await fsPromises.unlink(`public/images/${req.picture.filename}`);
				}
				req.picture.filename = req.file.filename;
				req.picture.isLocal = true;
				const picture = await req.picture.save();
				// Successful
				res.status(200).json({ picture });
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
