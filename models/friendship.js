const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const FriendshipSchema = new Schema(
	{
		requestor: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: true,
			index: true,
		},
		requestee: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: true,
			index: true,
		},
		status: {
			type: String,
			enum: ['pending', 'friends'],
			default: 'pending',
			required: true,
		},
	},
	{
		timestamps: true,
	}
);

// Remove the friendship._id from requestor's and requestee's friendships.
FriendshipSchema.pre('remove', async function (next) {
	try {
		const requestor = await mongoose
			.model('User')
			.findById(this.requestor._id || this.requestor)
			.exec();
		const requestee = await mongoose
			.model('User')
			.findById(this.requestee._id || this.requestee)
			.exec();
		requestor.friendships.pull({ _id: this._id });
		await requestor.save();
		requestee.friendships.pull({ _id: this._id });
		await requestee.save();
	} catch (err) {
		next(err);
	}
});

module.exports = mongoose.model('Friendship', FriendshipSchema);
