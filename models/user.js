const mongoose = require('mongoose');
const omit = require('just-omit');

const Schema = mongoose.Schema;

const UserSchema = new Schema(
	{
		firstName: { type: String, required: true, maxlength: 255 },
		lastName: { type: String, required: true, maxlength: 255 },
		email: { type: String, required: true, index: true, unique: true },
		profilePicture: { type: String, default: '' },
		password: { type: String, required: true },
		friendships: [{ type: Schema.Types.ObjectId, ref: 'Friendship' }],
		posts: [{ type: Schema.Types.ObjectId, ref: 'Post' }],
		reactions: [{ type: Schema.Types.ObjectId, ref: 'Reaction' }],
		comments: [{ type: Schema.Types.ObjectId, ref: 'Comment' }],
	},
	{
		timestamps: true,
	}
);

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

UserSchema.methods.getFriends = async function () {
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
	return mongoose.model('User').find({}).where('_id').in(friendsIds);
};

UserSchema.set('toJSON', {
	transform(doc, ret) {
		return omit(ret, ['password']);
	},
});

module.exports = mongoose.model('User', UserSchema);
