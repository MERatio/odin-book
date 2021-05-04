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

// Remove the reaction._id from user's and post's reactions.
ReactionSchema.pre('remove', async function (next) {
	try {
		const user = await mongoose
			.model('User')
			.findById(this.user._id || this.user);
		const post = await mongoose
			.model('Post')
			.findById(this.post._id || this.post);
		user.reactions.pull({ _id: this._id });
		await user.save();
		post.reactions.pull({ _id: this._id });
		await post.save();
	} catch (err) {
		next(err);
	}
});

module.exports = mongoose.model('Reaction', ReactionSchema);
