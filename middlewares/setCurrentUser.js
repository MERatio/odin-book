const passport = require('passport');

function setCurrentUser(req, res, next) {
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
}

module.exports = setCurrentUser;
