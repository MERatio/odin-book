const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const ProviderSchema = new Schema(
	{
		user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
		provider: { type: String, enum: ['facebook'], required: true },
		providerId: { type: String, required: true },
	},
	{
		timestamps: true,
	}
);

module.exports = mongoose.model('Provider', ProviderSchema);
