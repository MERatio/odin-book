const mongoose = require('mongoose');
const omit = require('just-omit');

const Schema = mongoose.Schema;

const UserSchema = new Schema(
	{
		provider: { type: String, enum: ['local', 'facebook'], default: 'local' },
		firstName: { type: String, required: true, maxlength: 255 },
		lastName: { type: String, required: true, maxlength: 255 },
		email: { type: String, required: true, index: true, unique: true },
		password: { type: String, required: true },
		picture: {
			type: Schema.Types.ObjectId,
			ref: 'Picture',
			required: true,
			// The below option tells this plugin to always call `populate()` on
			// `picture`.
			autopopulate: true,
		},
	},
	{
		timestamps: true,
	}
);

UserSchema.plugin(require('mongoose-autopopulate'));

// UserSchema.methods methods still works even if cb parameter is supplied or not (except getFriends()).
UserSchema.methods.sendFriendRequest = function (requesteeId, cb) {
	return mongoose.model('Friendship').create(
		{
			requestor: this._id,
			requestee: requesteeId,
			status: 'pending',
		},
		cb
	);
};

UserSchema.methods.findRelationshipWith = function (otherUserId, cb) {
	return mongoose.model('Friendship').findOne(
		{
			$or: [
				{ requestor: this._id, requestee: otherUserId },
				{ requestor: otherUserId, requestee: this._id },
			],
		},
		cb
	);
};

UserSchema.methods.getFriendsIds = async function () {
	let friendsIds = [];
	const requesteesIds = await mongoose
		.model('Friendship')
		.find({
			requestor: this._id,
			status: 'friends',
		})
		.distinct('requestee')
		.exec();
	const requestorsIds = await mongoose
		.model('Friendship')
		.find({
			requestee: this._id,
			status: 'friends',
		})
		.distinct('requestor')
		.exec();
	friendsIds = [...requesteesIds, ...requestorsIds];
	return friendsIds;
};

UserSchema.set('toJSON', {
	transform(doc, ret) {
		return omit(ret, ['password']);
	},
});

module.exports = mongoose.model('User', UserSchema);
