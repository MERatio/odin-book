const mongoose = require('mongoose');

function getResourceFromParamsAndCurrentUserIsTheAuthor(modelName) {
	return async function (req, res, next) {
		const lowerCasedModelName = modelName.toLowerCase();
		try {
			const resource = await mongoose
				.model(modelName)
				.findById(req.params[`${lowerCasedModelName}Id`])
				.exec();
			if (resource === null) {
				const err = new Error(`${lowerCasedModelName} not found.`);
				err.status = 404;
				next(err);
			} else if (!resource.author.equals(req.currentUser._id)) {
				const err = new Error(`You don't own that ${lowerCasedModelName}.`);
				err.status = 401;
				throw err;
			} else {
				req[lowerCasedModelName] = resource;
				next();
			}
		} catch (err) {
			next(err);
		}
	};
}

module.exports = getResourceFromParamsAndCurrentUserIsTheAuthor;
