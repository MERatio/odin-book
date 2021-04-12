const passport = require('passport');

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
