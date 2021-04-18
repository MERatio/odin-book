const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const PostSchema = new Schema(
	{
		author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
		text: { type: String, required: true, maxlength: 1000 },
		reactions: [{ type: Schema.Types.ObjectId, ref: 'Reaction' }],
	},
	{
		timestamps: true,
	}
);

PostSchema.pre('remove', async function (next) {
	try {
		// Remove the post._id from author.posts
		const author = await mongoose
			.model('User')
			.findById(this.author._id || this.author);
		author.posts.pull({ _id: this._id });
		await author.save();
	} catch (err) {
		next(err);
	}
});

PostSchema.pre('remove', async function (next) {
	try {
		// Remove all post's reactions.
		const reactions = await mongoose.model('Reaction').find({ post: this._id });
		for (let reaction of reactions) {
			await reaction.remove();
		}
	} catch (err) {
		next(err);
	}
});

module.exports = mongoose.model('Post', PostSchema);
