const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const ReactionSchema = new Schema(
	{
		user: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: true,
			index: true,
		},
		post: {
			type: Schema.Types.ObjectId,
			ref: 'Post',
			required: true,
			index: true,
		},
		type: { type: String, enum: ['like'], default: 'like', required: true },
	},
	{
		timestamps: true,
	}
);

module.exports = mongoose.model('Reaction', ReactionSchema);
