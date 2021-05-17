const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const CommentSchema = new Schema(
	{
		author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
		post: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
		text: { type: String, required: true, maxlength: 200 },
	},
	{
		timestamps: true,
	}
);

// Remove the comment._id from author's comments and post's comments.
CommentSchema.pre('remove', async function (next) {
	try {
		const author = await mongoose
			.model('User')
			.findById(this.author._id || this.author);
		const post = await mongoose
			.model('Post')
			.findById(this.post._id || this.post)
			.exec();
		author.comments.pull({ _id: this._id });
		await author.save();
		post.comments.pull({ _id: this._id });
		await post.save();
	} catch (err) {
		next(err);
	}
});

module.exports = mongoose.model('Comment', CommentSchema);
