const fsPromises = require('fs/promises');
const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const PictureSchema = new Schema(
	{
		of: {
			type: Schema.Types.ObjectId,
			required: true,
			// Instead of a hardcoded model name in `ref`, `refPath` means Mongoose
			// will look at the `ofModel` property to find the right model.
			refPath: 'ofModel',
		},
		ofModel: {
			type: String,
			required: true,
			enum: ['User', 'Post'],
		},
		filename: { type: String, default: '' },
		// App only allow picture form upload for now.
		// I'm using link in Facebook auth and will be using it in populateDb.js.
		isLocal: { type: Boolean, required: true, default: true },
	},
	{
		timestamps: true,
	}
);

// Remove actual picture.
PictureSchema.pre('remove', async function (next) {
	try {
		if (this.isLocal && this.filename !== '') {
			await fsPromises.unlink(`public/images/${this.filename}`);
		}
	} catch (err) {
		next(err);
	}
});

module.exports = mongoose.model('Picture', PictureSchema);
