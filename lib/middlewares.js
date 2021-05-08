const mongoose = require('mongoose');
const passport = require('passport');

const ObjectId = mongoose.Types.ObjectId;

exports.setCurrentUser = (req, res, next) => {
	passport.authenticate('jwt', { session: false }, (err, currentUser) => {
		if (err) {
			next(err);
		} else {
			req.logIn(currentUser, { session: false }, (err) => {
				if (err) {
					next(err);
				} else {
					next();
				}
			});
		}
	})(req, res, next);
};

exports.authenticated = (req, res, next) => {
	if (!req.currentUser) {
		const err = new Error('You may not proceed without being signed in');
		err.status = 401;
		next(err);
	} else {
		next();
	}
};

exports.unauthenticated = (req, res, next) => {
	if (req.currentUser) {
		const err = new Error("You're already signed in");
		err.status = 403;
		next(err);
	} else {
		next();
	}
};

exports.validMongoObjectIdRouteParams = (req, res, next) => {
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
};

exports.getResourceFromParams = (modelName) => {
	return async function (req, res, next) {
		const lowerCasedModelName = modelName.toLowerCase();
		try {
			const resource = await mongoose
				.model(modelName)
				.findById(req.params[`${lowerCasedModelName}Id`]);
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
};

exports.getResourceFromParamsAndCurrentUserIsTheAuthor = (modelName) => {
	return async function (req, res, next) {
		const lowerCasedModelName = modelName.toLowerCase();
		try {
			const resource = await mongoose
				.model(modelName)
				.findById(req.params[`${lowerCasedModelName}Id`]);
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
};
