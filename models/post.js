const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const PostSchema = new Schema(
	{
		author: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: true,
			autopopulate: true,
		},
		text: { type: String, required: true, maxlength: 1000 },
		picture: {
			type: Schema.Types.ObjectId,
			ref: 'Picture',
			required: true,
			autopopulate: true,
		},
	},
	{
		timestamps: true,
	}
);

PostSchema.plugin(require('mongoose-autopopulate'));

// Remove post's picture.
PostSchema.pre('remove', async function (next) {
	try {
		const picture = await mongoose.model('Picture').findById(this.picture);
		await picture.remove();
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
