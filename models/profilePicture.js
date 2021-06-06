const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const ProfilePictureSchema = new Schema(
	{
		user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
		filename: { type: String, default: '' },
		origin: { type: String, enum: ['local', 'facebook'], default: 'local' },
	},
	{
		timestamps: true,
	}
);

module.exports = mongoose.model('ProfilePicture', ProfilePictureSchema);
