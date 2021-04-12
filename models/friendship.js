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
		status: { type: String, enum: ['pending', 'friends'], default: 'pending' },
	},
	{
		timestamps: true,
	}
);

module.exports = mongoose.model('Friendship', FriendshipSchema);
