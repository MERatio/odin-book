const path = require('path');
const multer = require('multer');

const storage = multer.diskStorage({
	destination(req, file, cb) {
		cb(null, 'public/images');
	},
	filename(req, file, cb) {
		const uniquePrefix = Date.now() + '-' + Math.round(Math.random() * 1e9);
		cb(null, uniquePrefix + '-' + file.originalname);
	},
});

const upload = multer({
	storage,
	fileFilter(req, file, cb) {
		const ext = path.extname(file.originalname);
		const validExt = [
			'.apng',
			'.avif',
			'.gif',
			'.jpg',
			'.jpeg',
			'.jfif',
			'.pjpeg',
			'.pjp',
			'.png',
			'.svg',
			'.webp',
		];

		if (!validExt.includes(ext)) {
			cb(null, false);
			const err = new Error('Invalid file type, upload an image');
			err.status = 422;
			cb(err);
		} else {
			cb(null, true);
		}
	},
	limits: { fileSize: 3000000 },
});

module.exports = { upload };
