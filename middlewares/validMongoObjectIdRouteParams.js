const mongoose = require('mongoose');

const ObjectId = mongoose.Types.ObjectId;

function validMongoObjectIdRouteParams(req, res, next) {
	for (const paramName in req.params) {
		if (Object.prototype.hasOwnProperty.call(req.params, paramName)) {
			if (!ObjectId.isValid(req.params[paramName])) {
				const err = new Error('Page not found');
				err.status = 404;
				return next(err);
			}
		}
	}
	next();
}

module.exports = validMongoObjectIdRouteParams;
