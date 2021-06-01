const mongoose = require('mongoose');

function getResourceFromParams(modelName) {
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
			} else {
				req[lowerCasedModelName] = resource;
				next();
			}
		} catch (err) {
			next(err);
		}
	};
}

module.exports = getResourceFromParams;
