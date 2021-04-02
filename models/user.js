const mongoose = require('mongoose');
const omit = require('just-omit');

const Schema = mongoose.Schema;

const UserSchema = new Schema(
	{
		firstName: { type: String, required: true, maxlength: 255 },
		lastName: { type: String, required: true, maxlength: 255 },
		email: { type: String, required: true, index: true, unique: true },
		password: { type: String, required: true },
	},
	{
		timestamps: true,
	}
);

UserSchema.set('toJSON', {
	transform(doc, ret) {
		return omit(ret, ['password']);
	},
});

module.exports = mongoose.model('User', UserSchema);
