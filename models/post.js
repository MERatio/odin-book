const fsPromises = require('fs/promises');
const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const PostSchema = new Schema(
	{
		author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
		text: { type: String, required: true, maxlength: 1000 },
		image: { type: String, default: '' },
		reactions: [{ type: Schema.Types.ObjectId, ref: 'Reaction' }],
		comments: [{ type: Schema.Types.ObjectId, ref: 'Comment' }],
	},
	{
		timestamps: true,
	}
);

// Remove post's image.
PostSchema.pre('remove', async function (next) {
	try {
		if (this.image !== '') {
			await fsPromises.unlink(`public/images/${this.image}`);
		}
	} catch (err) {
		next(err);
	}
});

// Remove the post._id from author.posts
PostSchema.pre('remove', async function (next) {
	try {
		const author = await mongoose
			.model('User')
			.findById(this.author._id || this.author)
			.exec();
		author.posts.pull({ _id: this._id });
		await author.save();
	} catch (err) {
		next(err);
	}
});

// Remove all post's reactions.
PostSchema.pre('remove', async function (next) {
	try {
		const reactions = await mongoose
			.model('Reaction')
			.find({ post: this._id })
			.exec();
		for (let reaction of reactions) {
			await reaction.remove();
		}
	} catch (err) {
		next(err);
	}
});

// Remove all post's comments.
PostSchema.pre('remove', async function (next) {
	try {
		const comments = await mongoose
			.model('Comment')
			.find({ post: this._id })
			.exec();
		for (let comment of comments) {
			await comment.remove();
		}
	} catch (err) {
		next(err);
	}
});

module.exports = mongoose.model('Post', PostSchema);
